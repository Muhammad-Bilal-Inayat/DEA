import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wallet, ArrowDownLeft, ArrowUpRight, Plus, Minus, Landmark, 
  Calendar, Search, Filter, Download, Printer, Trash2, 
  CheckCircle2, RefreshCw, AlertCircle, ShoppingCart, 
  Receipt, ArrowRightLeft, FileSpreadsheet, Building2, Eye, EyeOff,
  DollarSign
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { 
  dbInvoices, dbPurchaseOrders, dbExpenses, 
  dbBankAccounts, dbBankTransactions, dbPartyPayments, dbSuppliers 
} from '../lib/db';
import { 
  Invoice, PurchaseOrder, Expense, 
  BankAccount, BankTransaction, PartyPayment, Party 
} from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { ConfirmDeleteModal } from '../components/common/ConfirmDeleteModal';

interface CashLedgerItem {
  id: string;
  date: string;
  title: string;
  source: 'SALE' | 'PURCHASE' | 'EXPENSE' | 'PARTY_IN' | 'PARTY_OUT' | 'BANK_DEPOSIT' | 'BANK_WITHDRAWAL' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  voucherNo?: string;
  partyName?: string;
  remarks?: string;
  inflow: number;
  outflow: number;
  runningBalance?: number;
  rawType: string;
}

