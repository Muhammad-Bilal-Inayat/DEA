import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Search, Plus, Trash2, Edit2, CheckCircle2, 
  Save, AlertTriangle, ArrowDownRight, ArrowUpRight, 
  RotateCcw, Sliders, ShieldCheck, DollarSign, 
  Calendar, Hash, User, Building, Zap, Clock, 
  CloudOff, CloudCheck, Layers, RefreshCw
} from 'lucide-react';
import { 
  QuickTransactionType, 
  QuickTransactionLineItem, 
  QuickTransactionStatus,
  Medicine, 
  Supplier
} from '../../types';
import { dbMedicines, dbSuppliers } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { saveQuickTransaction } from '../../lib/quickTransactionService';
import { emitToast } from '../../contexts/ToastContext';

interface QuickTransactionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickTransactionPanel: React.FC<QuickTransactionPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const { activeRole, currentUser, activeUser, business, tenantId, canPerform } = useAuth();
  const { settings } = useSettings();

  // Role permissions
  const isCashier = activeRole === 'Cashier' || activeRole === 'Biller' || activeRole === 'Sales Staff' || activeRole === 'Salesman';
  const isPurchaseOnly = activeRole === 'Purchase User';
  const canViewProfit = canPerform('canViewCostsAndProfit') || activeRole === 'Primary Admin' || activeRole === 'Admin' || activeRole === 'Manager';

  // Transaction header state
  const [txnType, setTxnType] = useState<QuickTransactionType>(isPurchaseOnly ? 'Purchase' : 'Sale');
  const [txnDate, setTxnDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [txnTime, setTxnTime] = useState<string>(() => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [partyName, setPartyName] = useState('Walk-in Customer / Cash');
  const [partyPhone, setPartyPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank / Raast' | 'JazzCash / EasyPaisa' | 'Credit / Due' | 'Mixed'>('Cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Line items state
  const [items, setItems] = useState<QuickTransactionLineItem[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Item form inputs
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

  const [inputItemName, setInputItemName] = useState('');
  const [inputGeneric, setInputGeneric] = useState('');
  const [inputBarcode, setInputBarcode] = useState('');
  const [inputBatch, setInputBatch] = useState('B-001');
  const [inputExpiry, setInputExpiry] = useState('');
  const [inputPackSize, setInputPackSize] = useState('1x10');
  const [inputUnit, setInputUnit] = useState('Tab');
  const [inputQty, setInputQty] = useState<number>(1);
  const [inputPurchaseRate, setInputPurchaseRate] = useState<number>(0);
  const [inputSaleRate, setInputSaleRate] = useState<number>(0);
  const [inputDiscountPercent, setInputDiscountPercent] = useState<number>(0);
  const [inputTaxPercent, setInputTaxPercent] = useState<number>(0);
  const [inputAdjustmentReason, setInputAdjustmentReason] = useState<QuickTransactionLineItem['adjustmentReason']>('Physical Audit');

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load medicines and suppliers for auto-suggest
  useEffect(() => {
    if (isOpen) {
      dbMedicines.getAll().then(setMedicines).catch(() => {});
      dbSuppliers.getAll().then(setSuppliers).catch(() => {});
      if (searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 150);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Filter products when searching
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchTerm.toLowerCase();
    const filtered = medicines.filter(m => 
      m.name.toLowerCase().includes(q) ||
      (m.genericName && m.genericName.toLowerCase().includes(q)) ||
      (m.barcode && m.barcode.toLowerCase().includes(q)) ||
      (m.batchNumber && m.batchNumber.toLowerCase().includes(q))
    ).slice(0, 8);
    setSearchResults(filtered);
  }, [searchTerm, medicines]);

  // Select a product from search
  const handleSelectProduct = (med: Medicine) => {
    setSelectedMedicine(med);
    setInputItemName(med.name);
    setInputGeneric(med.genericName || '');
    setInputBarcode(med.barcode || '');
    setInputBatch(med.batchNumber || 'B-' + Math.floor(100 + Math.random() * 900));
    setInputExpiry(med.expiryDate || '');
    setInputPackSize((med as any).packaging || med.unit || '1x10');
    setInputUnit(med.unit || 'Strip');
    setInputPurchaseRate(med.purchasePrice || 0);
    setInputSaleRate(med.sellingPrice || med.mrp || 0);
    setInputQty(1);
    setSearchTerm('');
    setSearchResults([]);
  };

  // Add or update line item
  const handleAddLineItem = () => {
    if (!inputItemName.trim()) {
      emitToast('Please enter or select a product name', 'warning');
      return;
    }
    if (inputQty <= 0) {
      emitToast('Quantity must be greater than zero', 'warning');
      return;
    }

    const baseAmount = inputQty * (txnType === 'Purchase' || txnType === 'Purchase Return' ? inputPurchaseRate : inputSaleRate);
    const discountAmt = (baseAmount * (inputDiscountPercent || 0)) / 100;
    const taxableBase = baseAmount - discountAmt;
    const taxAmt = (taxableBase * (inputTaxPercent || 0)) / 100;
    const lineTotal = taxableBase + taxAmt;
    
    // Line profit calculation
    const costTotal = inputQty * inputPurchaseRate;
    const lineProfit = txnType === 'Sale' ? Math.max(0, lineTotal - costTotal) : 0;

    const newItem: QuickTransactionLineItem = {
      id: editingItemId || 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      medicineId: selectedMedicine?.id,
      name: inputItemName.trim(),
      genericName: inputGeneric.trim() || undefined,
      barcode: inputBarcode.trim() || undefined,
      batchNumber: inputBatch.trim() || undefined,
      expiryDate: inputExpiry || undefined,
      packSize: inputPackSize || undefined,
      unit: inputUnit || undefined,
      quantity: Number(inputQty),
      purchaseRate: Number(inputPurchaseRate),
      saleRate: Number(inputSaleRate),
      discountPercent: Number(inputDiscountPercent) || 0,
      discountAmount: discountAmt,
      taxPercent: Number(inputTaxPercent) || 0,
      taxAmount: taxAmt,
      lineTotal: Math.round(lineTotal * 100) / 100,
      lineProfit: Math.round(lineProfit * 100) / 100,
      adjustmentReason: txnType === 'Stock Adjustment' ? inputAdjustmentReason : undefined,
    };

    if (editingItemId) {
      setItems(prev => prev.map(it => it.id === editingItemId ? newItem : it));
      setEditingItemId(null);
      emitToast(`Updated item: ${newItem.name}`, 'info');
    } else {
      setItems(prev => [...prev, newItem]);
      emitToast(`Added item: ${newItem.name}`, 'success');
    }

    // Reset item input form
    setSelectedMedicine(null);
    setInputItemName('');
    setInputGeneric('');
    setInputBarcode('');
    setInputBatch('B-' + Math.floor(100 + Math.random() * 900));
    setInputExpiry('');
    setInputQty(1);
    setInputPurchaseRate(0);
    setInputSaleRate(0);
    setInputDiscountPercent(0);
    setInputTaxPercent(0);
  };

  const handleEditItem = (item: QuickTransactionLineItem) => {
    setEditingItemId(item.id);
    setInputItemName(item.name);
    setInputGeneric(item.genericName || '');
    setInputBarcode(item.barcode || '');
    setInputBatch(item.batchNumber || '');
    setInputExpiry(item.expiryDate || '');
    setInputPackSize(item.packSize || '1x10');
    setInputUnit(item.unit || 'Strip');
    setInputQty(item.quantity);
    setInputPurchaseRate(item.purchaseRate);
    setInputSaleRate(item.saleRate);
    setInputDiscountPercent(item.discountPercent || 0);
    setInputTaxPercent(item.taxPercent || 0);
    if (item.adjustmentReason) setInputAdjustmentReason(item.adjustmentReason);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  // Aggregate Calculations
  const subtotal = items.reduce((sum, it) => sum + (it.quantity * (txnType === 'Purchase' || txnType === 'Purchase Return' ? it.purchaseRate : it.saleRate)), 0);
  const totalDiscount = items.reduce((sum, it) => sum + (it.discountAmount || 0), 0);
  const totalTax = items.reduce((sum, it) => sum + (it.taxAmount || 0), 0);
  const grandTotal = Math.max(0, items.reduce((sum, it) => sum + it.lineTotal, 0));
  const totalCost = items.reduce((sum, it) => sum + (it.quantity * it.purchaseRate), 0);
  const grossProfit = txnType === 'Sale' ? Math.max(0, grandTotal - totalCost) : 0;
  const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);

  // Auto set paid amount when items change
  useEffect(() => {
    if (paymentMethod === 'Cash' || paymentMethod === 'Bank / Raast' || paymentMethod === 'JazzCash / EasyPaisa') {
      setPaidAmount(grandTotal);
    } else if (paymentMethod === 'Credit / Due') {
      setPaidAmount(0);
    }
  }, [grandTotal, paymentMethod]);

  const changeDue = Math.max(0, paidAmount - grandTotal);
  const balanceDue = Math.max(0, grandTotal - paidAmount);

  // Save Transaction
  const handleSaveTransaction = async (status: QuickTransactionStatus = 'Posted') => {
    if (items.length === 0) {
      emitToast('Please add at least one line item to the transaction', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const generatedTxnNumber = `QTX-${txnType.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
      
      await saveQuickTransaction({
        tenantId: tenantId || business?.id || 'default-tenant',
        firmId: business?.id || 'default-firm',
        transactionNumber: generatedTxnNumber,
        type: txnType,
        date: txnDate,
        time: txnTime,
        status,
        partyName: partyName.trim() || (txnType === 'Purchase' ? 'Standard Distributor' : 'Walk-in Customer'),
        partyPhone: partyPhone.trim() || undefined,
        partyType: txnType === 'Purchase' || txnType === 'Purchase Return' ? 'Supplier' : 'Customer',
        items,
        itemsCount: items.length,
        totalQuantity: totalQty,
        subtotal,
        totalDiscount,
        totalTax,
        grandTotal,
        returnAmount: txnType.includes('Return') ? grandTotal : 0,
        totalCost,
        grossProfit,
        netProfit: grossProfit,
        paymentMethod,
        paidAmount,
        changeDue,
        balanceDue,
        notes: notes.trim() || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        createdByUserId: currentUser?.uid || 'u1',
        createdByUserName: activeUser?.name || currentUser?.displayName || 'Admin',
        createdByUserRole: activeRole,
      });

      emitToast(
        status === 'Draft' 
          ? `Saved as draft: ${generatedTxnNumber}` 
          : `Quick ${txnType} Posted Successfully! (#${generatedTxnNumber})`, 
        'success'
      );

      // Reset and close
      setItems([]);
      setNotes('');
      setReferenceNumber('');
      onClose();
    } catch (err: any) {
      console.error('Failed to save quick transaction:', err);
      emitToast(`Error: ${err.message || 'Could not save transaction'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-700 to-indigo-800 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Quick Private Transaction Panel
                </h2>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/25">
                  Alt + P
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  isOnline ? 'bg-emerald-500/30 text-emerald-100 border border-emerald-400/40' : 'bg-amber-500/30 text-amber-100 border border-amber-400/40'
                }`}>
                  {isOnline ? <CloudCheck className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
                  {isOnline ? 'Online & Isolated Sync' : 'Local Offline Safe'}
                </span>
              </div>
              <p className="text-xs text-teal-100/90 font-medium">
                {business?.name || 'MBI Inventra'} &bull; Role: {activeRole} &bull; Summaries safely synced to Dashboard
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction Type Tabs */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl border border-slate-300/70 dark:border-slate-700">
            {(['Sale', 'Purchase', 'Sale Return', 'Purchase Return', 'Stock Adjustment'] as QuickTransactionType[]).map(type => {
              // Role check restrictions
              const isBlocked = (isCashier && (type === 'Purchase' || type === 'Purchase Return' || type === 'Stock Adjustment')) ||
                                (isPurchaseOnly && (type === 'Sale' || type === 'Sale Return'));

              return (
                <button
                  key={type}
                  disabled={isBlocked}
                  onClick={() => setTxnType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isBlocked 
                      ? 'opacity-40 cursor-not-allowed text-slate-400'
                      : txnType === type
                      ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm border border-slate-200 dark:border-slate-600'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {type === 'Sale' && <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />}
                  {type === 'Purchase' && <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />}
                  {type === 'Sale Return' && <RotateCcw className="w-3.5 h-3.5 text-amber-500" />}
                  {type === 'Purchase Return' && <RotateCcw className="w-3.5 h-3.5 text-rose-500" />}
                  {type === 'Stock Adjustment' && <Sliders className="w-3.5 h-3.5 text-purple-500" />}
                  {type}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input 
                type="date"
                value={txnDate}
                onChange={e => setTxnDate(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <input 
                type="time"
                value={txnTime}
                onChange={e => setTxnTime(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Main Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Party and Reference Header Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                {txnType === 'Purchase' || txnType === 'Purchase Return' ? 'Supplier / Distributor' : 'Customer / Party Name'}
              </label>
              <div className="relative">
                <input 
                  type="text"
                  value={partyName}
                  onChange={e => setPartyName(e.target.value)}
                  placeholder={txnType === 'Purchase' ? 'Select or type supplier...' : 'Walk-in Customer / Cash'}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Party Phone / Contact (Optional)
              </label>
              <input 
                type="text"
                value={partyPhone}
                onChange={e => setPartyPhone(e.target.value)}
                placeholder="e.g. 0300 1234567"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Ref / Invoice Number
              </label>
              <input 
                type="text"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                placeholder="e.g. REF-2026-09"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Product Fast Add Form */}
          <div className="bg-slate-50/90 dark:bg-slate-800/80 p-4 rounded-xl border border-teal-200 dark:border-teal-900/60 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-teal-600" />
                {editingItemId ? 'Edit Line Item' : 'Add Item to Quick Transaction'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Supports Live Inventory Search & Barcodes
              </span>
            </div>

            {/* Live Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by medicine name, generic formula, barcode, or batch..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />

              {/* Autocomplete Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border-2 border-teal-400 rounded-xl shadow-2xl z-[9999] max-h-80 overflow-y-auto ring-4 ring-teal-500/10">
                  {searchResults.map(med => (
                    <div 
                      key={med.id}
                      onClick={() => handleSelectProduct(med)}
                      className="px-3.5 py-2 hover:bg-teal-50 dark:hover:bg-teal-950/40 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                          {med.name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {med.genericName} &bull; Batch: {med.batchNumber || 'N/A'} &bull; Exp: {med.expiryDate || 'N/A'} &bull; Stock: {med.quantity || 0}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-teal-600 dark:text-teal-400">
                          Rs. {med.sellingPrice || med.mrp || 0}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Cost: Rs. {med.purchasePrice || 0}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Line Item Inputs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5 items-end">
              <div className="col-span-2">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Item Name *</label>
                <input 
                  type="text"
                  value={inputItemName}
                  onChange={e => setInputItemName(e.target.value)}
                  placeholder="Medicine / Surgical name"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Batch #</label>
                <input 
                  type="text"
                  value={inputBatch}
                  onChange={e => setInputBatch(e.target.value)}
                  placeholder="B-001"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Expiry</label>
                <input 
                  type="text"
                  value={inputExpiry}
                  onChange={e => setInputExpiry(e.target.value)}
                  placeholder="MM/YY or YYYY"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Qty *</label>
                <input 
                  type="number"
                  min="0"
                  step="any"
                  value={inputQty === 0 ? '0' : inputQty || ''}
                  onFocus={e => e.target.select()}
                  onChange={e => setInputQty(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                  {txnType === 'Purchase' || txnType === 'Purchase Return' ? 'Cost Rate *' : 'Sale Rate *'}
                </label>
                <input 
                  type="number"
                  min="0"
                  step="0.01"
                  value={txnType === 'Purchase' || txnType === 'Purchase Return' ? inputPurchaseRate || '' : inputSaleRate || ''}
                  onChange={e => {
                    const val = Number(e.target.value);
                    if (txnType === 'Purchase' || txnType === 'Purchase Return') {
                      setInputPurchaseRate(val);
                    } else {
                      setInputSaleRate(val);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-teal-600 dark:text-teal-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Disc %</label>
                <input 
                  type="number"
                  min="0"
                  max="100"
                  value={inputDiscountPercent || ''}
                  onChange={e => setInputDiscountPercent(Number(e.target.value))}
                  placeholder="0%"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <button 
                  type="button"
                  onClick={handleAddLineItem}
                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {editingItemId ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Product / Medicine</th>
                  <th className="py-2.5 px-3">Batch & Expiry</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">Disc</th>
                  <th className="py-2.5 px-3 text-right">Line Total</th>
                  {canViewProfit && txnType === 'Sale' && (
                    <th className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">Profit</th>
                  )}
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={canViewProfit && txnType === 'Sale' ? 9 : 8} className="py-8 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Layers className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        <span className="font-medium text-xs">No items added to this quick transaction yet.</span>
                        <span className="text-[11px] text-slate-400">Search a product above or type manually to begin.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{item.name}</div>
                        {item.genericName && (
                          <div className="text-[10px] text-slate-400">{item.genericName}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                          {item.batchNumber || '—'}
                        </span>
                        {item.expiryDate && (
                          <span className="ml-1.5 text-[10px] text-slate-400">
                            Exp: {item.expiryDate}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-100">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300 font-mono">
                        Rs. {txnType === 'Purchase' || txnType === 'Purchase Return' ? item.purchaseRate : item.saleRate}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500 font-mono">
                        {item.discountPercent ? `${item.discountPercent}%` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                        Rs. {item.lineTotal.toLocaleString()}
                      </td>
                      {canViewProfit && txnType === 'Sale' && (
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                          Rs. {(item.lineProfit || 0).toLocaleString()}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            type="button"
                            onClick={() => handleEditItem(item)}
                            className="p-1 text-slate-400 hover:text-teal-600 transition-colors"
                            title="Edit Row"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Remove"
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

          {/* Bottom Controls: Notes, Payment & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            
            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase">
                Transaction Remarks / Notes
              </label>
              <textarea 
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Private remarks, doctor reference, patient notes..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>

            {/* Payment Options */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase">
                Payment Method & Tender
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['Cash', 'Bank / Raast', 'JazzCash / EasyPaisa', 'Credit / Due'] as const).map(pm => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentMethod(pm)}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-medium text-left border transition-all ${
                      paymentMethod === pm
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">Paid Amount</span>
                  <input 
                    type="number"
                    value={paidAmount || ''}
                    onChange={e => setPaidAmount(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">
                    {changeDue > 0 ? 'Change Return' : 'Balance Due'}
                  </span>
                  <div className={`px-2 py-1 rounded text-xs font-bold font-mono ${
                    changeDue > 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800'
                  }`}>
                    Rs. {changeDue > 0 ? changeDue.toLocaleString() : balanceDue.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-4 rounded-xl shadow-md space-y-2 flex flex-col justify-between">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal:</span>
                  <span className="font-mono">Rs. {subtotal.toLocaleString()}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Discount:</span>
                    <span className="font-mono">- Rs. {totalDiscount.toLocaleString()}</span>
                  </div>
                )}
                {totalTax > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>Tax:</span>
                    <span className="font-mono">+ Rs. {totalTax.toLocaleString()}</span>
                  </div>
                )}
                {canViewProfit && txnType === 'Sale' && (
                  <div className="flex justify-between text-emerald-400 border-t border-slate-800 pt-1 text-[11px]">
                    <span>Estimated Gross Profit:</span>
                    <span className="font-mono font-semibold">Rs. {grossProfit.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-700 pt-2 flex justify-between items-baseline">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Grand Total</span>
                <span className="text-xl font-extrabold text-amber-400 font-mono">
                  Rs. {grandTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="font-mono bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-[11px]">
              {items.length} item(s) &bull; {totalQty} total units
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setItems([]);
                setNotes('');
                setReferenceNumber('');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={isSaving || items.length === 0}
              onClick={() => handleSaveTransaction('Draft')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 transition-colors"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={isSaving || items.length === 0}
              onClick={() => handleSaveTransaction('Posted')}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Post & Save Transaction
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
