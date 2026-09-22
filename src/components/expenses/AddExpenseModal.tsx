import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Trash2, Calculator, Settings, Image as ImageIcon, 
  FileText, Check, ChevronDown, Calendar, User, Tag, 
  Paperclip, ArrowRight, AlertCircle
} from 'lucide-react';
import { Expense, ExpenseCategory, ExpenseItem, Party, Supplier } from '../../types';
import { getStoredCategories, getStoredExpenseItems, saveStoredCategories } from '../../lib/expenseDefaults';
import { ExpenseCalculatorModal } from './ExpenseCalculatorModal';
import { AddCategoryModal } from './AddCategoryModal';
import { formatCurrency } from '../../lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Expense, andNew?: boolean) => Promise<void>;
  editExpense?: Expense | null;
  parties?: (Party | Supplier)[];
  existingExpenses?: Expense[];
}

interface ExpenseTab {
  id: string;
  title: string;
  category: string;
  expenseType: 'Direct Expense' | 'Indirect Expense';
  expenseNumber: string;
  date: string;
  partyName: string;
  paymentType: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Credit';
  items: ExpenseItem[];
  roundOff: number;
  isRoundOffEnabled: boolean;
  description: string;
  isDescriptionOpen: boolean;
  imageAttachment: string;
  paidAmount: number;
}