export const CashInHand: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [partyPayments, setPartyPayments] = useState<PartyPayment[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [periodFilter, setPeriodFilter] = useState<'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom'>('All');
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Modals
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<'ADD_CASH' | 'REDUCE_CASH' | 'DEPOSIT_TO_BANK' | 'WITHDRAW_FROM_BANK'>('ADD_CASH');
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustRemarks, setAdjustRemarks] = useState<string>('');
  const [adjustDate, setAdjustDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [adjustBankId, setAdjustBankId] = useState<string>('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; source: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    loadAllCashData();
  }, []);

  const loadAllCashData = async () => {
    setIsLoading(true);
    try {
      const [invs, pos, exps, pays, banks, txs, pts] = await Promise.all([
        dbInvoices.getAll(),
        dbPurchaseOrders.getAll(),
        dbExpenses.getAll(),
        dbPartyPayments.getAll(),
        dbBankAccounts.getAll(),
        dbBankTransactions.getAll(),
        dbSuppliers.getAll(),
      ]);

      setInvoices(invs || []);
      setPurchases(pos || []);
      setExpenses(exps || []);
      setPartyPayments(pays || []);
      setBankAccounts(banks || []);
      setBankTransactions(txs || []);
      setParties(pts || []);
    } catch (err) {
      console.error('Failed to load cash in hand data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Compile Comprehensive Cash Ledger
  const cashLedger = useMemo(() => {
    const list: CashLedgerItem[] = [];

    // 1. Cash Sales (Invoices with Cash payment or received amount)
    invoices.forEach(inv => {
      const isCash = inv.paymentMethod === 'Cash' || inv.paymentType === 'Cash' || !inv.paymentMethod;
      const cashReceived = inv.receivedAmount !== undefined && inv.receivedAmount > 0 
        ? inv.receivedAmount 
        : (isCash ? inv.grandTotal : 0);

      if (cashReceived > 0) {
        list.push({
          id: inv.id,
          date: inv.date,
          title: `Cash Sale #${inv.invoiceNumber}`,
          source: 'SALE',
          voucherNo: inv.invoiceNumber,
          partyName: inv.customerName || 'Counter Cash Sale',
          remarks: inv.description || `${inv.items?.length || 1} item(s) sold via Cash`,
          inflow: cashReceived,
          outflow: 0,
          rawType: 'Invoice'
        });
      }
    });

    // 2. Customer Payments In (Cash)
    partyPayments.forEach(p => {
      if (p.type === 'PAYMENT_IN' && (p.paymentMode === 'Cash' || !p.paymentMode)) {
        list.push({
          id: p.id,
          date: p.date,
          title: `Payment Received (کیش وصولی)`,
          source: 'PARTY_IN',
          voucherNo: p.referenceNumber || 'PAY-IN',
          partyName: p.partyName || 'Customer',
          remarks: p.notes || `Cash received from ${p.partyName}`,
          inflow: p.amount,
          outflow: 0,
          rawType: 'PartyPayment'
        });
      } else if (p.type === 'PAYMENT_OUT' && (p.paymentMode === 'Cash' || !p.paymentMode)) {
        list.push({
          id: p.id,
          date: p.date,
          title: `Payment Paid (کیش ادائیگی)`,
          source: 'PARTY_OUT',
          voucherNo: p.referenceNumber || 'PAY-OUT',
          partyName: p.partyName || 'Supplier',
          remarks: p.notes || `Cash paid to ${p.partyName}`,
          inflow: 0,
          outflow: p.amount,
          rawType: 'PartyPayment'
        });
      }
    });

    // 3. Cash Purchases (Bills paid in Cash)
    purchases.forEach(po => {
      const isCash = po.paymentType === 'Cash' || !po.paymentType;
      const cashPaid = po.paidAmount !== undefined && po.paidAmount > 0 
        ? po.paidAmount 
        : (isCash ? po.totalAmount : 0);

      if (cashPaid > 0) {
        list.push({
          id: po.id,
          date: po.date,
          title: `Cash Purchase #${po.poNumber}`,
          source: 'PURCHASE',
          voucherNo: po.poNumber,
          partyName: po.supplierName || 'Supplier',
          remarks: `${po.items?.length || 1} item(s) purchased via Cash`,
          inflow: 0,
          outflow: cashPaid,
          rawType: 'PurchaseOrder'
        });
      }
    });

    // 4. Cash Expenses
    expenses.forEach(exp => {
      const isCash = exp.paymentMethod === 'Cash' || !exp.paymentMethod;
      if (isCash) {
        list.push({
          id: exp.id,
          date: exp.date,
          title: `Expense (${exp.category})`,
          source: 'EXPENSE',
          voucherNo: exp.expenseNumber || 'EXP',
          partyName: exp.partyName || exp.category,
          remarks: exp.notes || exp.title || 'Cash Expense',
          inflow: 0,
          outflow: exp.amount,
          rawType: 'Expense'
        });
      }
    });

    // 5. Bank Transactions (Transfers between Drawer & Banks, Adjustments)
    bankTransactions.forEach(tx => {
      if (tx.bankAccountId === 'CASH_DRAWER') {
        if (tx.flow === 'IN') {
          list.push({
            id: tx.id,
            date: tx.date,
            title: tx.name || 'Direct Cash Added to Drawer',
            source: 'ADJUSTMENT_IN',
            voucherNo: 'ADJ-IN',
            partyName: 'Cash In Hand Drawer',
            remarks: tx.description || 'Manual drawer balance addition',
            inflow: tx.amount,
            outflow: 0,
            rawType: 'BankTransaction'
          });
        } else {
          list.push({
            id: tx.id,
            date: tx.date,
            title: tx.name || 'Cash Withdrawal / Drawings',
            source: 'ADJUSTMENT_OUT',
            voucherNo: 'ADJ-OUT',
            partyName: 'Drawings / Cash Out',
            remarks: tx.description || 'Manual cash withdrawal from drawer',
            inflow: 0,
            outflow: tx.amount,
            rawType: 'BankTransaction'
          });
        }
      } else if (tx.type === 'Deposit') {
        // Deposited cash into bank account -> Cash Outflow from drawer
        list.push({
          id: tx.id,
          date: tx.date,
          title: `Deposited into ${tx.bankAccountName || 'Bank'}`,
          source: 'BANK_DEPOSIT',
          voucherNo: tx.referenceNo || 'BNK-DEP',
          partyName: tx.bankAccountName || 'Bank Account',
          remarks: tx.description || tx.name || 'Cash taken from drawer and deposited into bank',
          inflow: 0,
          outflow: tx.amount,
          rawType: 'BankTransaction'
        });
      } else if (tx.type === 'Withdrawal') {
        // Withdrawn cash from bank account -> Cash Inflow into drawer
        list.push({
          id: tx.id,
          date: tx.date,
          title: `Withdrawn from ${tx.bankAccountName || 'Bank'}`,
          source: 'BANK_WITHDRAWAL',
          voucherNo: tx.referenceNo || 'BNK-WTH',
          partyName: tx.bankAccountName || 'Bank Account',
          remarks: tx.description || tx.name || 'Cash withdrawn from bank into drawer',
          inflow: tx.amount,
          outflow: 0,
          rawType: 'BankTransaction'
        });
      }
    });

    // Sort chronologically ascending to calculate running balance accurately
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    list.forEach(item => {
      running += (item.inflow - item.outflow);
      item.runningBalance = running;
    });

    // Reverse for UI display (newest first)
    return list.reverse();
  }, [invoices, purchases, expenses, partyPayments, bankTransactions]);

  // Filtered Ledger
  const filteredLedger = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    return cashLedger.filter(item => {
      // Search
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        item.title.toLowerCase().includes(q) ||
        (item.voucherNo && item.voucherNo.toLowerCase().includes(q)) ||
        (item.partyName && item.partyName.toLowerCase().includes(q)) ||
        (item.remarks && item.remarks.toLowerCase().includes(q));

      // Type Filter
      let matchesType = true;
      if (typeFilter === 'INFLOW') matchesType = item.inflow > 0;
      else if (typeFilter === 'OUTFLOW') matchesType = item.outflow > 0;
      else if (typeFilter === 'SALE') matchesType = item.source === 'SALE';
      else if (typeFilter === 'PURCHASE') matchesType = item.source === 'PURCHASE';
      else if (typeFilter === 'EXPENSE') matchesType = item.source === 'EXPENSE';
      else if (typeFilter === 'PARTY') matchesType = item.source === 'PARTY_IN' || item.source === 'PARTY_OUT';
      else if (typeFilter === 'BANK') matchesType = item.source === 'BANK_DEPOSIT' || item.source === 'BANK_WITHDRAWAL';
      else if (typeFilter === 'ADJUSTMENT') matchesType = item.source === 'ADJUSTMENT_IN' || item.source === 'ADJUSTMENT_OUT';

      // Period Filter
      let matchesPeriod = true;
      const itemDateStr = item.date.slice(0, 10);
      if (periodFilter === 'Today') matchesPeriod = itemDateStr === todayStr;
      else if (periodFilter === 'Yesterday') matchesPeriod = itemDateStr === yesterdayStr;
      else if (periodFilter === 'This Week') {
        const d = new Date(item.date);
        const now = new Date();
        const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        matchesPeriod = diff >= 0 && diff <= 7;
      } else if (periodFilter === 'This Month') {
        const itemMonth = itemDateStr.slice(0, 7);
        const currMonth = todayStr.slice(0, 7);
        matchesPeriod = itemMonth === currMonth;
      } else if (periodFilter === 'Custom') {
        matchesPeriod = itemDateStr >= customStartDate && itemDateStr <= customEndDate;
      }

      return matchesSearch && matchesType && matchesPeriod;
    });
  }, [cashLedger, searchTerm, typeFilter, periodFilter, customStartDate, customEndDate]);

  // Overall Financial Metrics
  const metrics = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    let todayInflow = 0;
    let todayOutflow = 0;

    const todayStr = new Date().toISOString().slice(0, 10);

    cashLedger.forEach(item => {
      totalInflow += item.inflow;
      totalOutflow += item.outflow;

      if (item.date.slice(0, 10) === todayStr) {
        todayInflow += item.inflow;
        todayOutflow += item.outflow;
      }
    });

    const netCashInHand = totalInflow - totalOutflow;

    return {
      netCashInHand,
      totalInflow,
      totalOutflow,
      todayInflow,
      todayOutflow,
      todayNet: todayInflow - todayOutflow,
      totalTransactions: cashLedger.length,
    };
  }, [cashLedger]);

  // Save Adjustment
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(adjustAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid cash amount greater than 0.');
      return;
    }

    try {
      if (adjustType === 'ADD_CASH') {
        const tx: BankTransaction = {
          id: uuidv4(),
          bankAccountId: 'CASH_DRAWER',
          bankAccountName: 'Cash In Hand',
          type: 'Adjustment',
          flow: 'IN',
          amount: amountNum,
          date: new Date(adjustDate).toISOString(),
          name: adjustRemarks || 'Cash Added to Drawer',
          description: adjustRemarks || 'Direct Cash Inflow to Cash In Hand Drawer',
          createdAt: new Date().toISOString(),
        };
        await dbBankTransactions.save(tx);
        showToast(`Added Rs ${amountNum.toLocaleString()} to Cash in Hand.`);
      } else if (adjustType === 'REDUCE_CASH') {
        const tx: BankTransaction = {
          id: uuidv4(),
          bankAccountId: 'CASH_DRAWER',
          bankAccountName: 'Cash In Hand',
          type: 'Adjustment',
          flow: 'OUT',
          amount: amountNum,
          date: new Date(adjustDate).toISOString(),
          name: adjustRemarks || 'Cash Drawings / Cash Out',
          description: adjustRemarks || 'Direct Cash Outflow from Drawer',
          createdAt: new Date().toISOString(),
        };
        await dbBankTransactions.save(tx);
        showToast(`Reduced Rs ${amountNum.toLocaleString()} from Cash in Hand.`);
      } else if (adjustType === 'DEPOSIT_TO_BANK') {
        const targetBank = bankAccounts.find(b => b.id === adjustBankId);
        if (!targetBank) {
          alert('Please select a destination bank account.');
          return;
        }
        const tx: BankTransaction = {
          id: uuidv4(),
          bankAccountId: targetBank.id,
          bankAccountName: targetBank.accountDisplayName,
          type: 'Deposit',
          flow: 'IN',
          amount: amountNum,
          date: new Date(adjustDate).toISOString(),
          name: adjustRemarks || `Cash Deposited to ${targetBank.accountDisplayName}`,
          description: adjustRemarks || 'Cash transferred from drawer to bank account',
          referenceNumber: `DEP-${Date.now().toString().slice(-5)}`,
          createdAt: new Date().toISOString(),
        };
        await dbBankTransactions.save(tx);

        // Update target bank current balance
        const updatedBank = { ...targetBank, currentBalance: targetBank.currentBalance + amountNum };
        await dbBankAccounts.save(updatedBank);
        showToast(`Deposited Rs ${amountNum.toLocaleString()} to ${targetBank.accountDisplayName}.`);
      } else if (adjustType === 'WITHDRAW_FROM_BANK') {
        const sourceBank = bankAccounts.find(b => b.id === adjustBankId);
        if (!sourceBank) {
          alert('Please select a source bank account.');
          return;
        }
        const tx: BankTransaction = {
          id: uuidv4(),
          bankAccountId: sourceBank.id,
          bankAccountName: sourceBank.accountDisplayName,
          type: 'Withdrawal',
          flow: 'OUT',
          amount: amountNum,
          date: new Date(adjustDate).toISOString(),
          name: adjustRemarks || `Cash Withdrawn from ${sourceBank.accountDisplayName}`,
          description: adjustRemarks || 'Cash withdrawn from bank into drawer',
          referenceNumber: `WTH-${Date.now().toString().slice(-5)}`,
          createdAt: new Date().toISOString(),
        };
        await dbBankTransactions.save(tx);

        // Update source bank balance
        const updatedBank = { ...sourceBank, currentBalance: sourceBank.currentBalance - amountNum };
        await dbBankAccounts.save(updatedBank);
        showToast(`Withdrew Rs ${amountNum.toLocaleString()} from ${sourceBank.accountDisplayName} into drawer.`);
      }

      setIsAdjustModalOpen(false);
      setAdjustAmount('');
      setAdjustRemarks('');
      await loadAllCashData();
    } catch (err: any) {
      console.error(err);
      alert('Error saving cash adjustment: ' + (err?.message || 'Unknown error'));
    }
  };

  // Delete Cash Entry Handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const { id, source } = deleteTarget;

      if (source === 'SALE') {
        await dbInvoices.delete(id);
        showToast('Sale Invoice deleted and cash reversed.');
      } else if (source === 'PURCHASE') {
        await dbPurchaseOrders.delete(id);
        showToast('Purchase Bill deleted and cash reversed.');
      } else if (source === 'EXPENSE') {
        await dbExpenses.delete(id);
        showToast('Expense record deleted.');
      } else if (source === 'PARTY_IN' || source === 'PARTY_OUT') {
        await dbPartyPayments.delete(id);
        showToast('Party Payment record deleted.');
      } else if (source === 'ADJUSTMENT_IN' || source === 'ADJUSTMENT_OUT' || source === 'BANK_DEPOSIT' || source === 'BANK_WITHDRAWAL') {
        await dbBankTransactions.delete(id);
        showToast('Cash/Bank transaction entry deleted.');
      }

      setDeleteTarget(null);
      await loadAllCashData();
    } catch (err: any) {
      console.error('Delete failed:', err);
      alert('Failed to delete entry: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredLedger.length === 0) {
      alert('No cash records to export.');
      return;
    }

    const rows = filteredLedger.map(item => ({
      Date: formatDate(item.date),
      'Voucher / Ref': item.voucherNo || '-',
      Title: item.title,
      'Party / Account': item.partyName || '-',
      'Cash In (Inflow)': item.inflow > 0 ? item.inflow : 0,
      'Cash Out (Outflow)': item.outflow > 0 ? item.outflow : 0,
      'Running Balance': item.runningBalance || 0,
      Remarks: item.remarks || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CashInHand_Ledger');
    XLSX.writeFile(wb, `MBI_Inventra_Cash_In_Hand_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-5 pb-12 text-slate-800">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Cash in Hand
                <span className="text-xs font-bold text-slate-400 font-urdu">(کیش ان ہینڈ / دراز)</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Physical Cash Drawer Balance, Day Book, Cash Inflows & Outflows
              </p>
            </div>
          </div>
        </div>

        {/* Top Fast Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadAllCashData()}
            title="Refresh All Records"
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3.5 py-2 rounded-xl transition-all shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export Excel
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            Print Day Book
          </button>

          <Link
            to="/shift-management"
            className="flex items-center gap-1.5 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl transition-all shadow-2xs"
          >
            <DollarSign className="w-4 h-4 text-blue-600" />
            Cashier Shift Reconciliation
          </Link>

          <button
            onClick={() => { setAdjustType('ADD_CASH'); setIsAdjustModalOpen(true); }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-xs transition-all active:scale-98"
          >
            <Plus className="w-4 h-4" />
            Adjust / Add Cash
          </button>
        </div>
      </div>

      {/* KPI Financial Overview Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Cash In Hand */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
              Total Cash in Hand (موجودہ کیش)
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight">
              {formatCurrency(metrics.netCashInHand)}
            </div>
            <p className="text-[11px] text-blue-100/90 mt-1 font-medium">
              Synchronized with Sales, Purchases, Expenses & Bank
            </p>
          </div>
        </div>

        {/* Today's Cash Inflow */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Today's Cash Inflow (+)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-emerald-600">
              {formatCurrency(metrics.todayInflow)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Sales & customer payments today
            </div>
          </div>
        </div>

        {/* Today's Cash Outflow */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Today's Cash Outflow (-)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-rose-600">
              {formatCurrency(metrics.todayOutflow)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Purchases, expenses & supplier payments today
            </div>
          </div>
        </div>

        {/* Today's Net Drawer Movement */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Today's Net Movement
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black font-mono ${metrics.todayNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(metrics.todayNet)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {metrics.todayNet >= 0 ? 'Net Cash Gain Today' : 'Net Cash Reduction Today'}
            </div>
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Left: Period Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(['All', 'Today', 'Yesterday', 'This Week', 'This Month', 'Custom'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodFilter(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                periodFilter === p
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {p}
            </button>
          ))}

          {periodFilter === 'Custom' && (
            <div className="flex items-center gap-1.5 ml-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg text-slate-800 font-mono"
              />
              <span className="text-slate-400 text-xs font-bold">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg text-slate-800 font-mono"
              />
            </div>
          )}
        </div>

        {/* Right: Search & Type Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Source Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="ALL">All Cash Transactions</option>
            <option value="INFLOW">Cash In Only (+)</option>
            <option value="OUTFLOW">Cash Out Only (-)</option>
            <option value="SALE">Cash Sales</option>
            <option value="PURCHASE">Cash Purchases</option>
            <option value="EXPENSE">Expenses</option>
            <option value="PARTY">Party Payments (In/Out)</option>
            <option value="BANK">Bank Transfers (Dep/Wth)</option>
            <option value="ADJUSTMENT">Drawer Adjustments</option>
          </select>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search voucher, party, remarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

      </div>

      {/* Main Cash Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-slate-900 tracking-tight">
              Cash Drawer Ledger & Day Book
            </h2>
            <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              {filteredLedger.length} Records
            </span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Chronological Running Balance
          </div>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead>
              <tr className="bg-slate-100/90 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Type & Voucher</th>
                <th className="py-3 px-4">Party / Source</th>
                <th className="py-3 px-4">Remarks / Details</th>
                <th className="py-3 px-4 text-right">Cash In (+)</th>
                <th className="py-3 px-4 text-right">Cash Out (-)</th>
                <th className="py-3 px-4 text-right">Running Balance</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    <Wallet className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No cash transactions found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {formatDate(item.date)}
                    </td>

                    {/* Type & Voucher */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {item.source === 'SALE' && <Receipt className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                        {item.source === 'PURCHASE' && <ShoppingCart className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                        {item.source === 'EXPENSE' && <Minus className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                        {item.source === 'PARTY_IN' && <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        {item.source === 'PARTY_OUT' && <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                        {(item.source === 'BANK_DEPOSIT' || item.source === 'BANK_WITHDRAWAL') && <Landmark className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                        {(item.source === 'ADJUSTMENT_IN' || item.source === 'ADJUSTMENT_OUT') && <Wallet className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                        
                        <span className="font-bold text-slate-900">{item.title}</span>
                      </div>
                      {item.voucherNo && (
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                          Ref: #{item.voucherNo}
                        </span>
                      )}
                    </td>

                    {/* Party */}
                    <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {item.partyName || '-'}
                    </td>

                    {/* Remarks */}
                    <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate" title={item.remarks}>
                      {item.remarks || '-'}
                    </td>

                    {/* Cash In */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                      {item.inflow > 0 ? `+${formatCurrency(item.inflow)}` : '-'}
                    </td>

                    {/* Cash Out */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                      {item.outflow > 0 ? `-${formatCurrency(item.outflow)}` : '-'}
                    </td>

                    {/* Running Balance */}
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                      {formatCurrency(item.runningBalance || 0)}
                    </td>

                    {/* Delete Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setDeleteTarget({ id: item.id, title: item.title, source: item.source })}
                        title="Delete this entry and reverse cash impact"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Adjust Cash Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Cash Drawer Adjustment</h3>
              </div>
              <button 
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-5 space-y-4 text-xs">
              
              {/* Action Tabs */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Adjustment Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADD_CASH')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                      adjustType === 'ADD_CASH'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    + Add Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('REDUCE_CASH')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                      adjustType === 'REDUCE_CASH'
                        ? 'bg-rose-50 border-rose-500 text-rose-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    - Reduce Cash (Drawings)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('DEPOSIT_TO_BANK')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                      adjustType === 'DEPOSIT_TO_BANK'
                        ? 'bg-blue-50 border-blue-500 text-blue-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🏦 Deposit to Bank
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('WITHDRAW_FROM_BANK')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                      adjustType === 'WITHDRAW_FROM_BANK'
                        ? 'bg-purple-50 border-purple-500 text-purple-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🏧 Withdraw from Bank
                  </button>
                </div>
              </div>

              {/* Bank Account Selection (if transfer) */}
              {(adjustType === 'DEPOSIT_TO_BANK' || adjustType === 'WITHDRAW_FROM_BANK') && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Select Bank Account <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={adjustBankId}
                    onChange={(e) => setAdjustBankId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- Choose Bank Account --</option>
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.accountDisplayName} (Bal: {formatCurrency(b.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Amount (Rs) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="e.g. 5000"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={adjustDate}
                  onChange={(e) => setAdjustDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks / Reason</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Personal drawings, Opening petty cash addition..."
                  value={adjustRemarks}
                  onChange={(e) => setAdjustRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all active:scale-98"
                >
                  Save Adjustment
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Reusable Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Delete Cash Entry?"
        message={`Are you sure you want to delete this cash entry? This will reverse the transaction and update your running Cash in Hand balance immediately.`}
        itemName={deleteTarget ? `${deleteTarget.title} (${deleteTarget.source})` : undefined}
        confirmLabel="Yes, Delete & Reverse"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

    </div>
  );
};
