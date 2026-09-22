import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, Search, Receipt, MoreVertical, Filter, ArrowUpDown, 
  Printer, Share2, Edit, Trash2, Copy, FileSpreadsheet, 
  CheckCircle2, FolderPlus, DollarSign, Calendar, ChevronRight,
  TrendingDown, TrendingUp, Wallet, ShieldAlert, Sparkles
} from 'lucide-react';
import { dbExpenses, dbSuppliers } from '../lib/db';
import { Expense, ExpenseCategory, ExpenseItemMaster, Party, Supplier } from '../types';
import { 
  getStoredCategories, 
  getStoredExpenseItems, 
  saveStoredCategories, 
  saveStoredExpenseItems 
} from '../lib/expenseDefaults';
import { AddExpenseModal } from '../components/expenses/AddExpenseModal';
import { ExpensePrintModal } from '../components/expenses/ExpensePrintModal';
import { ExpenseShareModal } from '../components/expenses/ExpenseShareModal';
import { AddCategoryModal } from '../components/expenses/AddCategoryModal';
import { ConfirmDeleteModal } from '../components/common/ConfirmDeleteModal';
import { formatCurrency } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

export const Expenses: React.FC = () => {
  // Main state
  const [activeTab, setActiveTab] = useState<'CATEGORY' | 'ITEMS'>('CATEGORY');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItemMaster[]>([]);
  const [parties, setParties] = useState<(Party | Supplier)[]>([]);

  // Selection
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('Petrol');
  const [selectedItemName, setSelectedItemName] = useState<string>('');

  // Searches & Filters
  const [leftSearchTerm, setLeftSearchTerm] = useState('');
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [categorySortAsc, setCategorySortAsc] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<'All Time' | 'Today' | 'This Week' | 'This Month' | 'Custom'>('All Time');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedPrintExpense, setSelectedPrintExpense] = useState<Expense | null>(null);
  const [selectedShareExpense, setSelectedShareExpense] = useState<Expense | null>(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);

  // Active Dropdown Menu
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [activeCategoryMenuId, setActiveCategoryMenuId] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  // Support ?action=add or custom event to open Add Expense modal
  const actionParam = searchParams.get('action');
  useEffect(() => {
    if (actionParam === 'add') {
      setEditingExpense(null);
      setIsAddExpenseOpen(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action');
      setSearchParams(newParams, { replace: true });
    }

    const handleOpenExpense = () => {
      setEditingExpense(null);
      setIsAddExpenseOpen(true);
    };

    window.addEventListener('mbi-open-add-expense', handleOpenExpense);
    return () => window.removeEventListener('mbi-open-add-expense', handleOpenExpense);
  }, [actionParam]);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveActionMenuId(null);
      setActiveCategoryMenuId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Load initial data
  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('mbi-data-synced', handleSync);
    window.addEventListener('mbi-local-db-change', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('mbi-data-synced', handleSync);
      window.removeEventListener('mbi-local-db-change', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const loadData = async () => {
    const allExpenses = await dbExpenses.getAll();
    allExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setExpenses(allExpenses);

    const loadedCats = getStoredCategories();
    setCategories(loadedCats);

    const loadedItems = getStoredExpenseItems();
    setExpenseItems(loadedItems);

    const loadedSuppliers = await dbSuppliers.getAll();
    setParties(loadedSuppliers);

    if (loadedCats.length > 0 && !selectedCategoryName) {
      setSelectedCategoryName(loadedCats[0].name);
    }
    if (loadedItems.length > 0 && !selectedItemName) {
      setSelectedItemName(loadedItems[0].name);
    }
  };

  // Category amounts map
  const categoryAmounts = useMemo(() => {
    const map: Record<string, { total: number; count: number; balance: number }> = {};
    categories.forEach(c => {
      map[c.name] = { total: 0, count: 0, balance: 0 };
    });

    expenses.forEach(e => {
      if (!map[e.category]) {
        map[e.category] = { total: 0, count: 0, balance: 0 };
      }
      map[e.category].total += Number(e.amount) || 0;
      map[e.category].count += 1;
      map[e.category].balance += Number(e.balanceDue) || 0;
    });

    return map;
  }, [categories, expenses]);

  // Item amounts map
  const itemAmounts = useMemo(() => {
    const map: Record<string, { total: number; qty: number; count: number }> = {};
    expenseItems.forEach(it => {
      map[it.name] = { total: 0, qty: 0, count: 0 };
    });

    expenses.forEach(e => {
      if (e.items && e.items.length > 0) {
        e.items.forEach(it => {
          const name = it.name || e.category;
          if (!map[name]) {
            map[name] = { total: 0, qty: 0, count: 0 };
          }
          map[name].total += Number(it.amount) || 0;
          map[name].qty += Number(it.quantity) || 0;
          map[name].count += 1;
        });
      } else {
        const name = e.category;
        if (!map[name]) {
          map[name] = { total: 0, qty: 0, count: 0 };
        }
        map[name].total += Number(e.amount) || 0;
        map[name].qty += 1;
        map[name].count += 1;
      }
    });

    return map;
  }, [expenseItems, expenses]);

  // Filtered categories for left sidebar
  const filteredCategories = useMemo(() => {
    return categories
      .filter(c => c.name.toLowerCase().includes(leftSearchTerm.toLowerCase()))
      .sort((a, b) => {
        if (categorySortAsc) {
          return a.name.localeCompare(b.name);
        } else {
          return b.name.localeCompare(a.name);
        }
      });
  }, [categories, leftSearchTerm, categorySortAsc]);

  // Filtered expense items for left sidebar (when ITEMS tab active)
  const filteredItems = useMemo(() => {
    return expenseItems
      .filter(it => it.name.toLowerCase().includes(leftSearchTerm.toLowerCase()) || it.category.toLowerCase().includes(leftSearchTerm.toLowerCase()))
      .sort((a, b) => {
        if (categorySortAsc) {
          return a.name.localeCompare(b.name);
        } else {
          return b.name.localeCompare(a.name);
        }
      });
  }, [expenseItems, leftSearchTerm, categorySortAsc]);

  // Selected Category Info
  const currentCategoryInfo = useMemo(() => {
    return categories.find(c => c.name.toLowerCase() === selectedCategoryName.toLowerCase()) || {
      id: 'cat-custom',
      name: selectedCategoryName || 'General',
      type: 'Direct Expense' as const,
      description: 'Custom expense category'
    };
  }, [categories, selectedCategoryName]);

  // Filtered Transactions for Right Table
  const filteredTransactions = useMemo(() => {
    return expenses.filter(exp => {
      // 1. Tab & Category/Item filter
      if (activeTab === 'CATEGORY') {
        if (selectedCategoryName && exp.category.toLowerCase() !== selectedCategoryName.toLowerCase()) {
          return false;
        }
      } else {
        if (selectedItemName) {
          const hasItem = exp.items?.some(i => i.name.toLowerCase() === selectedItemName.toLowerCase()) || 
                          exp.category.toLowerCase() === selectedItemName.toLowerCase();
          if (!hasItem) return false;
        }
      }

      // 2. Search filter
      if (tableSearchTerm.trim()) {
        const query = tableSearchTerm.toLowerCase();
        const matchExpNo = (exp.expenseNumber || '').toLowerCase().includes(query);
        const matchParty = (exp.partyName || '').toLowerCase().includes(query);
        const matchDesc = (exp.description || '').toLowerCase().includes(query);
        const matchPayment = (exp.paymentType || '').toLowerCase().includes(query);
        const matchItem = exp.items?.some(i => i.name.toLowerCase().includes(query));
        if (!matchExpNo && !matchParty && !matchDesc && !matchPayment && !matchItem) {
          return false;
        }
      }

      // 3. Date period filter
      if (periodFilter !== 'All Time') {
        const expDate = new Date(exp.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (periodFilter === 'Today') {
          const d = new Date(expDate);
          d.setHours(0, 0, 0, 0);
          if (d.getTime() !== today.getTime()) return false;
        } else if (periodFilter === 'This Week') {
          const firstDay = new Date(today);
          firstDay.setDate(today.getDate() - today.getDay());
          if (expDate < firstDay) return false;
        } else if (periodFilter === 'This Month') {
          if (expDate.getMonth() !== today.getMonth() || expDate.getFullYear() !== today.getFullYear()) {
            return false;
          }
        } else if (periodFilter === 'Custom') {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (expDate < start || expDate > end) return false;
        }
      }

      return true;
    });
  }, [expenses, activeTab, selectedCategoryName, selectedItemName, tableSearchTerm, periodFilter, startDate, endDate]);

  // Selected Category / Item summary stats
  const rightPanelStats = useMemo(() => {
    const total = filteredTransactions.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const balance = filteredTransactions.reduce((sum, e) => sum + (Number(e.balanceDue) || 0), 0);
    const cash = filteredTransactions.filter(e => e.paymentType === 'Cash' || !e.paymentType).reduce((sum, e) => sum + (Number(e.paidAmount) || Number(e.amount) || 0), 0);
    const bank = Math.max(0, total - balance - cash);

    return { total, balance, cash, bank };
  }, [filteredTransactions]);

  // Global Expense Stats (Top metrics)
  const globalStats = useMemo(() => {
    const totalAll = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const directTotal = expenses.filter(e => e.expenseType === 'Direct Expense' || !e.expenseType).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const indirectTotal = expenses.filter(e => e.expenseType === 'Indirect Expense').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalDue = expenses.reduce((sum, e) => sum + (Number(e.balanceDue) || 0), 0);

    return { totalAll, directTotal, indirectTotal, totalDue };
  }, [expenses]);

  // Save Expense Handler
  const handleSaveExpense = async (savedExpense: Expense, andNew = false) => {
    await dbExpenses.save(savedExpense);
    await loadData();
    showToast(`Expense #${savedExpense.expenseNumber || 'EXP'} (${savedExpense.category}) saved successfully!`);
    
    // Make sure the category of this expense is selected so user sees it
    setSelectedCategoryName(savedExpense.category);

    if (!andNew) {
      setIsAddExpenseOpen(false);
      setEditingExpense(null);
    }
  };

  // Delete State
  const [deleteTargetExpense, setDeleteTargetExpense] = useState<Expense | null>(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [deleteTargetCategory, setDeleteTargetCategory] = useState<string | null>(null);

  // Delete Expense Handler
  const handleDeleteExpense = (exp: Expense) => {
    setDeleteTargetExpense(exp);
    setActiveActionMenuId(null);
  };

  const handleConfirmDeleteExpense = async () => {
    if (!deleteTargetExpense) return;
    setIsDeletingExpense(true);
    try {
      await dbExpenses.delete(deleteTargetExpense.id);
      await loadData();
      showToast(`Expense #${deleteTargetExpense.expenseNumber || 'EXP'} deleted.`);
      setDeleteTargetExpense(null);
    } catch (err) {
      console.error('Failed to delete expense:', err);
      showToast('Error deleting expense.');
    } finally {
      setIsDeletingExpense(false);
    }
  };

  // Duplicate Expense Handler
  const handleDuplicateExpense = async (exp: Expense) => {
    const nextNum = (Math.max(...expenses.map(e => parseInt(e.expenseNumber?.replace(/\D/g, '') || '0')), 0) + 1).toString();
    const duplicated: Expense = {
      ...exp,
      id: uuidv4(),
      expenseNumber: nextNum,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await dbExpenses.save(duplicated);
    await loadData();
    showToast(`Expense duplicated as #${nextNum}`);
    setActiveActionMenuId(null);
  };

  // Category Save / Delete
  const handleSaveCategory = (cat: ExpenseCategory) => {
    let updated: ExpenseCategory[];
    const exists = categories.some(c => c.id === cat.id);
    if (exists) {
      updated = categories.map(c => c.id === cat.id ? cat : c);
    } else {
      updated = [...categories, cat];
    }
    setCategories(updated);
    saveStoredCategories(updated);
    setSelectedCategoryName(cat.name);
    showToast(`Category "${cat.name}" saved!`);
  };

  const handleDeleteCategory = (catName: string) => {
    setDeleteTargetCategory(catName);
  };

  const handleConfirmDeleteCategory = () => {
    if (!deleteTargetCategory) return;
    const catName = deleteTargetCategory;
    const updated = categories.filter(c => c.name !== catName);
    setCategories(updated);
    saveStoredCategories(updated);
    if (selectedCategoryName === catName && updated.length > 0) {
      setSelectedCategoryName(updated[0].name);
    }
    showToast(`Category "${catName}" deleted.`);
    setDeleteTargetCategory(null);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      const exportData = filteredTransactions.map((e, idx) => ({
        'Sr #': idx + 1,
        'Date': e.date ? e.date.slice(0, 10) : '',
        'Expense Voucher #': e.expenseNumber || '',
        'Category': e.category,
        'Expense Type': e.expenseType || 'Direct Expense',
        'Paid To / Party': e.partyName || '-',
        'Payment Mode': e.paymentType || 'Cash',
        'Total Amount (PKR)': e.amount,
        'Paid Amount (PKR)': e.paidAmount !== undefined ? e.paidAmount : e.amount,
        'Balance Due (PKR)': e.balanceDue || 0,
        'Remarks': e.description || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${selectedCategoryName || 'Expenses'}_Ledger`);
      XLSX.writeFile(wb, `Expenses_${(selectedCategoryName || 'All').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast('Excel report downloaded successfully!');
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('Error exporting Excel report.');
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER TABS: CATEGORY | ITEMS (Matching Screenshot 3) */}
      <div className="bg-white border-b-2 border-slate-200 rounded-t-xl shadow-xs overflow-hidden">
        <div className="flex items-center">
          
          <button
            onClick={() => setActiveTab('CATEGORY')}
            className={`flex-1 py-3 text-center text-sm font-extrabold uppercase tracking-wider transition-all relative ${
              activeTab === 'CATEGORY'
                ? 'text-[#1e293b] border-b-2 border-[#0070f3] bg-blue-50/20'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            CATEGORY
            {activeTab === 'CATEGORY' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0070f3]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('ITEMS')}
            className={`flex-1 py-3 text-center text-sm font-extrabold uppercase tracking-wider transition-all relative ${
              activeTab === 'ITEMS'
                ? 'text-[#1e293b] border-b-2 border-[#0070f3] bg-blue-50/20'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            ITEMS
            {activeTab === 'ITEMS' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0070f3]" />
            )}
          </button>

        </div>
      </div>

      {/* MASTER-DETAIL SPLIT CONTAINER (Matching Screenshot 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* LEFT PANEL: CATEGORIES / ITEMS LIST (Matching Screenshot 3) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col min-h-[640px]">
          
          {/* Top Controls: Search + Add Expense Red Pill Button */}
          <div className="p-3.5 border-b border-slate-200 space-y-3 bg-white">
            
            <div className="flex items-center gap-2">
              
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={leftSearchTerm}
                  onChange={(e) => setLeftSearchTerm(e.target.value)}
                  placeholder={activeTab === 'CATEGORY' ? 'Search categories...' : 'Search items...'}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* High-Contrast Accessible Button: + Add Expense */}
              <button
                onClick={() => {
                  setEditingExpense(null);
                  setIsAddExpenseOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add Expense</span>
              </button>

            </div>

          </div>

          {/* List Table Header: ↑ CATEGORY | AMOUNT */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-[11px] font-bold text-slate-600 select-none">
            <button
              onClick={() => setCategorySortAsc(!categorySortAsc)}
              className="flex items-center gap-1 hover:text-slate-900 transition-colors uppercase"
            >
              <span>{categorySortAsc ? '↑' : '↓'} {activeTab === 'CATEGORY' ? 'CATEGORY' : 'ITEM'}</span>
            </button>
            <span className="uppercase">AMOUNT</span>
          </div>

          {/* List Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[520px]">
            {activeTab === 'CATEGORY' ? (
              filteredCategories.map((cat) => {
                const isSelected = selectedCategoryName.toLowerCase() === cat.name.toLowerCase();
                const amtData = categoryAmounts[cat.name] || { total: 0, count: 0 };
                const isMenuOpen = activeCategoryMenuId === cat.id;

                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategoryName(cat.name)}
                    className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors group relative ${
                      isSelected
                        ? 'bg-[#e0f2fe] text-blue-950 font-bold border-l-4 border-blue-600'
                        : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="truncate text-xs">{cat.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {amtData.total > 0 ? amtData.total.toLocaleString() : '0'}
                      </span>

                      {/* 3-dots Menu for category */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setActiveCategoryMenuId(isMenuOpen ? null : cat.id)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {isMenuOpen && (
                          <div className="absolute right-0 top-6 z-30 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-44 text-xs font-normal text-slate-700 animate-in fade-in zoom-in-95 duration-100">
                            <button
                              onClick={() => {
                                setEditingCategory(cat);
                                setIsAddCategoryOpen(true);
                                setActiveCategoryMenuId(null);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Edit className="w-3.5 h-3.5 text-blue-600" />
                              <span>Edit Category</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingExpense(null);
                                setIsAddExpenseOpen(true);
                                setActiveCategoryMenuId(null);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Add Expense</span>
                            </button>
                            {!cat.isDefault && (
                              <button
                                onClick={() => {
                                  handleDeleteCategory(cat.name);
                                  setActiveCategoryMenuId(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 border-t border-slate-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Category</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedItemName.toLowerCase() === item.name.toLowerCase();
                const amtData = itemAmounts[item.name] || { total: 0, qty: 0 };

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemName(item.name)}
                    className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors group ${
                      isSelected
                        ? 'bg-[#e0f2fe] text-blue-950 font-bold border-l-4 border-blue-600'
                        : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate text-xs font-bold text-slate-900">{item.name}</span>
                      <span className="text-[10px] text-slate-500 font-normal">{item.category}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {amtData.total > 0 ? amtData.total.toLocaleString() : '0'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom helper button to add custom category / item */}
          <div className="p-3 bg-slate-50 border-t border-slate-200">
            <button
              onClick={() => {
                setEditingCategory(null);
                setIsAddCategoryOpen(true);
              }}
              className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-blue-600" />
              <span>+ Create New Category</span>
            </button>
          </div>

        </div>

        {/* RIGHT PANEL: SELECTED CATEGORY TRANSACTIONS (Matching Screenshot 3) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* HEADER CARD: Category Title + Direct/Indirect Type + Stats (Matching Screenshot 3) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            {/* Left Title */}
            <div>
              <h2 className="text-base font-black tracking-wide text-slate-900 uppercase">
                {activeTab === 'CATEGORY' ? selectedCategoryName : selectedItemName}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-600 font-semibold">
                  {currentCategoryInfo.type}
                </span>
                {currentCategoryInfo.description && (
                  <span className="text-xs text-slate-400 hidden md:inline">
                    • {currentCategoryInfo.description}
                  </span>
                )}
              </div>
            </div>

            {/* Right Totals (Matching Screenshot 3: Total : Rs 1000.00 | Balance : Rs 0.00) */}
            <div className="flex flex-wrap items-center gap-6 sm:text-right">
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Total</div>
                <div className="text-base font-black text-rose-600 font-mono">
                  Rs {rightPanelStats.total.toFixed(2)}
                </div>
              </div>

              <div className="border-l border-slate-200 pl-6">
                <div className="text-[11px] text-slate-500 font-medium">Balance</div>
                <div className="text-base font-black text-slate-900 font-mono">
                  Rs {rightPanelStats.balance.toFixed(2)}
                </div>
              </div>
            </div>

          </div>

          {/* FILTER & SEARCH BAR (Matching Screenshot 3) */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
            
            {/* Search Input inside transactions */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearchTerm}
                onChange={(e) => setTableSearchTerm(e.target.value)}
                placeholder="Search transactions..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            {/* Right Action Tools: Date filter + Excel Export */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Period Dropdown */}
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer focus:outline-none"
              >
                <option value="All Time">All Time</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="Custom">Custom Range</option>
              </select>

              {periodFilter === 'Custom' && (
                <div className="flex items-center gap-1.5 text-xs">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 font-mono text-xs"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 font-mono text-xs"
                  />
                </div>
              )}

              {/* Excel Export Button */}
              <button
                onClick={handleExportExcel}
                title="Download Excel Report"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 text-xs font-bold rounded-lg transition-colors shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export</span>
              </button>

            </div>

          </div>

          {/* TRANSACTIONS TABLE (Matching Screenshot 3) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                
                {/* Header matching Screenshot 3 with filter icons */}
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    
                    <th className="p-3 border-r border-slate-200 min-w-[110px]">
                      <div className="flex items-center justify-between">
                        <span>DATE</span>
                        <Filter className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>

                    <th className="p-3 border-r border-slate-200 min-w-[100px]">
                      <div className="flex items-center justify-between">
                        <span>EXP NO.</span>
                        <Filter className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>

                    <th className="p-3 border-r border-slate-200 min-w-[140px]">
                      <div className="flex items-center justify-between">
                        <span>PARTY</span>
                        <Filter className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>

                    <th className="p-3 border-r border-slate-200 min-w-[120px]">
                      <div className="flex items-center justify-between">
                        <span>PAYMENT T...</span>
                        <Filter className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>

                    <th className="p-3 border-r border-slate-200 text-right min-w-[110px]">
                      <div className="flex items-center justify-end gap-1">
                        <span>AMOUNT</span>
                        <Filter className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>

                    <th className="p-3 border-r border-slate-200 text-right min-w-[100px]">
                      <div className="flex items-center justify-end gap-1">
                        <span>BALANCE</span>
                        <Filter className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>

                    <th className="p-3 text-center w-12">
                      <span>•••</span>
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((exp) => {
                      const isMenuOpen = activeActionMenuId === exp.id;
                      const dateStr = exp.date ? new Date(exp.date).toLocaleDateString('en-GB') : '-';

                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors group">
                          
                          {/* DATE */}
                          <td className="p-3 font-mono text-slate-800 border-r border-slate-100 whitespace-nowrap">
                            {dateStr}
                          </td>

                          {/* EXP NO */}
                          <td className="p-3 font-mono font-bold text-blue-700 border-r border-slate-100">
                            {exp.expenseNumber || 'EXP'}
                          </td>

                          {/* PARTY */}
                          <td className="p-3 text-slate-800 border-r border-slate-100 font-medium truncate max-w-[160px]">
                            {exp.partyName || '-'}
                          </td>

                          {/* PAYMENT TYPE */}
                          <td className="p-3 border-r border-slate-100">
                            <span className="font-semibold text-slate-700">
                              {exp.paymentType || 'Cash'}
                            </span>
                          </td>

                          {/* AMOUNT */}
                          <td className="p-3 text-right font-mono font-bold text-slate-900 border-r border-slate-100">
                            {exp.amount.toLocaleString()}
                          </td>

                          {/* BALANCE */}
                          <td className="p-3 text-right font-mono text-slate-600 border-r border-slate-100">
                            {exp.balanceDue ? exp.balanceDue.toLocaleString() : '0'}
                          </td>

                          {/* ACTION 3-DOTS */}
                          <td className="p-3 text-center relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setActiveActionMenuId(isMenuOpen ? null : exp.id)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-800 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-2 top-8 z-30 bg-white border border-slate-200 rounded-xl shadow-2xl py-1.5 w-48 text-xs font-semibold text-slate-700 animate-in fade-in zoom-in-95 duration-100">
                                
                                <button
                                  onClick={() => {
                                    setSelectedPrintExpense(exp);
                                    setActiveActionMenuId(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"
                                >
                                  <Printer className="w-4 h-4 text-blue-600" />
                                  <span>Print Voucher</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedShareExpense(exp);
                                    setActiveActionMenuId(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"
                                >
                                  <Share2 className="w-4 h-4 text-emerald-600" />
                                  <span>Share Voucher</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingExpense(exp);
                                    setIsAddExpenseOpen(true);
                                    setActiveActionMenuId(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"
                                >
                                  <Edit className="w-4 h-4 text-amber-600" />
                                  <span>Edit Expense</span>
                                </button>

                                <button
                                  onClick={() => handleDuplicateExpense(exp)}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"
                                >
                                  <Copy className="w-4 h-4 text-purple-600" />
                                  <span>Duplicate</span>
                                </button>

                                <div className="my-1 border-t border-slate-100" />

                                <button
                                  onClick={() => handleDeleteExpense(exp)}
                                  className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2.5"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete Expense</span>
                                </button>

                              </div>
                            )}

                          </td>

                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                        <p className="text-sm font-bold text-slate-600">No expense vouchers in {selectedCategoryName}</p>
                        <p className="text-xs text-slate-400 mt-1">Click below to record your first expense voucher</p>
                        <button
                          onClick={() => {
                            setEditingExpense(null);
                            setIsAddExpenseOpen(true);
                          }}
                          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Expense in {selectedCategoryName}</span>
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>

              </table>
            </div>
          </div>

          {/* QUICK SUMMARY METRIC FOOTER (Advanced Analytics) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Total Expenses</div>
              <div className="text-sm font-black font-mono text-slate-900 mt-0.5">
                {formatCurrency(globalStats.totalAll)}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <div className="text-[11px] font-bold text-blue-600 uppercase">Direct Expenses</div>
              <div className="text-sm font-black font-mono text-blue-900 mt-0.5">
                {formatCurrency(globalStats.directTotal)}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <div className="text-[11px] font-bold text-purple-600 uppercase">Indirect Expenses</div>
              <div className="text-sm font-black font-mono text-purple-900 mt-0.5">
                {formatCurrency(globalStats.indirectTotal)}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <div className="text-[11px] font-bold text-rose-600 uppercase">Total Balance Due</div>
              <div className="text-sm font-black font-mono text-rose-600 mt-0.5">
                {formatCurrency(globalStats.totalDue)}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ADD / EDIT EXPENSE MODAL (Matching Screenshots 1 & 2) */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        editExpense={editingExpense}
        parties={parties}
        existingExpenses={expenses}
      />

      {/* PRINT VOUCHER MODAL */}
      <ExpensePrintModal
        isOpen={Boolean(selectedPrintExpense)}
        onClose={() => setSelectedPrintExpense(null)}
        expense={selectedPrintExpense}
      />

      {/* SHARE MODAL */}
      <ExpenseShareModal
        isOpen={Boolean(selectedShareExpense)}
        onClose={() => setSelectedShareExpense(null)}
        expense={selectedShareExpense}
      />

      {/* ADD / EDIT CATEGORY MODAL */}
      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => {
          setIsAddCategoryOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
        editCategory={editingCategory}
      />

      {/* Confirm Delete Expense Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetExpense)}
        title="Delete Expense Entry?"
        message="Are you sure you want to permanently delete this expense record? This will adjust your expense summaries and cannot be undone."
        itemName={deleteTargetExpense ? `Expense #${deleteTargetExpense.expenseNumber || 'EXP'} (${deleteTargetExpense.category} - Rs ${deleteTargetExpense.amount.toLocaleString()})` : undefined}
        confirmLabel="Yes, Delete Expense"
        isDeleting={isDeletingExpense}
        onConfirm={handleConfirmDeleteExpense}
        onClose={() => setDeleteTargetExpense(null)}
      />

      {/* Confirm Delete Category Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetCategory)}
        title="Delete Expense Category?"
        message="Are you sure you want to delete this category? Existing expense transactions under this category will be preserved."
        itemName={deleteTargetCategory || undefined}
        confirmLabel="Yes, Delete Category"
        onConfirm={handleConfirmDeleteCategory}
        onClose={() => setDeleteTargetCategory(null)}
      />

    </div>
  );
};
