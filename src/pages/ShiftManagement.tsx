import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, Clock, ShieldCheck, AlertCircle, ArrowUpRight, 
  ArrowDownLeft, CheckCircle2, Lock, Unlock, Printer, 
  Calculator, Banknote, Sparkles, TrendingUp, Receipt, 
  FileText, Plus, Minus, Search, Filter, RefreshCw,
  UserCheck, AlertTriangle, Calendar, Layers, ShieldAlert,
  ArrowRightLeft, Eye, Check, X
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { 
  dbInvoices, dbExpenses, dbPartyPayments, dbCashierShifts, 
  dbAppUsers, dbUserActivities 
} from '../lib/db';
import { 
  CashierShift, Invoice, Expense, PartyPayment, 
  CashierShiftDenominations, AppUserRecord 
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { 
  calculateShiftFinancials, printShiftZReport, 
  sumDenominations, ShiftFinancialSummary 
} from '../lib/shiftManager';
import { generateFullDatabaseSnapshot, pushBackupToServer } from '../lib/backupManager';
import { CashierShiftModal } from '../components/inventory/CashierShiftModal';

export const ShiftManagement: React.FC = () => {
  const { activeUser, activeRole } = useAuth();
  const currentCashierName = activeUser?.name || 'Counter Cashier';
  const currentCashierId = activeUser?.id || 'cashier-1';

  // Data States
  const [shifts, setShifts] = useState<CashierShift[]>([]);
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [partyPayments, setPartyPayments] = useState<PartyPayment[]>([]);
  const [users, setUsers] = useState<AppUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Tab: 'DASHBOARD' | 'TRANSACTIONS' | 'DENOMINATIONS' | 'HISTORY'
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'TRANSACTIONS' | 'DENOMINATIONS' | 'HISTORY'>('DASHBOARD');

  // Modals
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isSafeDropOpen, setIsSafeDropOpen] = useState(false);
  const [selectedHistoricalShift, setSelectedHistoricalShift] = useState<CashierShift | null>(null);

  // Quick Expense Form
  const [quickExpenseAmount, setQuickExpenseAmount] = useState<string>('');
  const [quickExpenseDesc, setQuickExpenseDesc] = useState<string>('');
  const [quickExpenseCat, setQuickExpenseCat] = useState<string>('Tea & Refreshment');

  // Safe Drop Form
  const [safeDropAmount, setSafeDropAmount] = useState<string>('');
  const [safeDropNotes, setSafeDropNotes] = useState<string>('');
  const [safeDropReceiver, setSafeDropReceiver] = useState<string>('Owner Safe');

  // Denomination Counter in Tab
  const [liveDenoms, setLiveDenoms] = useState<CashierShiftDenominations>({
    n5000: 0,
    n1000: 0,
    n500: 0,
    n100: 0,
    n50: 0,
    n20: 0,
    n10: 0,
    coins: 0
  });

  // History Filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    loadAllData();

    const handleDataChange = () => {
      loadAllData();
    };

    window.addEventListener('mbi-local-db-change', handleDataChange);
    return () => window.removeEventListener('mbi-local-db-change', handleDataChange);
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [allShifts, allInvoices, allExpenses, allPayments, allUsers] = await Promise.all([
        dbCashierShifts.getAll(),
        dbInvoices.getAll(),
        dbExpenses.getAll(),
        dbPartyPayments.getAll(),
        dbAppUsers.getAll()
      ]);

      setShifts(allShifts || []);
      // Find open shift
      const openShift = (allShifts || []).find(s => s.status === 'OPEN') || null;
      setActiveShift(openShift);

      setInvoices(allInvoices || []);
      setExpenses(allExpenses || []);
      setPartyPayments(allPayments || []);
      setUsers(allUsers || []);

      if (openShift?.denominations) {
        setLiveDenoms(openShift.denominations);
      }
    } catch (err) {
      console.error('Failed to load shift management data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Financial Calculations for Active Shift
  const currentShiftSummary = useMemo(() => {
    if (!activeShift) return null;
    return calculateShiftFinancials(activeShift, invoices, expenses, partyPayments);
  }, [activeShift, invoices, expenses, partyPayments]);

  const liveDenomTotal = useMemo(() => sumDenominations(liveDenoms), [liveDenoms]);

  // Open Shift Handler
  const handleOpenShift = async (
    openingCash: number, 
    notes?: string, 
    shiftType: 'Morning' | 'Evening' | 'Night' | 'General' = 'Morning'
  ) => {
    try {
      const newShiftNumber = `SHF-${String((shifts.length || 0) + 1).padStart(4, '0')}`;
      const newShift: CashierShift = {
        id: uuidv4(),
        shiftNumber: newShiftNumber,
        cashierId: currentCashierId,
        cashierName: currentCashierName,
        shiftType,
        startTime: new Date().toISOString(),
        openingCash: openingCash || 0,
        expectedCash: openingCash || 0,
        cashSales: 0,
        cardSales: 0,
        bankSales: 0,
        creditSales: 0,
        totalSales: 0,
        invoicesCount: 0,
        cashIn: 0,
        cashOut: 0,
        expensesTotal: 0,
        cashDropsTotal: 0,
        status: 'OPEN',
        notes: notes || 'Counter Shift Started',
        createdAt: new Date().toISOString()
      };

      await dbCashierShifts.save(newShift);
      setActiveShift(newShift);
      setShifts(prev => [newShift, ...prev]);

      // Audit Log
      await dbUserActivities.save({
        id: `act-${Date.now()}`,
        userId: currentCashierId,
        userName: currentCashierName,
        userRole: activeRole,
        action: 'Started Cashier Shift',
        module: 'Sale',
        details: `Opened Shift #${newShiftNumber} with initial drawer float Rs. ${openingCash}`,
        timestamp: new Date().toISOString()
      });

      showToast(`Shift #${newShiftNumber} started with Rs. ${openingCash.toLocaleString()} float`);
      setIsShiftModalOpen(false);
    } catch (err) {
      console.error('Error starting shift:', err);
      showToast('Failed to start shift');
    }
  };

  // Close Shift Handler
  const handleCloseShift = async (
    actualCash: number, 
    diffReason?: string, 
    notes?: string, 
    denominations?: CashierShiftDenominations,
    supervisorName?: string
  ) => {
    if (!activeShift || !currentShiftSummary) return;

    try {
      const endTime = new Date().toISOString();
      const variance = actualCash - currentShiftSummary.expectedCash;

      const updatedShift: CashierShift = {
        ...activeShift,
        endTime,
        expectedCash: currentShiftSummary.expectedCash,
        actualCash,
        cashDifference: variance,
        cashSales: currentShiftSummary.cashSales,
        cardSales: currentShiftSummary.cardSales,
        bankSales: currentShiftSummary.bankSales,
        creditSales: currentShiftSummary.creditSales,
        totalSales: currentShiftSummary.totalSales,
        invoicesCount: currentShiftSummary.invoicesCount,
        cashIn: currentShiftSummary.cashIn,
        cashOut: currentShiftSummary.cashOut,
        expensesTotal: currentShiftSummary.expensesTotal,
        cashDropsTotal: currentShiftSummary.cashDropsTotal,
        denominations: denominations || liveDenoms,
        status: 'CLOSED',
        differenceReason: diffReason || '',
        notes: notes ? `${activeShift.notes || ''} | ${notes}` : activeShift.notes,
        supervisorName: supervisorName || '',
        reconciledBy: currentCashierName,
        reconciledAt: endTime,
        updatedAt: endTime
      };

      await dbCashierShifts.save(updatedShift);
      setActiveShift(null);
      setShifts(prev => prev.map(s => s.id === updatedShift.id ? updatedShift : s));

      // Audit Log
      await dbUserActivities.save({
        id: `act-${Date.now()}`,
        userId: currentCashierId,
        userName: currentCashierName,
        userRole: activeRole,
        action: 'Closed Cashier Shift',
        module: 'Sale',
        details: `Closed Shift #${activeShift.shiftNumber}. Expected: Rs. ${currentShiftSummary.expectedCash}, Counted: Rs. ${actualCash}, Discrepancy: Rs. ${variance}`,
        timestamp: new Date().toISOString()
      });

      // Automated End-of-Shift / Day-Close Cloud Backup to VPS Server
      try {
        const autoBackupActive = localStorage.getItem('mbi_auto_backup_enabled') !== 'false';
        if (autoBackupActive) {
          generateFullDatabaseSnapshot({
            name: currentCashierName,
            role: activeRole || 'Cashier'
          }).then(async (snap) => {
            const pushResult = await pushBackupToServer(snap);
            console.log('[Shift Close Backup] Automated backup pushed:', pushResult);
          }).catch(err => {
            console.warn('[Shift Close Backup] Non-blocking backup error:', err);
          });
        }
      } catch (backupErr) {
        console.warn('Shift close auto-backup trigger error:', backupErr);
      }

      showToast(`Shift #${activeShift.shiftNumber} closed and reconciled successfully! Auto-backup triggered.`);
      setIsShiftModalOpen(false);
    } catch (err) {
      console.error('Error closing shift:', err);
      showToast('Failed to close shift');
    }
  };

  // Record Quick Petty Cash Expense from Drawer
  const handleAddQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(quickExpenseAmount);
    if (!amt || amt <= 0) return;

    try {
      const newExp: Expense = {
        id: uuidv4(),
        expenseNumber: `EXP-${Date.now().toString().slice(-4)}`,
        category: quickExpenseCat,
        amount: amt,
        paidAmount: amt,
        paymentType: 'Cash',
        date: new Date().toISOString().slice(0, 10),
        description: `[Shift Expense - ${activeShift?.shiftNumber || 'Current'}] ${quickExpenseDesc || quickExpenseCat}`,
        userId: currentCashierId,
        createdAt: new Date().toISOString()
      };

      await dbExpenses.save(newExp);
      setExpenses(prev => [newExp, ...prev]);

      setQuickExpenseAmount('');
      setQuickExpenseDesc('');
      setIsQuickExpenseOpen(false);
      showToast(`Recorded Rs. ${amt.toLocaleString()} petty cash payout`);
    } catch (err) {
      console.error('Failed to add shift expense:', err);
    }
  };

  // Record Safe Cash Drop / Transfer to Owner
  const handleAddSafeDrop = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(safeDropAmount);
    if (!amt || amt <= 0 || !activeShift) return;

    try {
      const currentDrops = activeShift.cashDropsTotal || 0;
      const updatedShift: CashierShift = {
        ...activeShift,
        cashDropsTotal: currentDrops + amt,
        notes: `${activeShift.notes || ''} [Drop Rs. ${amt} to ${safeDropReceiver} at ${new Date().toLocaleTimeString()}]`,
        updatedAt: new Date().toISOString()
      };

      await dbCashierShifts.save(updatedShift);
      setActiveShift(updatedShift);
      setShifts(prev => prev.map(s => s.id === updatedShift.id ? updatedShift : s));

      // Record Activity
      await dbUserActivities.save({
        id: `act-${Date.now()}`,
        userId: currentCashierId,
        userName: currentCashierName,
        userRole: activeRole,
        action: 'Cash Drawer Drop',
        module: 'Cash & Bank',
        details: `Transferred Rs. ${amt} from Shift #${activeShift.shiftNumber} drawer to ${safeDropReceiver}`,
        timestamp: new Date().toISOString()
      });

      setSafeDropAmount('');
      setSafeDropNotes('');
      setIsSafeDropOpen(false);
      showToast(`Transferred Rs. ${amt.toLocaleString()} to safe successfully!`);
    } catch (err) {
      console.error('Failed to record safe drop:', err);
    }
  };

  // Filtered History
  const filteredShifts = useMemo(() => {
    return shifts.filter(s => {
      const matchSearch = 
        s.shiftNumber.toLowerCase().includes(historySearch.toLowerCase()) ||
        s.cashierName.toLowerCase().includes(historySearch.toLowerCase()) ||
        (s.notes && s.notes.toLowerCase().includes(historySearch.toLowerCase()));

      const matchStatus = historyStatusFilter === 'ALL' || s.status === historyStatusFilter;

      return matchSearch && matchStatus;
    });
  }, [shifts, historySearch, historyStatusFilter]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-slate-800 animate-fadeIn">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-slideUp">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header & Live Shift Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Cashier Shift & Cash Drawer Reconciliation
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Track counter float, daily cash receipts, petty expenses, safe drops, and end-of-shift audits.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {activeShift ? (
            <>
              <button
                type="button"
                onClick={() => setIsQuickExpenseOpen(true)}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Minus className="w-3.5 h-3.5" /> Quick Cash Expense
              </button>
              <button
                type="button"
                onClick={() => setIsSafeDropOpen(true)}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" /> Cash Safe Drop
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeShift && currentShiftSummary) {
                    const business = JSON.parse(localStorage.getItem('mock_business') || '{}');
                    printShiftZReport(currentShiftSummary, activeShift, business);
                  }
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" /> Print Z-Report
              </button>
              <button
                type="button"
                onClick={() => setIsShiftModalOpen(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-sm"
              >
                <Lock className="w-4 h-4" /> End & Reconcile Shift
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsShiftModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 transition shadow-sm"
            >
              <Unlock className="w-4 h-4" /> Start New Cashier Shift
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Indicator Card */}
      {activeShift && currentShiftSummary ? (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md border border-slate-800">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-700/80 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-emerald-400">ACTIVE SHIFT</span>
                  <span className="px-2 py-0.5 bg-slate-700 rounded text-xs font-mono font-bold text-slate-200">
                    #{activeShift.shiftNumber}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs font-semibold">
                    {activeShift.shiftType || 'General'} Shift
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Cashier: <strong className="text-white">{activeShift.cashierName}</strong> • Started:{' '}
                  {formatDate(activeShift.startTime)}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                Calculated Drawer Cash Balance
              </span>
              <span className="text-2xl font-black text-amber-300 tracking-tight">
                {formatCurrency(currentShiftSummary.expectedCash)}
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Opening Float</span>
              <span className="text-sm font-black text-white">{formatCurrency(currentShiftSummary.openingCash)}</span>
            </div>
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-emerald-400 font-semibold uppercase block">
                Cash Sales ({currentShiftSummary.shiftInvoices.filter(i => (i.paymentType || i.paymentMethod) === 'Cash').length})
              </span>
              <span className="text-sm font-black text-emerald-300">+{formatCurrency(currentShiftSummary.cashSales)}</span>
            </div>
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-sky-400 font-semibold uppercase block">Digital / Card</span>
              <span className="text-sm font-black text-sky-300">{formatCurrency(currentShiftSummary.cardSales + currentShiftSummary.bankSales)}</span>
            </div>
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-emerald-400 font-semibold uppercase block">Customer In</span>
              <span className="text-sm font-black text-emerald-300">+{formatCurrency(currentShiftSummary.cashIn)}</span>
            </div>
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-rose-400 font-semibold uppercase block">Cash Expenses</span>
              <span className="text-sm font-black text-rose-300">-{formatCurrency(currentShiftSummary.expensesTotal)}</span>
            </div>
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-amber-400 font-semibold uppercase block">Safe Drops</span>
              <span className="text-sm font-black text-amber-300">-{formatCurrency(currentShiftSummary.cashDropsTotal)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-900">No Cashier Shift is Currently Open</h3>
              <p className="text-xs text-amber-700">
                To begin sales and audit daily cash transactions, open a new cashier shift with your initial drawer float.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsShiftModalOpen(true)}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition"
          >
            <Unlock className="w-4 h-4" /> Open New Counter Shift
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('DASHBOARD')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'DASHBOARD'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> Shift Summary & Controls
        </button>

        <button
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'TRANSACTIONS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" /> Live Shift Receipts ({currentShiftSummary?.shiftInvoices.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('DENOMINATIONS')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'DENOMINATIONS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4" /> Physical Note Counter
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'HISTORY'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" /> Shift Audit History ({shifts.length})
        </button>
      </div>

      {/* Tab 1: DASHBOARD & RECONCILIATION SUMMARY */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Drawer Cash Formula Card */}
            <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-blue-600" />
                  Live Cash Drawer Flow Audit
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Real-time Calculated</span>
              </div>

              {currentShiftSummary ? (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">(+) Initial Cash Float at Opening:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(currentShiftSummary.openingCash)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">
                      (+) Cash Sales Collected ({currentShiftSummary.shiftInvoices.filter(i => (i.paymentType || i.paymentMethod) === 'Cash').length} bills):
                    </span>
                    <span className="font-bold text-emerald-600">+{formatCurrency(currentShiftSummary.cashSales)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">(+) Customer Cash Recoveries (Payment In):</span>
                    <span className="font-bold text-emerald-600">+{formatCurrency(currentShiftSummary.cashIn)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">(-) Cash Refunds / Sales Returns:</span>
                    <span className="font-bold text-rose-600">-{formatCurrency(currentShiftSummary.cashOut)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">(-) Petty Cash Expenses Paid from Drawer:</span>
                    <span className="font-bold text-rose-600">-{formatCurrency(currentShiftSummary.expensesTotal)}</span>
                  </div>
                  {currentShiftSummary.cashDropsTotal > 0 && (
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                      <span className="text-slate-600 font-medium">(-) Cash Drops Transferred to Main Safe:</span>
                      <span className="font-bold text-amber-600">-{formatCurrency(currentShiftSummary.cashDropsTotal)}</span>
                    </div>
                  )}

                  <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center text-sm font-black mt-3">
                    <span className="text-amber-300">NET EXPECTED CASH IN DRAWER:</span>
                    <span className="text-lg text-amber-300">{formatCurrency(currentShiftSummary.expectedCash)}</span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No active shift open. Start a shift to monitor real-time drawer flow.
                </div>
              )}
            </div>

            {/* Quick Action Side Panel */}
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Quick Shift Operations
                </h4>

                <button
                  type="button"
                  disabled={!activeShift}
                  onClick={() => setIsQuickExpenseOpen(true)}
                  className="w-full p-3 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 text-amber-900 rounded-xl border border-amber-200 text-left transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Minus className="w-4 h-4 text-amber-600" />
                    <div>
                      <div className="font-bold text-xs">Pay Petty Cash Expense</div>
                      <div className="text-[10px] text-amber-700">Tea, cleaner, courier spot payment</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-amber-600" />
                </button>

                <button
                  type="button"
                  disabled={!activeShift}
                  onClick={() => setIsSafeDropOpen(true)}
                  className="w-full p-3 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-900 rounded-xl border border-indigo-200 text-left transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                    <div>
                      <div className="font-bold text-xs">Safe Drop / Cash Handover</div>
                      <div className="text-[10px] text-indigo-700">Move excess drawer cash to locker</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-indigo-600" />
                </button>

                <button
                  type="button"
                  disabled={!activeShift}
                  onClick={() => setActiveTab('DENOMINATIONS')}
                  className="w-full p-3 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-900 rounded-xl border border-blue-200 text-left transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Calculator className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-bold text-xs">Count Notes & Coins</div>
                      <div className="text-[10px] text-blue-700">Physical currency denomination tally</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-blue-600" />
                </button>
              </div>

              {/* Shift Audit Advice Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Audit & Compliance Rule</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Every cashier must count drawer notes and print the Z-Report at the end of their shift. Discrepancies exceeding ±Rs. 50 require mandatory supervisor explanation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: TRANSACTIONS & RECEIPTS WITHIN SHIFT */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Shift Transactions Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                Invoices, expenses, and payments registered under the current active shift.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700">
              Total Invoices: {currentShiftSummary?.invoicesCount || 0}
            </span>
          </div>

          {currentShiftSummary && currentShiftSummary.shiftInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="p-3">Time</th>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentShiftSummary.shiftInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80">
                      <td className="p-3 text-slate-500 font-mono">
                        {inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="p-3 font-bold text-blue-600">
                        {inv.invoiceNumber || inv.id.slice(0, 8)}
                      </td>
                      <td className="p-3 font-medium text-slate-800">
                        {inv.customerName || 'Walk-in Customer'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.transactionType === 'Sale Return' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {inv.transactionType || 'Sale'}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">
                        {inv.paymentType || inv.paymentMethod || 'Cash'}
                      </td>
                      <td className="p-3 text-right font-black text-slate-900">
                        {formatCurrency(inv.receivedAmount !== undefined ? inv.receivedAmount : (inv.grandTotal || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No sales recorded under this active shift yet.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: PHYSICAL NOTE DENOMINATION COUNTER */}
      {activeTab === 'DENOMINATIONS' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                Physical Currency Denomination Counter (PKR)
              </h3>
              <p className="text-xs text-slate-500">
                Count physical banknotes in drawer for instant reconciliation against expected balance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLiveDenoms({ n5000: 0, n1000: 0, n500: 0, n100: 0, n50: 0, n20: 0, n10: 0, coins: 0 })}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 w-fit"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Clear Counter
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Rs. 5,000 Note', key: 'n5000' as const, val: 5000 },
              { label: 'Rs. 1,000 Note', key: 'n1000' as const, val: 1000 },
              { label: 'Rs. 500 Note', key: 'n500' as const, val: 500 },
              { label: 'Rs. 100 Note', key: 'n100' as const, val: 100 },
              { label: 'Rs. 50 Note', key: 'n50' as const, val: 50 },
              { label: 'Rs. 20 Note', key: 'n20' as const, val: 20 },
              { label: 'Rs. 10 Note', key: 'n10' as const, val: 10 },
              { label: 'Coins & Loose', key: 'coins' as const, val: 1, isDirectAmount: true },
            ].map((d) => {
              const count = liveDenoms[d.key] || 0;
              const subtotal = d.isDirectAmount ? count : count * d.val;
              return (
                <div key={d.key} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>{d.label}</span>
                    <span className="text-blue-600 font-black">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLiveDenoms(prev => ({ ...prev, [d.key]: Math.max(0, (prev[d.key] || 0) - (d.isDirectAmount ? 10 : 1)) }))}
                      className="p-1.5 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 font-bold"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={liveDenoms[d.key] || ''}
                      onChange={(e) => setLiveDenoms(prev => ({ ...prev, [d.key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-center text-sm font-black text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setLiveDenoms(prev => ({ ...prev, [d.key]: (prev[d.key] || 0) + (d.isDirectAmount ? 10 : 1) }))}
                      className="p-1.5 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tally Comparison Banner */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Physical Count Total</span>
              <span className="text-2xl font-black text-white">{formatCurrency(liveDenomTotal)}</span>
            </div>

            {currentShiftSummary && (
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Expected In Drawer</span>
                  <span className="text-base font-black text-slate-300">{formatCurrency(currentShiftSummary.expectedCash)}</span>
                </div>
                <div className="text-right pl-4 border-l border-slate-700">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Discrepancy</span>
                  <span className={`text-xl font-black ${
                    liveDenomTotal - currentShiftSummary.expectedCash < -0.5
                      ? 'text-rose-400'
                      : liveDenomTotal - currentShiftSummary.expectedCash > 0.5
                      ? 'text-emerald-400'
                      : 'text-amber-300'
                  }`}>
                    {liveDenomTotal - currentShiftSummary.expectedCash > 0 ? '+' : ''}
                    {formatCurrency(liveDenomTotal - currentShiftSummary.expectedCash)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: SHIFT AUDIT HISTORY */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Historical Shift Reconciliation Records</h3>
              <p className="text-xs text-slate-500">Audit trail of all previous open/close cycles, float totals, and discrepancies.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search shift or cashier..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
              >
                <option value="ALL">All Status</option>
                <option value="OPEN">Open Only</option>
                <option value="CLOSED">Closed Only</option>
              </select>
            </div>
          </div>

          {filteredShifts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="p-3">Shift #</th>
                    <th className="p-3">Cashier</th>
                    <th className="p-3">Started</th>
                    <th className="p-3">Ended</th>
                    <th className="p-3 text-right">Opening Float</th>
                    <th className="p-3 text-right">Cash Sales</th>
                    <th className="p-3 text-right">Expected</th>
                    <th className="p-3 text-right">Actual Counted</th>
                    <th className="p-3 text-center">Variance</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredShifts.map((s) => {
                    const diff = s.cashDifference || 0;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-bold text-blue-600 font-mono">
                          #{s.shiftNumber}
                        </td>
                        <td className="p-3 font-medium text-slate-800">
                          {s.cashierName}
                          {s.shiftType && <span className="block text-[10px] text-slate-400">{s.shiftType}</span>}
                        </td>
                        <td className="p-3 text-slate-600 text-[11px]">
                          {formatDate(s.startTime)}
                        </td>
                        <td className="p-3 text-slate-600 text-[11px]">
                          {s.endTime ? formatDate(s.endTime) : <span className="text-emerald-600 font-bold">Active</span>}
                        </td>
                        <td className="p-3 text-right font-medium text-slate-700">
                          {formatCurrency(s.openingCash)}
                        </td>
                        <td className="p-3 text-right font-medium text-emerald-600">
                          +{formatCurrency(s.cashSales)}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          {formatCurrency(s.expectedCash || (s.openingCash + s.cashSales))}
                        </td>
                        <td className="p-3 text-right font-black text-slate-900">
                          {s.actualCash !== undefined ? formatCurrency(s.actualCash) : '-'}
                        </td>
                        <td className="p-3 text-center">
                          {s.status === 'CLOSED' ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              diff < -0.5
                                ? 'bg-rose-100 text-rose-800'
                                : diff > 0.5
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {diff > 0 ? `+${formatCurrency(diff)}` : diff < 0 ? formatCurrency(diff) : 'Balanced'}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const summary = calculateShiftFinancials(s, invoices, expenses, partyPayments);
                              const business = JSON.parse(localStorage.getItem('mock_business') || '{}');
                              printShiftZReport(summary, s, business);
                            }}
                            className="p-1 text-slate-600 hover:text-blue-600 rounded hover:bg-blue-50 transition"
                            title="Print Z-Report Slip"
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
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No historical shifts match the search criteria.
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: OPEN / CLOSE SHIFT MODAL */}
      <CashierShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        currentShift={activeShift}
        cashierName={currentCashierName}
        invoicesToday={invoices}
        expensesToday={expenses}
        partyPaymentsToday={partyPayments}
        onOpenShift={handleOpenShift}
        onCloseShift={handleCloseShift}
      />

      {/* MODAL 2: QUICK PETTY CASH EXPENSE MODAL */}
      {isQuickExpenseOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Minus className="w-4 h-4 text-amber-600" />
                Pay Petty Cash from Drawer
              </h3>
              <button onClick={() => setIsQuickExpenseOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddQuickExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Expense Category</label>
                <select
                  value={quickExpenseCat}
                  onChange={(e) => setQuickExpenseCat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Tea & Refreshment">Tea & Refreshment</option>
                  <option value="Courier & Delivery">Courier & Delivery Fee</option>
                  <option value="Cleaning & Sanitation">Cleaning & Supplies</option>
                  <option value="Stationery & Printing">Stationery & Bags</option>
                  <option value="Helper Wages">Helper / Daily Wages</option>
                  <option value="Miscellaneous">Miscellaneous Petty Cash</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount Paid in Cash (Rs.)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="e.g. 250"
                  value={quickExpenseAmount}
                  onChange={(e) => setQuickExpenseAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-black text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description / Recipient</label>
                <input
                  type="text"
                  placeholder="e.g. Staff evening tea & biscuits"
                  value={quickExpenseDesc}
                  onChange={(e) => setQuickExpenseDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickExpenseOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-sm"
                >
                  Confirm Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CASH SAFE DROP MODAL */}
      {isSafeDropOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                Transfer Cash to Safe Locker
              </h3>
              <button onClick={() => setIsSafeDropOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSafeDrop} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Transfer Destination / Receiver</label>
                <select
                  value={safeDropReceiver}
                  onChange={(e) => setSafeDropReceiver(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Main Pharmacy Safe">Main Pharmacy Safe Locker</option>
                  <option value="Owner / Admin Handover">Owner / Primary Admin Handover</option>
                  <option value="Bank Night Deposit">Bank Night Deposit Pouch</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Drop Amount (Rs.)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="e.g. 20000"
                  value={safeDropAmount}
                  onChange={(e) => setSafeDropAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Drop Notes / Sealed Bag #</label>
                <input
                  type="text"
                  placeholder="e.g. Midday safe drop bag #49"
                  value={safeDropNotes}
                  onChange={(e) => setSafeDropNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSafeDropOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm"
                >
                  Transfer to Safe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