export const AddExpenseModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  editExpense,
  parties = [],
  existingExpenses = []
}) => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenseItemMasters, setExpenseItemMasters] = useState(getStoredExpenseItems());
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [activeItemIndexForCalc, setActiveItemIndexForCalc] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to generate next expense voucher number
  const getNextExpenseNumber = (offset = 0) => {
    const nums = existingExpenses.map(e => {
      const n = parseInt((e.expenseNumber || '').replace(/\D/g, '') || '0');
      return isNaN(n) ? 0 : n;
    });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return (max + 1 + offset).toString();
  };

  const createInitialTab = (index: number): ExpenseTab => {
    const defaultCat = 'Petrol';
    return {
      id: uuidv4(),
      title: `Expense #${index + 1}`,
      category: defaultCat,
      expenseType: 'Direct Expense',
      expenseNumber: getNextExpenseNumber(index),
      date: new Date().toISOString().slice(0, 10),
      partyName: '',
      paymentType: 'Cash',
      items: [
        { id: uuidv4(), name: '', quantity: 1, pricePerUnit: 0, amount: 0 }
      ],
      roundOff: 0,
      isRoundOffEnabled: true,
      description: '',
      isDescriptionOpen: false,
      imageAttachment: '',
      paidAmount: 0
    };
  };

  const [tabs, setTabs] = useState<ExpenseTab[]>([createInitialTab(0)]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);

  // Load Categories on mount
  useEffect(() => {
    setCategories(getStoredCategories());
    setExpenseItemMasters(getStoredExpenseItems());
  }, [isOpen]);

  // Populate when editing
  useEffect(() => {
    if (editExpense && isOpen) {
      const editTab: ExpenseTab = {
        id: editExpense.id,
        title: `Expense #${editExpense.expenseNumber || '1'}`,
        category: editExpense.category || 'Petrol',
        expenseType: editExpense.expenseType || 'Direct Expense',
        expenseNumber: editExpense.expenseNumber || '1',
        date: editExpense.date ? editExpense.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        partyName: editExpense.partyName || '',
        paymentType: editExpense.paymentType || 'Cash',
        items: editExpense.items && editExpense.items.length > 0 
          ? editExpense.items 
          : [{ id: uuidv4(), name: editExpense.category, quantity: 1, pricePerUnit: editExpense.amount, amount: editExpense.amount }],
        roundOff: editExpense.roundOff || 0,
        isRoundOffEnabled: true,
        description: editExpense.description || '',
        isDescriptionOpen: Boolean(editExpense.description),
        imageAttachment: editExpense.imageAttachment || '',
        paidAmount: editExpense.paidAmount !== undefined ? editExpense.paidAmount : editExpense.amount
      };
      setTabs([editTab]);
      setActiveTabId(editTab.id);
    } else if (!editExpense && isOpen) {
      const initial = createInitialTab(0);
      setTabs([initial]);
      setActiveTabId(initial.id);
    }
  }, [editExpense, isOpen]);

  const currentTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateCurrentTab = (updates: Partial<ExpenseTab>) => {
    setTabs(prev => prev.map(tab => tab.id === activeTabId ? { ...tab, ...updates } : tab));
  };

  if (!isOpen || !currentTab) return null;

  // Add new tab (Expense #2, #3, etc.)
  const handleAddNewTab = () => {
    const newTab = createInitialTab(tabs.length);
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  // Close a tab
  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      onClose();
      return;
    }
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  // Item Table Handlers
  const handleAddItemRow = () => {
    const newRow: ExpenseItem = {
      id: uuidv4(),
      name: '',
      quantity: 1,
      pricePerUnit: 0,
      amount: 0
    };
    updateCurrentTab({ items: [...currentTab.items, newRow] });
  };

  const handleRemoveItemRow = (index: number) => {
    if (currentTab.items.length <= 1) {
      updateCurrentTab({
        items: [{ id: uuidv4(), name: '', quantity: 1, pricePerUnit: 0, amount: 0 }]
      });
      return;
    }
    const updated = currentTab.items.filter((_, i) => i !== index);
    updateCurrentTab({ items: updated });
  };

  const handleItemChange = (index: number, field: keyof ExpenseItem, value: any) => {
    const updated = [...currentTab.items];
    const item = { ...updated[index], [field]: value };

    if (field === 'quantity' || field === 'pricePerUnit') {
      const qty = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
      const price = field === 'pricePerUnit' ? parseFloat(value) || 0 : item.pricePerUnit;
      item.amount = Math.round(qty * price * 100) / 100;
    }

    if (field === 'amount') {
      const amt = parseFloat(value) || 0;
      if (item.quantity > 0) {
        item.pricePerUnit = Math.round((amt / item.quantity) * 100) / 100;
      }
    }

    updated[index] = item;
    updateCurrentTab({ items: updated });
  };

  // Autocomplete item selection
  const handleSelectItemSuggestion = (index: number, masterName: string) => {
    const found = expenseItemMasters.find(m => m.name === masterName);
    const updated = [...currentTab.items];
    updated[index] = {
      ...updated[index],
      name: masterName,
      pricePerUnit: found?.defaultPrice || updated[index].pricePerUnit || 0,
      amount: (updated[index].quantity || 1) * (found?.defaultPrice || updated[index].pricePerUnit || 0)
    };
    if (found && found.category) {
      updateCurrentTab({ items: updated, category: found.category });
    } else {
      updateCurrentTab({ items: updated });
    }
  };

  // Calculations
  const totalQty = currentTab.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const subTotal = currentTab.items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  
  // Calculate roundOff
  const calculatedRoundOff = currentTab.isRoundOffEnabled ? Math.round(subTotal) - subTotal : 0;
  const grandTotal = currentTab.isRoundOffEnabled ? Math.round(subTotal) : subTotal;

  // Handle Category Change
  const handleCategorySelect = (catName: string) => {
    if (catName === '__ADD_NEW__') {
      setIsAddCategoryOpen(true);
      return;
    }
    const cat = categories.find(c => c.name === catName);
    updateCurrentTab({
      category: catName,
      expenseType: cat?.type || 'Direct Expense'
    });
  };

  // Handle Category Save from quick modal
  const handleSaveNewCategory = (newCat: ExpenseCategory) => {
    const updated = [...categories, newCat];
    setCategories(updated);
    saveStoredCategories(updated);
    updateCurrentTab({
      category: newCat.name,
      expenseType: newCat.type
    });
  };

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateCurrentTab({ imageAttachment: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Expense
  const handleSave = async (andNew = false) => {
    if (!currentTab.category) {
      alert('Please select an Expense Category.');
      return;
    }

    if (grandTotal <= 0 && currentTab.items.every(i => !i.name && i.amount === 0)) {
      alert('Please enter at least one item or an expense amount.');
      return;
    }

    const cleanedItems = currentTab.items.filter(it => it.name.trim() || it.amount > 0);
    const finalItems = cleanedItems.length > 0 ? cleanedItems : [
      { id: uuidv4(), name: currentTab.category, quantity: 1, pricePerUnit: grandTotal, amount: grandTotal }
    ];

    const expenseRecord: Expense = {
      id: editExpense ? editExpense.id : currentTab.id,
      expenseNumber: currentTab.expenseNumber || getNextExpenseNumber(),
      category: currentTab.category,
      expenseType: currentTab.expenseType,
      amount: grandTotal,
      subTotal,
      roundOff: calculatedRoundOff,
      paidAmount: currentTab.paymentType === 'Credit' ? currentTab.paidAmount : grandTotal,
      balanceDue: currentTab.paymentType === 'Credit' ? Math.max(0, grandTotal - currentTab.paidAmount) : 0,
      paymentType: currentTab.paymentType,
      partyName: currentTab.partyName || undefined,
      items: finalItems,
      date: new Date(currentTab.date).toISOString(),
      description: currentTab.description || '',
      imageAttachment: currentTab.imageAttachment || undefined,
      userId: '1',
      createdAt: editExpense ? editExpense.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await onSave(expenseRecord, andNew);

    if (andNew) {
      // Reset current tab with next number
      const nextNum = (parseInt(currentTab.expenseNumber.replace(/\D/g, '') || '0') + 1).toString();
      updateCurrentTab({
        id: uuidv4(),
        expenseNumber: nextNum,
        title: `Expense #${tabs.length + 1}`,
        items: [{ id: uuidv4(), name: '', quantity: 1, pricePerUnit: 0, amount: 0 }],
        description: '',
        imageAttachment: '',
        partyName: ''
      });
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl flex flex-col max-h-[96vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* TOP WINDOW TAB STRIP (Matching Screenshot 1 & 2) */}
        <div className="bg-[#f1f5f9] border-b border-slate-300 px-3 pt-2 pb-0 flex items-center justify-between select-none">
          
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-bold border-t border-x transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white border-slate-300 text-slate-900 shadow-xs border-b-white z-10 -mb-[1px]'
                      : 'bg-slate-200/80 border-transparent text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{tab.title}</span>
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    className="p-0.5 hover:bg-slate-300 rounded text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {/* Add Tab Button */}
            <button
              type="button"
              onClick={handleAddNewTab}
              title="Add another expense tab"
              className="p-1.5 ml-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Window Action Tools */}
          <div className="flex items-center gap-2 text-slate-500 pb-1.5">
            <button
              type="button"
              onClick={() => setIsCalculatorOpen(true)}
              title="Open Quick Calculator"
              className="p-1.5 hover:bg-slate-200 rounded-md text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Calculator className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsAddCategoryOpen(true)}
              title="Manage Categories"
              className="p-1.5 hover:bg-slate-200 rounded-md text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-slate-300 mx-1" />
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="p-1.5 hover:bg-rose-100 hover:text-rose-600 rounded-md text-slate-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MODAL TITLE HEADER */}
        <div className="bg-white px-6 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {editExpense ? 'Edit Expense' : 'Expense'}
          </h2>
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
            currentTab.expenseType === 'Direct Expense' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
          }`}>
            {currentTab.expenseType}
          </span>
        </div>

        {/* MODAL MAIN FORM BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* TOP FORM FIELDS (Category, Expense No, Date, Party) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            
            {/* Expense Category Dropdown (Left, matching Screenshot 2) */}
            <div className="md:col-span-6 space-y-1">
              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-1.5 text-[11px] font-bold text-slate-600 z-10">
                  Expense Category<span className="text-rose-500">*</span>
                </label>
                <select
                  value={currentTab.category}
                  onChange={(e) => handleCategorySelect(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name} ({cat.type})
                    </option>
                  ))}
                  <option value="__ADD_NEW__" className="text-blue-600 font-bold bg-blue-50">
                    + Add New Category...
                  </option>
                </select>
              </div>

              {/* Optional Party / Paid To */}
              <div className="pt-2">
                <input
                  type="text"
                  value={currentTab.partyName}
                  onChange={(e) => updateCurrentTab({ partyName: e.target.value })}
                  placeholder="Paid To / Vendor / Staff Name (Optional, e.g. PSO Petrol, Ali Helper)"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
              </div>
            </div>

            {/* Expense No & Date (Right, matching Screenshot 2) */}
            <div className="md:col-span-6 flex flex-col sm:flex-row items-center justify-end gap-4">
              
              {/* Expense No */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Expense No</span>
                <input
                  type="text"
                  value={currentTab.expenseNumber}
                  onChange={(e) => updateCurrentTab({ expenseNumber: e.target.value })}
                  className="w-full sm:w-36 bg-white border border-blue-400 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
              </div>

              {/* Date */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Date</span>
                <div className="relative w-full sm:w-auto">
                  <input
                    type="date"
                    value={currentTab.date}
                    onChange={(e) => updateCurrentTab({ date: e.target.value })}
                    className="w-full sm:w-36 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer"
                  />
                </div>
              </div>

            </div>

          </div>

          {/* LINE ITEMS TABLE (Matching Screenshot 1 & 2) */}
          <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-300 text-center">
                    <th className="p-2.5 w-12 border-r border-slate-300">#</th>
                    <th className="p-2.5 text-left border-r border-slate-300 min-w-[240px]">ITEM</th>
                    <th className="p-2.5 w-24 border-r border-slate-300">QTY</th>
                    <th className="p-2.5 w-32 border-r border-slate-300">PRICE/UNIT</th>
                    <th className="p-2.5 w-36">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {currentTab.items.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-slate-50/80 group">
                      
                      {/* Row # / Actions */}
                      <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200 relative">
                        <span className="group-hover:hidden">{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(index)}
                          title="Delete Row"
                          className="hidden group-hover:inline-flex items-center justify-center text-rose-500 hover:text-rose-700 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      {/* ITEM Auto-input */}
                      <td className="p-1.5 border-r border-slate-200">
                        <div className="relative">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                            placeholder="Type item description (e.g. 5 Litres Petrol, Daily Tea, Office Rent)"
                            list={`items-list-${index}`}
                            className="w-full px-2.5 py-1.5 text-xs font-medium text-slate-900 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <datalist id={`items-list-${index}`}>
                            {expenseItemMasters
                              .filter(m => !currentTab.category || m.category === currentTab.category)
                              .map((m) => (
                                <option key={m.id} value={m.name} />
                            ))}
                          </datalist>
                        </div>
                      </td>

                      {/* QTY */}
                      <td className="p-1.5 border-r border-slate-200">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.quantity === 0 ? '' : item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          placeholder="1"
                          className="w-full px-2 py-1.5 text-xs font-mono font-semibold text-center text-slate-900 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* PRICE / UNIT */}
                      <td className="p-1.5 border-r border-slate-200">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.pricePerUnit === 0 ? '' : item.pricePerUnit}
                          onChange={(e) => handleItemChange(index, 'pricePerUnit', e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1.5 text-xs font-mono font-semibold text-right text-slate-900 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* AMOUNT */}
                      <td className="p-1.5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.amount === 0 ? '' : item.amount}
                          onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1.5 text-xs font-mono font-bold text-right text-slate-900 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                        />
                      </td>

                    </tr>
                  ))}
                </tbody>

                {/* ADD ROW & TOTAL FOOTER */}
                <tfoot>
                  <tr className="bg-slate-50/60 border-t border-slate-300">
                    <td colSpan={2} className="p-2 border-r border-slate-300">
                      <button
                        type="button"
                        onClick={handleAddItemRow}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-500 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold shadow-xs transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>ADD ROW</span>
                      </button>
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-slate-700 border-r border-slate-300">
                      <div className="text-[10px] uppercase text-slate-400 font-sans">TOTAL QTY</div>
                      {totalQty}
                    </td>
                    <td className="p-2 text-right font-bold text-slate-700 border-r border-slate-300">
                      TOTAL
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(subTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* BOTTOM CONTROLS (Payment Type, Description, Image, Roundoff, Total) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pt-2">
            
            {/* Left Controls (Payment Type, Add Description, Add Image) */}
            <div className="md:col-span-6 space-y-3">
              
              {/* Payment Type */}
              <div className="relative w-full sm:w-64">
                <label className="absolute -top-2 left-3 bg-white px-1 text-[11px] font-bold text-slate-600 z-10">
                  Payment Type
                </label>
                <select
                  value={currentTab.paymentType}
                  onChange={(e) => updateCurrentTab({ paymentType: e.target.value as any })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer"
                >
                  <option value="Cash">Cash (کیش)</option>
                  <option value="Bank Transfer">Bank Transfer / Online (بینک)</option>
                  <option value="Cheque">Cheque (چیک)</option>
                  <option value="Credit">Credit / Payable (ادھار / واجب الادا)</option>
                </select>
              </div>

              {/* Action Buttons: Add Description & Add Image */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateCurrentTab({ isDescriptionOpen: !currentTab.isDescriptionOpen })}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
                    currentTab.isDescriptionOpen || currentTab.description
                      ? 'bg-blue-50 border-blue-400 text-blue-800'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{currentTab.description ? 'EDIT DESCRIPTION' : '+ ADD DESCRIPTION'}</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
                    currentTab.imageAttachment
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{currentTab.imageAttachment ? 'RECEIPT ATTACHED' : '+ ADD IMAGE'}</span>
                </button>
              </div>

              {/* Expandable Description Area */}
              {currentTab.isDescriptionOpen && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-150">
                  <textarea
                    rows={2}
                    value={currentTab.description}
                    onChange={(e) => updateCurrentTab({ description: e.target.value })}
                    placeholder="Enter expense remarks, voucher notes, reason or bill memo..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs resize-none"
                  />
                </div>
              )}

              {/* Receipt Image Preview */}
              {currentTab.imageAttachment && (
                <div className="relative inline-block border border-slate-300 rounded-lg p-1 bg-white shadow-xs">
                  <img
                    src={currentTab.imageAttachment}
                    alt="Receipt Attachment"
                    className="h-20 w-auto rounded object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => updateCurrentTab({ imageAttachment: '' })}
                    className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-md"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

            </div>

            {/* Right Controls (Round Off, Total, Paid Amount if Credit) */}
            <div className="md:col-span-6 flex flex-col items-end space-y-3">
              
              {/* Round Off Row */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={currentTab.isRoundOffEnabled}
                    onChange={(e) => updateCurrentTab({ isRoundOffEnabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>Round Off</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={calculatedRoundOff.toFixed(2)}
                  className="w-20 bg-slate-100 border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono text-center text-slate-600 font-bold"
                />
              </div>

              {/* Net Total Box (Matching Screenshot 1 & 2) */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-700">Total</span>
                <input
                  type="text"
                  readOnly
                  value={grandTotal.toLocaleString()}
                  className="w-48 bg-white border border-slate-300 rounded-lg px-3 py-2 text-base font-mono font-black text-right text-slate-900 shadow-xs focus:outline-none"
                />
              </div>

              {/* Credit Specific Fields */}
              {currentTab.paymentType === 'Credit' && (
                <div className="space-y-2 pt-2 border-t border-slate-200 w-full max-w-xs text-right">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-600">Paid Now:</span>
                    <input
                      type="number"
                      min="0"
                      max={grandTotal}
                      value={currentTab.paidAmount}
                      onChange={(e) => updateCurrentTab({ paidAmount: parseFloat(e.target.value) || 0 })}
                      className="w-32 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-right text-emerald-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-rose-600">Balance Due:</span>
                    <span className="font-mono font-black text-rose-600 text-sm">
                      {formatCurrency(Math.max(0, grandTotal - currentTab.paidAmount))}
                    </span>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

        {/* MODAL FOOTER BUTTONS (Matching Screenshot 1 & 2) */}
        <div className="bg-white px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">Esc</kbd> to close
          </div>

          <div className="flex items-center gap-3">
            
            {/* Save & New Dropdown Button (Matching screenshot) */}
            <div className="inline-flex rounded-lg shadow-xs">
              <button
                type="button"
                onClick={() => handleSave(true)}
                className="px-4 py-2 border border-blue-500 text-blue-600 hover:bg-blue-50 text-xs font-bold rounded-l-lg transition-colors"
              >
                Save &amp; <u>N</u>ew
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                className="px-2 py-2 border-y border-r border-blue-500 text-blue-600 hover:bg-blue-50 text-xs font-bold rounded-r-lg transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Save Primary Button (Solid Blue) */}
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
            >
              Save
            </button>

          </div>
        </div>

      </div>

      {/* Floating Calculator Modal */}
      <ExpenseCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onApplyValue={(val) => {
          if (activeItemIndexForCalc !== null && currentTab.items[activeItemIndexForCalc]) {
            handleItemChange(activeItemIndexForCalc, 'amount', val);
          } else {
            handleItemChange(0, 'amount', val);
          }
        }}
      />

      {/* Quick Add Category Modal */}
      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        onSave={handleSaveNewCategory}
      />

    </div>
  );
};
