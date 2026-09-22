import React, { useState, useEffect, useMemo } from 'react';
import { 
  Landmark, Plus, Search, MoreVertical, ArrowUpDown, Filter,
  ArrowDownRight, ArrowUpRight, ArrowLeftRight, SlidersHorizontal,
  Printer, FileSpreadsheet, Edit, Trash2, Calendar, Wallet, 
  FileCheck, DollarSign, Building2, CheckCircle2, ChevronDown, 
  RefreshCw, Info, AlertCircle, TrendingUp, TrendingDown, ArrowRight, X
} from 'lucide-react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  dbBankAccounts, dbBankTransactions, dbCheques, dbLoanAccounts, 
  dbInvoices, dbPurchaseOrders, dbExpenses, dbPartyPayments 
} from '../lib/db';
import { 
  BankAccount, BankTransaction, BankTransactionType, 
  ChequeRecord, LoanAccount, Invoice, PurchaseBill, Expense, PartyPayment 
} from '../types';
import { AddBankAccountModal } from '../components/bank/AddBankAccountModal';
import { BankTransactionModal, ModalTransactionAction } from '../components/bank/BankTransactionModal';
import { BankStatementModal } from '../components/bank/BankStatementModal';
import { ChequeModal } from '../components/bank/ChequeModal';
import { LoanModal } from '../components/bank/LoanModal';
import { AdjustCashModal, CashActionType } from '../components/bank/AdjustCashModal';
import { ConfirmDeleteModal } from '../components/common/ConfirmDeleteModal';
import { formatCurrency } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

export const Bank: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Active Main Sub-View: 'BANKS' | 'CASH' | 'CHEQUES' | 'LOANS'
  const [activeMainTab, setActiveMainTab] = useState<'BANKS' | 'CASH' | 'CHEQUES' | 'LOANS'>('BANKS');

  // Core Data State
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [cheques, setCheques] = useState<ChequeRecord[]>([]);
  const [loans, setLoans] = useState<LoanAccount[]>([]);
  
  // Real-time Cash Data from invoices/expenses/purchases
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [allPurchases, setAllPurchases] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);

  // Selection
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  
  // Search & Filter
  const [leftSearchTerm, setLeftSearchTerm] = useState('');
  const [txSearchTerm, setTxSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [periodFilter, setPeriodFilter] = useState<'All Time' | 'Today' | 'This Week' | 'This Month' | 'Custom'>('All Time');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Cheque filters
  const [chequeStatusFilter, setChequeStatusFilter] = useState<string>('ALL');
  const [chequeSearchTerm, setChequeSearchTerm] = useState<string>('');

  // Loan filters
  const [loanTypeFilter, setLoanTypeFilter] = useState<string>('ALL');
  const [loanSearchTerm, setLoanSearchTerm] = useState<string>('');

  // Modals
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalAction, setTxModalAction] = useState<ModalTransactionAction>('DEPOSIT');

  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  const [isChequeModalOpen, setIsChequeModalOpen] = useState(false);
  const [editingCheque, setEditingCheque] = useState<ChequeRecord | null>(null);

  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanAccount | null>(null);

  const [isAdjustCashModalOpen, setIsAdjustCashModalOpen] = useState(false);

  // Dropdowns
  const [isDepositWithdrawDropdownOpen, setIsDepositWithdrawDropdownOpen] = useState(false);
  const [activeRowMenuId, setActiveRowMenuId] = useState<string | null>(null);
  const [activeBankMenuId, setActiveBankMenuId] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = () => {
      setIsDepositWithdrawDropdownOpen(false);
      setActiveRowMenuId(null);
      setActiveBankMenuId(null);
    };
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  // Handle URL Path and Query Params Synchronization
  useEffect(() => {
    // 1. Sync Active Tab with pathname
    if (location.pathname.startsWith('/bank/cash-in-hand')) {
      setActiveMainTab('CASH');
    } else if (location.pathname.startsWith('/bank/cheques')) {
      setActiveMainTab('CHEQUES');
    } else if (location.pathname.startsWith('/bank/loan-accounts')) {
      setActiveMainTab('LOANS');
    } else if (location.pathname === '/bank') {
      setActiveMainTab('BANKS');
    }

    // 2. Query param tab override if any
    const tab = searchParams.get('tab');
    if (tab === 'cash') setActiveMainTab('CASH');
    else if (tab === 'cheques') setActiveMainTab('CHEQUES');
    else if (tab === 'loans') setActiveMainTab('LOANS');
    else if (tab === 'bank' || tab === 'banks') setActiveMainTab('BANKS');

    // 3. Action triggers
    const action = searchParams.get('action');
    if (action === 'add-bank') {
      setEditingBank(null);
      setIsAddBankModalOpen(true);
    } else if (action === 'adjust' || action === 'add-cash') {
      setIsAdjustCashModalOpen(true);
    } else if (action === 'add') {
      if (location.pathname.startsWith('/bank/loan-accounts') || tab === 'loans') {
        setEditingLoan(null);
        setIsLoanModalOpen(true);
      } else if (location.pathname.startsWith('/bank/cheques') || tab === 'cheques') {
        setEditingCheque(null);
        setIsChequeModalOpen(true);
      } else if (location.pathname.startsWith('/bank/cash-in-hand') || tab === 'cash') {
        setIsAdjustCashModalOpen(true);
      } else {
        setEditingBank(null);
        setIsAddBankModalOpen(true);
      }
    } else if (action === 'deposit') {
      setTxModalAction('DEPOSIT');
      setIsTxModalOpen(true);
    } else if (action === 'withdraw') {
      setTxModalAction('WITHDRAW');
      setIsTxModalOpen(true);
    } else if (action === 'transfer') {
      setTxModalAction('TRANSFER');
      setIsTxModalOpen(true);
    }
  }, [location.pathname, searchParams]);

  // Load Data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const [
      banks, 
      txs, 
      chqs, 
      lns,
      invs,
      purchases,
      exps
    ] = await Promise.all([
      dbBankAccounts.getAll(),
      dbBankTransactions.getAll(),
      dbCheques.getAll(),
      dbLoanAccounts.getAll(),
      dbInvoices.getAll(),
      dbPurchaseOrders.getAll(),
      dbExpenses.getAll(),
    ]);

    setBankAccounts(banks);
    setTransactions(txs);
    setCheques(chqs);
    setLoans(lns);
    setAllInvoices(invs);
    setAllPurchases(purchases);
    setAllExpenses(exps);

    if (banks.length > 0 && !selectedBankId) {
      setSelectedBankId(banks[0].id);
    }
  };

  // Active Selected Bank
  const selectedBank = useMemo(() => {
    return bankAccounts.find(b => b.id === selectedBankId) || bankAccounts[0] || null;
  }, [bankAccounts, selectedBankId]);

  // Filtered Bank Accounts for Left Sidebar
  const filteredBanks = useMemo(() => {
    return bankAccounts.filter(b => 
      b.accountDisplayName.toLowerCase().includes(leftSearchTerm.toLowerCase()) ||
      b.bankName?.toLowerCase().includes(leftSearchTerm.toLowerCase()) ||
      b.accountNumber?.includes(leftSearchTerm)
    );
  }, [bankAccounts, leftSearchTerm]);

  // Filtered Transactions for Selected Bank
  const filteredTransactions = useMemo(() => {
    if (!selectedBank) return [];
    let list = transactions.filter(t => t.bankAccountId === selectedBank.id);

    if (txSearchTerm) {
      const q = txSearchTerm.toLowerCase();
      list = list.filter(t => 
        t.name.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) ||
        (t.referenceNumber && t.referenceNumber.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    if (typeFilter !== 'ALL') {
      list = list.filter(t => t.type === typeFilter);
    }

    // Period filter
    if (periodFilter !== 'All Time') {
      const now = new Date();
      list = list.filter(t => {
        const txDate = new Date(t.date);
        if (periodFilter === 'Today') {
          return txDate.toDateString() === now.toDateString();
        } else if (periodFilter === 'This Week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return txDate >= weekAgo;
        } else if (periodFilter === 'This Month') {
          return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        } else if (periodFilter === 'Custom') {
          return t.date.slice(0, 10) >= startDate && t.date.slice(0, 10) <= endDate;
        }
        return true;
      });
    }

    // Sort by Date
    list.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [selectedBank, transactions, txSearchTerm, typeFilter, periodFilter, startDate, endDate, sortOrder]);

  // Aggregate Total Balances
  const totalBankBalance = useMemo(() => {
    return bankAccounts.reduce((acc, b) => acc + (b.currentBalance || 0), 0);
  }, [bankAccounts]);

  // Cash In Hand Calculation
  const cashInHandMetrics = useMemo(() => {
    // Inflows (Cash Sales + Bank Withdrawals + Direct Cash Adjustments In)
    const cashSalesTotal = allInvoices
      .filter(i => (i.paymentType === 'Cash' || i.paymentMethod === 'Cash') && (i.receivedAmount || 0) > 0)
      .reduce((acc, i) => acc + (i.receivedAmount || 0), 0);

    const bankWithdrawals = transactions
      .filter(t => t.type === 'Withdrawal')
      .reduce((acc, t) => acc + t.amount, 0);

    const cashAdjustmentsIn = transactions
      .filter(t => t.bankAccountId === 'CASH_DRAWER' && t.flow === 'IN')
      .reduce((acc, t) => acc + t.amount, 0);

    // Outflows (Cash Purchases + Cash Expenses + Bank Deposits + Direct Cash Adjustments Out)
    const cashPurchasesTotal = allPurchases
      .filter(p => p.paymentType === 'Cash' && (p.paidAmount || 0) > 0)
      .reduce((acc, p) => acc + (p.paidAmount || 0), 0);

    const cashExpensesTotal = allExpenses
      .filter(e => e.paymentType === 'Cash' && (e.amount || 0) > 0)
      .reduce((acc, e) => acc + (e.amount || 0), 0);

    const bankDeposits = transactions
      .filter(t => t.type === 'Deposit')
      .reduce((acc, t) => acc + t.amount, 0);

    const cashAdjustmentsOut = transactions
      .filter(t => t.bankAccountId === 'CASH_DRAWER' && t.flow === 'OUT')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalCashIn = cashSalesTotal + bankWithdrawals + cashAdjustmentsIn;
    const totalCashOut = cashPurchasesTotal + cashExpensesTotal + bankDeposits + cashAdjustmentsOut;
    const netCashInHand = totalCashIn - totalCashOut;

    return {
      totalCashIn,
      totalCashOut,
      netCashInHand,
      cashSalesTotal,
      bankWithdrawals,
      cashAdjustmentsIn,
      cashPurchasesTotal,
      cashExpensesTotal,
      bankDeposits,
      cashAdjustmentsOut
    };
  }, [allInvoices, allPurchases, allExpenses, transactions]);

  // Cash in hand transaction history
  const cashHistory = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      title: string;
      category: string;
      debit?: number; // Cash Out
      credit?: number; // Cash In
      type: 'INVOICE' | 'EXPENSE' | 'DEPOSIT' | 'WITHDRAWAL' | 'ADJUSTMENT';
    }> = [];

    // Cash Invoices
    allInvoices
      .filter(i => (i.paymentType === 'Cash' || i.paymentMethod === 'Cash') && (i.receivedAmount || 0) > 0)
      .forEach(i => {
        list.push({
          id: i.id,
          date: i.date,
          title: `Sale Invoice #${i.invoiceNumber}`,
          category: i.customerName || 'Walk-in Customer',
          credit: i.receivedAmount || 0,
          type: 'INVOICE'
        });
      });

    // Cash Expenses
    allExpenses
      .filter(e => e.paymentType === 'Cash' && (e.amount || 0) > 0)
      .forEach(e => {
        list.push({
          id: e.id,
          date: e.date,
          title: `Expense: ${e.category}`,
          category: e.partyName || e.description || 'General Expense',
          debit: e.amount || 0,
          type: 'EXPENSE'
        });
      });

    // Bank Deposits / Withdrawals / Cash Adjustments
    transactions.forEach(t => {
      if (t.bankAccountId === 'CASH_DRAWER') {
        if (t.flow === 'IN') {
          list.push({
            id: t.id,
            date: t.date,
            title: t.name || 'Cash Addition',
            category: t.description || 'Cash Inflow',
            credit: t.amount,
            type: 'ADJUSTMENT'
          });
        } else {
          list.push({
            id: t.id,
            date: t.date,
            title: t.name || 'Cash Reduction',
            category: t.description || 'Cash Outflow',
            debit: t.amount,
            type: 'ADJUSTMENT'
          });
        }
      } else if (t.type === 'Deposit') {
        list.push({
          id: t.id,
          date: t.date,
          title: `Deposited to ${t.bankAccountName}`,
          category: t.name || 'Bank Deposit',
          debit: t.amount,
          type: 'DEPOSIT'
        });
      } else if (t.type === 'Withdrawal') {
        list.push({
          id: t.id,
          date: t.date,
          title: `Withdrawn from ${t.bankAccountName}`,
          category: t.name || 'Bank Withdrawal',
          credit: t.amount,
          type: 'WITHDRAWAL'
        });
      }
    });

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [allInvoices, allExpenses, transactions]);

  // Handle Cash Adjustment
  const handleSaveCashAdjustment = async (
    type: CashActionType,
    amount: number,
    date: string,
    remarks: string,
    targetBankId?: string
  ) => {
    if (type === 'ADD_CASH') {
      const adjustmentTx: BankTransaction = {
        id: uuidv4(),
        bankAccountId: 'CASH_DRAWER',
        bankAccountName: 'Cash In Hand',
        type: 'Adjustment',
        flow: 'IN',
        amount,
        date: new Date(date).toISOString(),
        name: remarks || 'Direct Cash Inflow / Cash In Hand',
        description: remarks || 'Physical Cash Added to Drawer',
        createdAt: new Date().toISOString(),
      };
      await dbBankTransactions.save(adjustmentTx);
      showToast(`Cash of Rs ${amount.toLocaleString()} added to Cash In Hand.`);
    } else if (type === 'REDUCE_CASH') {
      const adjustmentTx: BankTransaction = {
        id: uuidv4(),
        bankAccountId: 'CASH_DRAWER',
        bankAccountName: 'Cash In Hand',
        type: 'Adjustment',
        flow: 'OUT',
        amount,
        date: new Date(date).toISOString(),
        name: remarks || 'Direct Cash Outflow / Drawings',
        description: remarks || 'Physical Cash Reduced from Drawer',
        createdAt: new Date().toISOString(),
      };
      await dbBankTransactions.save(adjustmentTx);
      showToast(`Cash reduced by Rs ${amount.toLocaleString()}.`);
    } else if (type === 'DEPOSIT_TO_BANK') {
      const targetBank = bankAccounts.find(b => b.id === targetBankId);
      if (!targetBank) throw new Error('Bank account not found');
      const depositTx: BankTransaction = {
        id: uuidv4(),
        bankAccountId: targetBank.id,
        bankAccountName: targetBank.accountDisplayName,
        type: 'Deposit',
        flow: 'IN',
        amount,
        date: new Date(date).toISOString(),
        name: remarks || 'Cash Deposit to Bank',
        description: remarks || 'Physical cash deposited to bank account',
        createdAt: new Date().toISOString(),
      };
      const updatedBank: BankAccount = {
        ...targetBank,
        currentBalance: (targetBank.currentBalance || 0) + amount,
        updatedAt: new Date().toISOString(),
      };
      await dbBankTransactions.save(depositTx);
      await dbBankAccounts.save(updatedBank);
      showToast(`Deposited Rs ${amount.toLocaleString()} into ${targetBank.accountDisplayName}.`);
    } else if (type === 'WITHDRAW_FROM_BANK') {
      const targetBank = bankAccounts.find(b => b.id === targetBankId);
      if (!targetBank) throw new Error('Bank account not found');
      const withdrawTx: BankTransaction = {
        id: uuidv4(),
        bankAccountId: targetBank.id,
        bankAccountName: targetBank.accountDisplayName,
        type: 'Withdrawal',
        flow: 'OUT',
        amount,
        date: new Date(date).toISOString(),
        name: remarks || 'Cash Withdrawal from Bank',
        description: remarks || 'Bank withdrawal to cash drawer',
        createdAt: new Date().toISOString(),
      };
      const updatedBank: BankAccount = {
        ...targetBank,
        currentBalance: (targetBank.currentBalance || 0) - amount,
        updatedAt: new Date().toISOString(),
      };
      await dbBankTransactions.save(withdrawTx);
      await dbBankAccounts.save(updatedBank);
      showToast(`Withdrew Rs ${amount.toLocaleString()} from ${targetBank.accountDisplayName} to Cash In Hand.`);
    }

    await loadAllData();
  };

  // Switch Sub-Tab and sync Route URL
  const switchMainTab = (tab: 'BANKS' | 'CASH' | 'CHEQUES' | 'LOANS') => {
    setActiveMainTab(tab);
    if (tab === 'BANKS') navigate('/bank');
    else if (tab === 'CASH') navigate('/bank/cash-in-hand');
    else if (tab === 'CHEQUES') navigate('/bank/cheques');
    else if (tab === 'LOANS') navigate('/bank/loan-accounts');
  };

  // Filtered Cheques
  const filteredCheques = useMemo(() => {
    return cheques.filter(c => {
      const matchesSearch = 
        c.chequeNumber.toLowerCase().includes(chequeSearchTerm.toLowerCase()) ||
        c.partyName.toLowerCase().includes(chequeSearchTerm.toLowerCase()) ||
        c.bankName.toLowerCase().includes(chequeSearchTerm.toLowerCase());
      
      const matchesStatus = chequeStatusFilter === 'ALL' || c.status === chequeStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [cheques, chequeSearchTerm, chequeStatusFilter]);

  // Filtered Loans
  const filteredLoans = useMemo(() => {
    return loans.filter(l => {
      const matchesSearch = 
        l.accountName.toLowerCase().includes(loanSearchTerm.toLowerCase()) ||
        l.lenderName.toLowerCase().includes(loanSearchTerm.toLowerCase());
      
      const matchesType = loanTypeFilter === 'ALL' || l.loanType === loanTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [loans, loanSearchTerm, loanTypeFilter]);

  // Cheque quick status update
  const handleUpdateChequeStatus = async (cheque: ChequeRecord, newStatus: 'PENDING' | 'CLEARED' | 'BOUNCED' | 'CANCELLED') => {
    const updatedCheque: ChequeRecord = {
      ...cheque,
      status: newStatus,
      clearanceDate: newStatus === 'CLEARED' ? new Date().toISOString().slice(0, 10) : undefined
    };
    await dbCheques.save(updatedCheque);

    // If marked as cleared and linked to a bank account, record bank transaction
    if (newStatus === 'CLEARED' && cheque.bankAccountId) {
      const targetBank = bankAccounts.find(b => b.id === cheque.bankAccountId);
      if (targetBank) {
        const txFlow = cheque.type === 'RECEIVED' ? 'IN' : 'OUT';
        const txType = cheque.type === 'RECEIVED' ? 'Cheque Deposit' : 'Cheque Issued';
        const chequeTx: BankTransaction = {
          id: uuidv4(),
          bankAccountId: targetBank.id,
          bankAccountName: targetBank.accountDisplayName,
          type: txType as BankTransactionType,
          flow: txFlow,
          amount: cheque.amount,
          date: new Date().toISOString(),
          name: `Cheque #${cheque.chequeNumber} (${cheque.partyName})`,
          referenceNumber: cheque.chequeNumber,
          description: `Cheque cleared: ${cheque.notes || ''}`,
          createdAt: new Date().toISOString(),
        };
        const balanceDelta = txFlow === 'IN' ? cheque.amount : -cheque.amount;
        const updatedBank: BankAccount = {
          ...targetBank,
          currentBalance: (targetBank.currentBalance || 0) + balanceDelta,
          updatedAt: new Date().toISOString(),
        };
        await dbBankTransactions.save(chequeTx);
        await dbBankAccounts.save(updatedBank);
      }
    }

    showToast(`Cheque #${cheque.chequeNumber} status updated to ${newStatus}.`);
    await loadAllData();
  };

  // Save Bank Account
  const handleSaveBankAccount = async (bank: BankAccount, saveAndNew?: boolean) => {
    await dbBankAccounts.save(bank);
    showToast(`Bank account "${bank.accountDisplayName}" saved successfully!`);
    await loadAllData();
    setSelectedBankId(bank.id);
  };

  // Delete State
  const [deleteTargetBank, setDeleteTargetBank] = useState<BankAccount | null>(null);
  const [deleteTargetTx, setDeleteTargetTx] = useState<BankTransaction | null>(null);
  const [deleteTargetCheque, setDeleteTargetCheque] = useState<ChequeRecord | null>(null);
  const [deleteTargetLoan, setDeleteTargetLoan] = useState<LoanAccount | null>(null);
  const [isDeletingBankItem, setIsDeletingBankItem] = useState(false);

  // Delete Bank Account
  const handleDeleteBankAccount = (bankId: string) => {
    const bankToDelete = bankAccounts.find(b => b.id === bankId);
    if (bankToDelete) {
      setDeleteTargetBank(bankToDelete);
    }
  };

  const handleConfirmDeleteBank = async () => {
    if (!deleteTargetBank) return;
    setIsDeletingBankItem(true);
    try {
      await dbBankAccounts.delete(deleteTargetBank.id);
      showToast(`Account "${deleteTargetBank.accountDisplayName}" deleted.`);
      const updated = bankAccounts.filter(b => b.id !== deleteTargetBank.id);
      setBankAccounts(updated);
      if (updated.length > 0) {
        setSelectedBankId(updated[0].id);
      }
      setDeleteTargetBank(null);
    } finally {
      setIsDeletingBankItem(false);
    }
  };

  // Save Bank Transaction
  const handleSaveTransaction = async (
    tx: BankTransaction, 
    updatedSourceBank: BankAccount, 
    updatedDestBank?: BankAccount
  ) => {
    await dbBankTransactions.save(tx);
    await dbBankAccounts.save(updatedSourceBank);
    if (updatedDestBank) {
      await dbBankAccounts.save(updatedDestBank);
    }
    showToast(`Transaction recorded: ${tx.name} (Rs ${tx.amount.toLocaleString()})`);
    await loadAllData();
  };

  // Delete Bank Transaction
  const handleDeleteTransaction = (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (tx) {
      setDeleteTargetTx(tx);
    }
  };

  const handleConfirmDeleteTx = async () => {
    if (!deleteTargetTx || !selectedBank) return;
    setIsDeletingBankItem(true);
    try {
      const balanceDelta = deleteTargetTx.flow === 'IN' ? -deleteTargetTx.amount : deleteTargetTx.amount;
      const updatedBank: BankAccount = {
        ...selectedBank,
        currentBalance: (selectedBank.currentBalance || 0) + balanceDelta,
        updatedAt: new Date().toISOString()
      };
      await dbBankTransactions.delete(deleteTargetTx.id);
      await dbBankAccounts.save(updatedBank);
      showToast('Transaction deleted and account balance updated.');
      await loadAllData();
      setDeleteTargetTx(null);
    } finally {
      setIsDeletingBankItem(false);
    }
  };

  // Save Cheque
  const handleSaveCheque = async (cheque: ChequeRecord) => {
    await dbCheques.save(cheque);
    showToast(`Cheque #${cheque.chequeNumber} saved successfully.`);
    await loadAllData();
  };

  // Delete Cheque
  const handleDeleteCheque = (id: string) => {
    const chq = cheques.find(c => c.id === id);
    if (chq) {
      setDeleteTargetCheque(chq);
    }
  };

  const handleConfirmDeleteCheque = async () => {
    if (!deleteTargetCheque) return;
    setIsDeletingBankItem(true);
    try {
      await dbCheques.delete(deleteTargetCheque.id);
      showToast('Cheque deleted.');
      await loadAllData();
      setDeleteTargetCheque(null);
    } finally {
      setIsDeletingBankItem(false);
    }
  };

  // Save Loan
  const handleSaveLoan = async (loan: LoanAccount) => {
    await dbLoanAccounts.save(loan);
    showToast(`Loan account "${loan.accountName}" saved.`);
    await loadAllData();
  };

  // Delete Loan
  const handleDeleteLoan = (id: string) => {
    const loan = loans.find(l => l.id === id);
    if (loan) {
      setDeleteTargetLoan(loan);
    }
  };

  const handleConfirmDeleteLoan = async () => {
    if (!deleteTargetLoan) return;
    setIsDeletingBankItem(true);
    try {
      await dbLoanAccounts.delete(deleteTargetLoan.id);
      showToast('Loan account deleted.');
      await loadAllData();
      setDeleteTargetLoan(null);
    } finally {
      setIsDeletingBankItem(false);
    }
  };

  // Export Excel
  const handleExportTransactionsExcel = () => {
    if (!selectedBank) return;
    const data = filteredTransactions.map((tx, idx) => ({
      'S.No': idx + 1,
      'Bank Account': selectedBank.accountDisplayName,
      'Date': new Date(tx.date).toLocaleDateString('en-GB'),
      'Type': tx.type,
      'Flow': tx.flow,
      'Particulars / Name': tx.name,
      'Amount (Rs)': tx.amount,
      'Ref / Cheque No': tx.referenceNumber || '-',
      'Notes': tx.description || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, `${selectedBank.accountDisplayName}_Transactions.xlsx`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-100 rounded-2xl border border-slate-300 shadow-xl overflow-hidden animate-in fade-in select-none">
      
      {/* Top Window Header */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Bank Accounts, Cash & Loans</h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Manage bank balances, cash-in-hand, cheques and loan accounts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden bg-[#f1f5f9]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sub-Nav Bar: Bank Accounts / Cash In Hand / Cheques / Loan Accounts */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => switchMainTab('BANKS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeMainTab === 'BANKS'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-4 h-4 text-blue-600" />
            Bank Accounts
            <span className="bg-blue-200/70 text-blue-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {bankAccounts.length}
            </span>
          </button>

          <button
            onClick={() => switchMainTab('CASH')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeMainTab === 'CASH'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-4 h-4 text-emerald-600" />
            Cash In Hand
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              cashInHandMetrics.netCashInHand >= 0 ? 'bg-emerald-200/70 text-emerald-800' : 'bg-rose-200/70 text-rose-800'
            }`}>
              Rs {cashInHandMetrics.netCashInHand.toLocaleString()}
            </span>
          </button>

          <button
            onClick={() => switchMainTab('CHEQUES')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeMainTab === 'CHEQUES'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FileCheck className="w-4 h-4 text-blue-600" />
            Cheques
            <span className="bg-blue-200/70 text-blue-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {cheques.length}
            </span>
          </button>

          <button
            onClick={() => switchMainTab('LOANS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeMainTab === 'LOANS'
                ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-600" />
            Loan Accounts
            <span className="bg-amber-200/70 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {loans.length}
            </span>
          </button>
        </div>

        {/* Global Summary Badge */}
        <div className="flex items-center gap-3 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 text-slate-500 font-medium">
            <span>Total Bank Balance:</span>
            <span className="font-bold text-slate-900">Rs {totalBankBalance.toLocaleString()}</span>
          </div>
          <button
            onClick={() => {
              setEditingBank(null);
              setIsAddBankModalOpen(true);
            }}
            className="px-3 py-1.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Bank
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeMainTab === 'BANKS' && (
        <div className="flex-1 flex overflow-hidden">
          {/* ================= LEFT SIDEBAR (ACCOUNT LIST) ================= */}
          <div className="w-72 sm:w-80 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0">
            {/* Left Header with Search & Add Bank Button */}
            <div className="p-3 border-b border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={leftSearchTerm}
                    onChange={(e) => setLeftSearchTerm(e.target.value)}
                    placeholder="Search bank accounts..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* + Add Bank Pill Button (Matches screenshot) */}
                <button
                  onClick={() => {
                    setEditingBank(null);
                    setIsAddBankModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 bg-[#f59e0b] hover:bg-[#d97706] active:bg-[#b45309] text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer transition-colors whitespace-nowrap"
                  title="Add new bank account"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Bank
                </button>
              </div>

              {/* Table Header Row (Matches screenshot: ↑ ACCOUNT NAME | AMOUNT) */}
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 pt-1 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  ↑ ACCOUNT NAME
                </span>
                <span>AMOUNT</span>
              </div>
            </div>

            {/* Bank Accounts List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredBanks.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <Landmark className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium">No bank accounts found</p>
                  <button
                    onClick={() => {
                      setEditingBank(null);
                      setIsAddBankModalOpen(true);
                    }}
                    className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                  >
                    + Add your first bank account
                  </button>
                </div>
              ) : (
                filteredBanks.map((bank) => {
                  const isSelected = selectedBank?.id === bank.id;
                  return (
                    <div
                      key={bank.id}
                      onClick={() => setSelectedBankId(bank.id)}
                      className={`group relative flex items-center justify-between p-3 cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-blue-50/70 border-l-4 border-blue-600' 
                          : 'hover:bg-slate-50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Landmark Icon in Blue Circle */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected 
                            ? 'bg-blue-600 text-white shadow-xs' 
                            : 'bg-blue-100 text-blue-700 group-hover:bg-blue-200'
                        }`}>
                          <Landmark className="w-4 h-4" />
                        </div>

                        {/* Account Name & Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900 uppercase truncate">
                              {bank.accountDisplayName}
                            </span>
                            {bank.isDefault && (
                              <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-1 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 truncate block font-mono">
                            {bank.accountNumber ? `•••• ${bank.accountNumber.slice(-4)}` : bank.bankName}
                          </span>
                        </div>
                      </div>

                      {/* Right Amount & 3-dots Menu */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-900">
                          Rs {(bank.currentBalance || 0).toLocaleString()}
                        </span>

                        {/* 3-dots Action Menu */}
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveBankMenuId(activeBankMenuId === bank.id ? null : bank.id);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {activeBankMenuId === bank.id && (
                            <div className="absolute right-0 top-6 z-40 w-44 bg-white rounded-lg shadow-xl border border-slate-200 py-1 text-xs text-slate-700 animate-in fade-in zoom-in-95">
                              <button
                                onClick={() => {
                                  setActiveBankMenuId(null);
                                  setEditingBank(bank);
                                  setIsAddBankModalOpen(true);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5 text-blue-600" />
                                Edit Account
                              </button>
                              <button
                                onClick={() => {
                                  setActiveBankMenuId(null);
                                  setSelectedBankId(bank.id);
                                  setTxModalAction('DEPOSIT');
                                  setIsTxModalOpen(true);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                              >
                                <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                                Deposit Money
                              </button>
                              <button
                                onClick={() => {
                                  setActiveBankMenuId(null);
                                  setSelectedBankId(bank.id);
                                  setTxModalAction('WITHDRAW');
                                  setIsTxModalOpen(true);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                                Withdraw Money
                              </button>
                              <button
                                onClick={() => {
                                  setActiveBankMenuId(null);
                                  setSelectedBankId(bank.id);
                                  setTxModalAction('TRANSFER');
                                  setIsTxModalOpen(true);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
                                Transfer to Bank
                              </button>
                              <button
                                onClick={() => {
                                  setActiveBankMenuId(null);
                                  setSelectedBankId(bank.id);
                                  setIsStatementModalOpen(true);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-600" />
                                View Statement
                              </button>
                              <div className="border-t border-slate-100 my-1" />
                              <button
                                onClick={() => {
                                  setActiveBankMenuId(null);
                                  handleDeleteBankAccount(bank.id);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Account
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Left Sidebar Footer (Total Sum) */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500">Total in Banks:</span>
              <span className="font-black text-slate-900">Rs {totalBankBalance.toLocaleString()}</span>
            </div>
          </div>

          {/* ================= RIGHT MAIN PANEL (SELECTED BANK & TRANSACTIONS) ================= */}
          <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#f8fafc]">
            {selectedBank ? (
              <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto w-full">
                {/* 1. Top Account Info Card (Exact match to screenshot) */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left Info Columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block font-semibold">Bank Name:</span>
                        <span className="font-bold text-slate-800 text-sm">{selectedBank.bankName || selectedBank.accountDisplayName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">Account Number:</span>
                        <span className="font-mono font-bold text-slate-800 text-sm">{selectedBank.accountNumber || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">IFSC / Branch Code:</span>
                        <span className="font-mono font-bold text-slate-800">{selectedBank.ifscCode || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">UPI ID / Raast ID:</span>
                        <span className="font-mono font-bold text-slate-800 truncate block">{selectedBank.upiId || '-'}</span>
                      </div>
                    </div>

                    {/* Right Action Dropdown & Balance Display */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      {/* Deposit / Withdraw Action Button (Matches deep blue screenshot button) */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setIsDepositWithdrawDropdownOpen(!isDepositWithdrawDropdownOpen)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                        >
                          <span>Deposit / Withdraw</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDepositWithdrawDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isDepositWithdrawDropdownOpen && (
                          <div className="absolute right-0 top-10 z-40 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-xs text-slate-700 animate-in fade-in zoom-in-95">
                            <button
                              onClick={() => {
                                setIsDepositWithdrawDropdownOpen(false);
                                setTxModalAction('DEPOSIT');
                                setIsTxModalOpen(true);
                              }}
                              className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 font-semibold flex items-center gap-2 cursor-pointer"
                            >
                              <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                              Deposit to Bank
                            </button>
                            <button
                              onClick={() => {
                                setIsDepositWithdrawDropdownOpen(false);
                                setTxModalAction('WITHDRAW');
                                setIsTxModalOpen(true);
                              }}
                              className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-slate-800 hover:text-rose-800 font-semibold flex items-center gap-2 cursor-pointer"
                            >
                              <ArrowUpRight className="w-4 h-4 text-rose-600" />
                              Withdraw from Bank
                            </button>
                            <button
                              onClick={() => {
                                setIsDepositWithdrawDropdownOpen(false);
                                setTxModalAction('TRANSFER');
                                setIsTxModalOpen(true);
                              }}
                              className="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-slate-800 hover:text-blue-800 font-semibold flex items-center gap-2 cursor-pointer"
                            >
                              <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                              Bank to Bank Transfer
                            </button>
                            <div className="border-t border-slate-100 my-1" />
                            <button
                              onClick={() => {
                                setIsDepositWithdrawDropdownOpen(false);
                                setTxModalAction('ADJUST');
                                setIsTxModalOpen(true);
                              }}
                              className="w-full text-left px-3.5 py-2 hover:bg-amber-50 text-slate-800 hover:text-amber-800 font-semibold flex items-center gap-2 cursor-pointer"
                            >
                              <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                              Adjust Bank Balance
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Balance on Vyapar / System (Matches screenshot) */}
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block font-semibold">Balance on System:</span>
                        <span className="text-base font-black text-slate-900">
                          Rs {(selectedBank.currentBalance || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. TRANSACTIONS Section (Matches screenshot) */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col">
                  {/* Section Header */}
                  <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900 tracking-wider uppercase">
                        TRANSACTIONS
                      </h3>
                      <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                        {filteredTransactions.length} records
                      </span>
                    </div>

                    {/* Right Controls: Search, Period Filter, Statement & Export */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={txSearchTerm}
                          onChange={(e) => setTxSearchTerm(e.target.value)}
                          placeholder="Search transactions..."
                          className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 w-44 sm:w-52"
                        />
                      </div>

                      {/* Date Filter Dropdown */}
                      <select
                        value={periodFilter}
                        onChange={(e) => setPeriodFilter(e.target.value as any)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 font-semibold text-slate-700 bg-white"
                      >
                        <option value="All Time">All Time</option>
                        <option value="Today">Today</option>
                        <option value="This Week">This Week</option>
                        <option value="This Month">This Month</option>
                      </select>

                      {/* Type Filter */}
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 font-semibold text-slate-700 bg-white"
                      >
                        <option value="ALL">All Types</option>
                        <option value="Deposit">Deposit</option>
                        <option value="Withdrawal">Withdrawal</option>
                        <option value="Bank Transfer In">Transfer In</option>
                        <option value="Bank Transfer Out">Transfer Out</option>
                        <option value="Adjustment">Adjustment</option>
                      </select>

                      {/* Print Statement Button */}
                      <button
                        onClick={() => setIsStatementModalOpen(true)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
                        title="Print Bank Statement"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      {/* Excel Export */}
                      <button
                        onClick={handleExportTransactionsExcel}
                        className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 cursor-pointer"
                        title="Export to Excel"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </button>

                      {/* Add Transaction Button */}
                      <button
                        onClick={() => {
                          setTxModalAction('DEPOSIT');
                          setIsTxModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Entry
                      </button>
                    </div>
                  </div>

                  {/* Table with headers matching screenshot: TYPE (Y) | NAME (Y) | DATE (Y) | AMOUNT (Y) */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span>TYPE</span>
                              <Filter className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="py-2.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span>NAME</span>
                              <Filter className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th 
                            className="py-2.5 px-4 cursor-pointer hover:text-slate-900 select-none"
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{sortOrder === 'desc' ? '↓' : '↑'} DATE</span>
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span>AMOUNT</span>
                              <Filter className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="py-2.5 px-4 text-center w-16">ACTION</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {filteredTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400">
                              <Landmark className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                              <p className="text-sm font-semibold text-slate-600">No transactions to show</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Record a deposit, cash withdrawal or fund transfer to see it here.
                              </p>
                              <button
                                onClick={() => {
                                  setTxModalAction('DEPOSIT');
                                  setIsTxModalOpen(true);
                                }}
                                className="mt-3 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Record First Transaction
                              </button>
                            </td>
                          </tr>
                        ) : (
                          filteredTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                              {/* TYPE */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1.5 font-bold px-2 py-0.5 rounded-md text-[11px] ${
                                  tx.flow === 'IN' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {tx.flow === 'IN' ? (
                                    <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <ArrowUpRight className="w-3 h-3 text-rose-600" />
                                  )}
                                  {tx.type}
                                </span>
                              </td>

                              {/* NAME / Particulars */}
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{tx.name}</div>
                                {tx.referenceNumber && (
                                  <span className="text-[10px] text-slate-400 font-mono block">
                                    Ref: {tx.referenceNumber}
                                  </span>
                                )}
                                {tx.description && (
                                  <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                                    {tx.description}
                                  </span>
                                )}
                              </td>

                              {/* DATE */}
                              <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono">
                                {new Date(tx.date).toLocaleDateString('en-GB')}
                              </td>

                              {/* AMOUNT */}
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <span className={`text-xs font-black ${
                                  tx.flow === 'IN' ? 'text-emerald-600' : 'text-rose-600'
                                }`}>
                                  {tx.flow === 'IN' ? '+ ' : '- '}
                                  Rs {tx.amount.toLocaleString()}
                                </span>
                              </td>

                              {/* ACTION */}
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer transition-colors"
                                  title="Delete transaction"
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
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <Landmark className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-700">No Bank Account Selected</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Add or select a bank account from the left list to manage deposits, withdrawals, and ledger transactions.
                </p>
                <button
                  onClick={() => {
                    setEditingBank(null);
                    setIsAddBankModalOpen(true);
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Bank Account
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= CASH IN HAND TAB ================= */}
      {activeMainTab === 'CASH' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                Total Cash Inflows (Sales, Withdrawals & Adjustments)
              </span>
              <span className="text-2xl font-black text-emerald-800">
                +Rs {cashInHandMetrics.totalCashIn.toLocaleString()}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                Sales: Rs {cashInHandMetrics.cashSalesTotal.toLocaleString()} | Withdrawals: Rs {cashInHandMetrics.bankWithdrawals.toLocaleString()} | Direct: Rs {cashInHandMetrics.cashAdjustmentsIn.toLocaleString()}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block mb-1">
                Total Cash Outflows (Purchases, Expenses & Deposits)
              </span>
              <span className="text-2xl font-black text-rose-800">
                -Rs {cashInHandMetrics.totalCashOut.toLocaleString()}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                Purchases: Rs {cashInHandMetrics.cashPurchasesTotal.toLocaleString()} | Expenses: Rs {cashInHandMetrics.cashExpensesTotal.toLocaleString()} | Bank Deposits: Rs {cashInHandMetrics.bankDeposits.toLocaleString()}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs bg-gradient-to-br from-white to-blue-50/40">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">
                Current Net Cash In Hand
              </span>
              <span className={`text-2xl font-black ${
                cashInHandMetrics.netCashInHand >= 0 ? 'text-blue-900' : 'text-red-700'
              }`}>
                Rs {cashInHandMetrics.netCashInHand.toLocaleString()}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Physical drawer / cash register balance
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Cash Register & Ledger Transactions
              </h3>
              <p className="text-xs text-slate-500">
                Manage direct cash inflows/outflows, bank deposits, withdrawals, and view complete audit trail
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                id="adjust-cash-btn"
                onClick={() => setIsAdjustCashModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-98"
              >
                <DollarSign className="w-4 h-4" />
                Adjust Cash / Transfer
              </button>

              <button
                onClick={() => {
                  setTxModalAction('DEPOSIT');
                  setIsTxModalOpen(true);
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Deposit Cash to Bank
              </button>

              <button
                onClick={() => {
                  setTxModalAction('WITHDRAW');
                  setIsTxModalOpen(true);
                }}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                Withdraw from Bank
              </button>
            </div>
          </div>

          {/* Cash Ledger Activity Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Recent Cash Movements ({cashHistory.length} entries)
              </span>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-600 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Particulars / Source</th>
                    <th className="py-2.5 px-4">Party / Category</th>
                    <th className="py-2.5 px-4 text-right">Cash Out (Debit)</th>
                    <th className="py-2.5 px-4 text-right">Cash In (Credit)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {cashHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Wallet className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                        <p className="text-sm font-semibold text-slate-600">No Cash Activity Found</p>
                        <p className="text-xs text-slate-400 mt-1">Make a cash sale, log cash expense, or use Adjust Cash</p>
                      </td>
                    </tr>
                  ) : (
                    cashHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          {new Date(item.date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.type === 'INVOICE' ? 'bg-emerald-100 text-emerald-800' :
                            item.type === 'WITHDRAWAL' ? 'bg-blue-100 text-blue-800' :
                            item.type === 'DEPOSIT' ? 'bg-purple-100 text-purple-800' :
                            item.type === 'EXPENSE' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-800">{item.title}</td>
                        <td className="py-2.5 px-4 text-slate-600">{item.category}</td>
                        <td className="py-2.5 px-4 text-right text-rose-600 font-black">
                          {item.debit ? `Rs ${item.debit.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-emerald-600 font-black">
                          {item.credit ? `Rs ${item.credit.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= CHEQUES TAB ================= */}
      {activeMainTab === 'CHEQUES' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Cheques Register</h2>
              <p className="text-xs text-slate-500">Track pending, cleared, and post-dated customer/supplier cheques</p>
            </div>
            <button
              onClick={() => {
                setEditingCheque(null);
                setIsChequeModalOpen(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Cheque
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by cheque #, party, bank..."
                value={chequeSearchTerm}
                onChange={(e) => setChequeSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              {(['ALL', 'PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setChequeStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chequeStatusFilter === st
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-600">
                <tr>
                  <th className="py-2.5 px-4">Cheque No</th>
                  <th className="py-2.5 px-4">Flow</th>
                  <th className="py-2.5 px-4">Party / Payee</th>
                  <th className="py-2.5 px-4">Bank Name</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4 text-right">Amount (Rs)</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCheques.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <FileCheck className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                      <p className="text-sm font-semibold text-slate-600">No Cheques Matching Filter</p>
                      <button
                        onClick={() => {
                          setEditingCheque(null);
                          setIsChequeModalOpen(true);
                        }}
                        className="mt-2 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        + Record a new cheque
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredCheques.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{c.chequeNumber}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.type === 'RECEIVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {c.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{c.partyName}</td>
                      <td className="py-3 px-4 text-slate-600">{c.bankName}</td>
                      <td className="py-3 px-4 font-mono">{c.dueDate}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        Rs {c.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          c.status === 'CLEARED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          c.status === 'BOUNCED' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {c.status === 'PENDING' && (
                            <button
                              onClick={() => handleUpdateChequeStatus(c, 'CLEARED')}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold cursor-pointer transition-colors"
                              title="Mark Cleared"
                            >
                              Clear
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingCheque(c);
                              setIsChequeModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCheque(c.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= LOANS TAB ================= */}
      {activeMainTab === 'LOANS' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Loan Accounts & Financing</h2>
              <p className="text-xs text-slate-500">Track bank SME loans, partner borrowings, and business credit lines</p>
            </div>
            <button
              onClick={() => {
                setEditingLoan(null);
                setIsLoanModalOpen(true);
              }}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Loan Account
            </button>
          </div>

          {/* Search & Filter */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search loan account or lender..."
                value={loanSearchTerm}
                onChange={(e) => setLoanSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              {(['ALL', 'BORROWED', 'LENT'] as const).map(tp => (
                <button
                  key={tp}
                  onClick={() => setLoanTypeFilter(tp)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    loanTypeFilter === tp
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tp === 'ALL' ? 'All Loans' : tp === 'BORROWED' ? 'Borrowed (Liabilities)' : 'Lent (Assets)'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLoans.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                <p className="text-sm font-semibold text-slate-600">No Loan Accounts</p>
                <button
                  onClick={() => {
                    setEditingLoan(null);
                    setIsLoanModalOpen(true);
                  }}
                  className="mt-2 text-xs font-bold text-amber-600 hover:underline cursor-pointer"
                >
                  + Add bank loan or partner borrowing
                </button>
              </div>
            ) : (
              filteredLoans.map((loan) => (
                <div key={loan.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        loan.loanType === 'BORROWED' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {loan.loanType === 'BORROWED' ? 'Liability (Borrowed)' : 'Asset (Lent)'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{loan.accountName}</h4>
                      <p className="text-xs text-slate-500">Lender: {loan.lenderName}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingLoan(loan);
                          setIsLoanModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteLoan(loan.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Principal:</span>
                      <span className="font-bold text-slate-700">Rs {loan.loanAmount.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Current Balance:</span>
                      <span className="font-black text-slate-900 text-sm">Rs {loan.currentBalance.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddBankAccountModal
        isOpen={isAddBankModalOpen}
        onClose={() => {
          setIsAddBankModalOpen(false);
          setEditingBank(null);
        }}
        onSave={handleSaveBankAccount}
        editingBank={editingBank}
      />

      <AdjustCashModal
        isOpen={isAdjustCashModalOpen}
        onClose={() => setIsAdjustCashModalOpen(false)}
        currentCashInHand={cashInHandMetrics.netCashInHand}
        bankAccounts={bankAccounts}
        onSaveCashAdjustment={handleSaveCashAdjustment}
      />

      <BankTransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        initialAction={txModalAction}
        selectedBank={selectedBank}
        bankAccounts={bankAccounts}
        onSaveTransaction={handleSaveTransaction}
      />

      {selectedBank && (
        <BankStatementModal
          isOpen={isStatementModalOpen}
          onClose={() => setIsStatementModalOpen(false)}
          bankAccount={selectedBank}
          transactions={filteredTransactions}
          startDate={startDate}
          endDate={endDate}
        />
      )}

      <ChequeModal
        isOpen={isChequeModalOpen}
        onClose={() => {
          setIsChequeModalOpen(false);
          setEditingCheque(null);
        }}
        onSave={handleSaveCheque}
        editingCheque={editingCheque}
        bankAccounts={bankAccounts}
      />

      <LoanModal
        isOpen={isLoanModalOpen}
        onClose={() => {
          setIsLoanModalOpen(false);
          setEditingLoan(null);
        }}
        onSave={handleSaveLoan}
        editingLoan={editingLoan}
        bankAccounts={bankAccounts}
      />

      {/* Confirm Delete Bank Account */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetBank)}
        title="Delete Bank Account?"
        message="Are you sure you want to delete this bank account? All linked data will be updated."
        itemName={deleteTargetBank?.accountDisplayName}
        confirmLabel="Yes, Delete Account"
        isDeleting={isDeletingBankItem}
        onConfirm={handleConfirmDeleteBank}
        onClose={() => setDeleteTargetBank(null)}
      />

      {/* Confirm Delete Bank Transaction */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetTx)}
        title="Delete Transaction?"
        message="Are you sure you want to delete this transaction? This will automatically reverse the account balance."
        itemName={deleteTargetTx ? `${deleteTargetTx.name} (Rs ${deleteTargetTx.amount.toLocaleString()})` : undefined}
        confirmLabel="Yes, Delete Transaction"
        isDeleting={isDeletingBankItem}
        onConfirm={handleConfirmDeleteTx}
        onClose={() => setDeleteTargetTx(null)}
      />

      {/* Confirm Delete Cheque */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetCheque)}
        title="Delete Cheque Record?"
        message="Are you sure you want to delete this cheque record?"
        itemName={deleteTargetCheque ? `Cheque #${deleteTargetCheque.chequeNumber} (${deleteTargetCheque.partyName} - Rs ${deleteTargetCheque.amount.toLocaleString()})` : undefined}
        confirmLabel="Yes, Delete Cheque"
        isDeleting={isDeletingBankItem}
        onConfirm={handleConfirmDeleteCheque}
        onClose={() => setDeleteTargetCheque(null)}
      />

      {/* Confirm Delete Loan */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetLoan)}
        title="Delete Loan Account?"
        message="Are you sure you want to delete this loan account record?"
        itemName={deleteTargetLoan?.accountName}
        confirmLabel="Yes, Delete Loan"
        isDeleting={isDeletingBankItem}
        onConfirm={handleConfirmDeleteLoan}
        onClose={() => setDeleteTargetLoan(null)}
      />
      </div>
    </div>
  );
};
