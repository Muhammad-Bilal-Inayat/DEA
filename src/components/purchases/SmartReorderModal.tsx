import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, TrendingUp, ShoppingBag, Truck, Calendar, AlertTriangle, 
  CheckCircle2, RefreshCw, ArrowRight, DollarSign, Package, Check, X,
  FileSpreadsheet, Send
} from 'lucide-react';
import { dbMedicines, dbInvoices, dbSuppliers, dbPurchaseOrders, dbAuditLogs } from '../../lib/db';
import { Medicine, Invoice, Supplier, PurchaseOrder } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { buildShortageWhatsAppMessage, sendToWhatsApp } from '../../lib/whatsappService';

export interface SmartSuggestionItem {
  medicine: Medicine;
  currentStock: number;
  minStock: number;
  totalSold30Days: number;
  dailyConsumptionRate: number; // units per day
  daysOfStockLeft: number;
  recommendedOrderQty: number; // enough for target buffer days
  supplierName: string;
  supplierId?: string;
  estimatedCost: number;
  urgency: 'CRITICAL_RUNOUT' | 'HIGH_DEMAND' | 'BELOW_MINIMUM';
  selected: boolean;
}

interface SmartReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConvertToPurchaseOrder: (order: Partial<PurchaseOrder>) => void;
}

export const SmartReorderModal: React.FC<SmartReorderModalProps> = ({
  isOpen,
  onClose,
  onConvertToPurchaseOrder,
}) => {
  const { business, currentUser } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Simulation controls
  const [bufferDaysTarget, setBufferDaysTarget] = useState<number>(15); // Order enough stock for next 15 days
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');

  // Suggestions state
  const [suggestions, setSuggestions] = useState<SmartSuggestionItem[]>([]);
  const [isGeneratingPO, setIsGeneratingPO] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDataAndAnalyze();
    }
  }, [isOpen, bufferDaysTarget]);

  const loadDataAndAnalyze = async () => {
    setLoading(true);
    try {
      const [allMeds, allInvs, allSupps] = await Promise.all([
        dbMedicines.getAll(),
        dbInvoices.getAll(),
        dbSuppliers.getAll(),
      ]);

      setMedicines(allMeds || []);
      setInvoices(allInvs || []);
      setSuppliers(allSupps || []);

      // Calculate last 30-day consumption per medicine
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const salesMap = new Map<string, number>(); // medicineId -> qty sold in 30d

      (allInvs || []).forEach(inv => {
        const invTime = new Date(inv.date || inv.createdAt || 0).getTime();
        if (invTime >= thirtyDaysAgo && Array.isArray(inv.items)) {
          inv.items.forEach(it => {
            const medId = it.medicineId || it.id;
            if (medId) {
              const prev = salesMap.get(medId) || 0;
              salesMap.set(medId, prev + (Number(it.quantity) || 0));
            }
          });
        }
      });

      // Analyze which medicines are in danger of running out
      const calculated: SmartSuggestionItem[] = [];

      allMeds.forEach(med => {
        const soldQty = salesMap.get(med.id) || 0;
        const dailyRate = Number((soldQty / 30).toFixed(2));
        const currentStock = Number(med.quantity) || 0;
        const minThreshold = med.lowStockThreshold || med.minStock || 10;

        // Days left calculation
        let daysLeft = 999;
        if (dailyRate > 0) {
          daysLeft = Math.floor(currentStock / dailyRate);
        } else if (currentStock <= minThreshold) {
          daysLeft = currentStock === 0 ? 0 : 3;
        }

        // Trigger condition:
        // 1. Stock is zero or <= 0
        // 2. Stock will run out in <= 5 days based on daily velocity
        // 3. Stock is below user-defined low stock threshold
        const isCritical = currentStock <= 0 || daysLeft <= 2;
        const isBelowMin = currentStock <= minThreshold;
        const isRunoutSoon = daysLeft <= 7;

        if (isCritical || isBelowMin || isRunoutSoon) {
          // Determine recommended reorder quantity:
          // Target = (Daily consumption * bufferDaysTarget) - currentStock + safetyMargin
          let recommendedQty = 0;
          if (dailyRate > 0) {
            const neededForBuffer = Math.ceil(dailyRate * bufferDaysTarget);
            recommendedQty = Math.max(neededForBuffer - currentStock, minThreshold);
          } else {
            recommendedQty = med.reorderQuantity || Math.max(minThreshold * 2, 10);
          }

          if (recommendedQty <= 0) {
            recommendedQty = med.reorderQuantity || 10;
          }

          let urgency: SmartSuggestionItem['urgency'] = 'BELOW_MINIMUM';
          if (isCritical) urgency = 'CRITICAL_RUNOUT';
          else if (daysLeft <= 5) urgency = 'HIGH_DEMAND';

          const costPerUnit = med.latestPurchasePrice || med.purchasePrice || 100;

          calculated.push({
            medicine: med,
            currentStock,
            minStock: minThreshold,
            totalSold30Days: soldQty,
            dailyConsumptionRate: dailyRate,
            daysOfStockLeft: daysLeft,
            recommendedOrderQty: recommendedQty,
            supplierName: med.supplierName || (allSupps[0]?.name || 'Direct Wholesale'),
            supplierId: med.supplierId || allSupps[0]?.id,
            estimatedCost: recommendedQty * costPerUnit,
            urgency,
            selected: true,
          });
        }
      });

      // Sort by urgency: Critical first, then fewest days left
      calculated.sort((a, b) => {
        if (a.urgency === 'CRITICAL_RUNOUT' && b.urgency !== 'CRITICAL_RUNOUT') return -1;
        if (b.urgency === 'CRITICAL_RUNOUT' && a.urgency !== 'CRITICAL_RUNOUT') return 1;
        return a.daysOfStockLeft - b.daysOfStockLeft;
      });

      setSuggestions(calculated);
    } catch (err) {
      console.error('Failed to run smart reorder calculation:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle selection
  const toggleItemSelection = (index: number) => {
    setSuggestions(prev => prev.map((item, idx) => 
      idx === index ? { ...item, selected: !item.selected } : item
    ));
  };

  const toggleSelectAll = () => {
    const allSelected = suggestions.every(s => s.selected);
    setSuggestions(prev => prev.map(s => ({ ...s, selected: !allSelected })));
  };

  const updateQuantity = (index: number, newQty: number) => {
    setSuggestions(prev => prev.map((item, idx) => {
      if (idx === index) {
        const validQty = Math.max(1, newQty);
        const costPerUnit = item.medicine.latestPurchasePrice || item.medicine.purchasePrice || 100;
        return {
          ...item,
          recommendedOrderQty: validQty,
          estimatedCost: validQty * costPerUnit
        };
      }
      return item;
    }));
  };

  // Filtered view
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(s => {
      if (urgencyFilter === 'CRITICAL' && s.urgency !== 'CRITICAL_RUNOUT') return false;
      if (urgencyFilter === 'HIGH' && s.urgency === 'BELOW_MINIMUM') return false;
      if (selectedSupplierId !== 'ALL' && s.supplierId !== selectedSupplierId && s.supplierName !== selectedSupplierId) return false;
      return true;
    });
  }, [suggestions, urgencyFilter, selectedSupplierId]);

  const selectedItems = useMemo(() => {
    return filteredSuggestions.filter(s => s.selected);
  }, [filteredSuggestions]);

  const totalEstimatedCost = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.estimatedCost, 0);
  }, [selectedItems]);

  // Generate 1-Click Purchase Order Draft
  const handleCreatePurchaseOrder = async () => {
    if (selectedItems.length === 0) {
      showToast('Please select at least 1 medicine to order', 'error');
      return;
    }

    setIsGeneratingPO(true);
    try {
      // Group by supplier or pick the first
      const firstSupplier = selectedItems[0]?.supplierName || suppliers[0]?.name || 'Direct Wholesale';
      const supplierObj = suppliers.find(s => s.name.toLowerCase() === firstSupplier.toLowerCase()) || suppliers[0];

      const poItems = selectedItems.map(item => {
        const med = item.medicine;
        const pPrice = med.latestPurchasePrice || med.purchasePrice || 100;
        const mrp = med.mrp || (pPrice * 1.25);
        const sellPrice = med.sellingPrice || (pPrice * 1.2);

        return {
          medicineId: med.id,
          name: med.name,
          batchNumber: 'NEW',
          expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
          quantity: item.recommendedOrderQty,
          purchasePrice: pPrice,
          mrp,
          sellingPrice: sellPrice,
          discountPct: 0,
          taxRate: med.gstPercentage || 0,
          total: item.recommendedOrderQty * pPrice,
        };
      });

      const subTotal = poItems.reduce((acc, it) => acc + it.total, 0);

      const draftOrder: Partial<PurchaseOrder> = {
        poNumber: `PO-AUTO-${Date.now().toString().slice(-6)}`,
        supplierId: supplierObj?.id || `supp-${Date.now()}`,
        supplierName: supplierObj?.name || firstSupplier,
        date: new Date().toISOString(),
        status: 'Pending',
        items: poItems as any,
        subTotal,
        totalAmount: subTotal,
        paidAmount: 0,
        balanceDue: subTotal,
        transactionType: 'Purchase Order',
        description: `🤖 Auto-Generated from AI Sales Velocity Forecast (Target ${bufferDaysTarget} Days Buffer)`,
      };

      await dbAuditLogs.save({
        id: `audit-${Date.now()}`,
        date: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        action: 'CREATE',
        details: `Auto Re-Order generated draft Purchase Order for ${selectedItems.length} items (Total Rs. ${subTotal.toLocaleString()})`,
        userId: currentUser?.id || 'admin',
        notes: `Smart Re-Order Engine`,
      });

      showToast(`Smart Purchase Order drafted with ${selectedItems.length} items!`, 'success');
      onConvertToPurchaseOrder(draftOrder);
      onClose();
    } catch (err: any) {
      console.error('Failed to create draft purchase order:', err);
      showToast('Failed to create purchase order', 'error');
    } finally {
      setIsGeneratingPO(false);
    }
  };

  // WhatsApp Supplier Order
  const handleSendWhatsAppToSupplier = () => {
    if (selectedItems.length === 0) return;
    const firstSupplier = selectedItems[0]?.supplierName || suppliers[0]?.name || 'Distributor';
    const supplierObj = suppliers.find(s => s.name.toLowerCase() === firstSupplier.toLowerCase());

    const message = buildShortageWhatsAppMessage({
      storeName: business?.name || 'MBI Pharmacy',
      storePhone: business?.phone || '',
      storeAddress: business?.address || '',
      date: new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }),
      items: selectedItems.map(it => ({
        name: it.medicine.name,
        generic: it.medicine.genericName,
        quantity: it.recommendedOrderQty,
        estimatedPrice: it.medicine.latestPurchasePrice || it.medicine.purchasePrice || 0,
        urgency: it.urgency === 'CRITICAL_RUNOUT' ? 'Emergency' : 'High'
      })),
      notes: `Smart Re-Order forecast for ${firstSupplier} (Restock for ${bufferDaysTarget} days buffer)`
    });

    sendToWhatsApp(supplierObj?.phone || '', message);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Smart Auto Re-Order Engine</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase">
                  30-Day Sales Velocity AI
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Calculates actual daily sales velocity to predict stock runout and builds an optimized 1-Click Purchase Order.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Controls Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          
          <div className="flex items-center flex-wrap gap-3">
            {/* Target Buffer Days */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-bold text-slate-700">Buffer Target:</span>
              <select
                value={bufferDaysTarget}
                onChange={(e) => setBufferDaysTarget(Number(e.target.value))}
                className="font-black text-blue-700 bg-transparent border-none focus:ring-0 cursor-pointer text-xs"
              >
                <option value={7}>Next 7 Days Stock</option>
                <option value={15}>Next 15 Days Stock (Recommended)</option>
                <option value={30}>Next 30 Days Stock (Monthly)</option>
                <option value={45}>Next 45 Days Stock</option>
              </select>
            </div>

            {/* Urgency Filter */}
            <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setUrgencyFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  urgencyFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Needs ({suggestions.length})
              </button>
              <button
                type="button"
                onClick={() => setUrgencyFilter('CRITICAL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  urgencyFilter === 'CRITICAL' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                Critical Runout (≤ 2 Days)
              </button>
            </div>

            {/* Supplier Filter */}
            {suppliers.length > 0 && (
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-semibold focus:ring-2 focus:ring-blue-500 shadow-2xs text-xs cursor-pointer"
              >
                <option value="ALL">All Distributors ({suppliers.length})</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDataAndAnalyze}
              disabled={loading}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              <span>Recalculate</span>
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-700">Analyzing 30-day invoice logs & item velocity...</p>
              <p className="text-xs text-slate-400">Comparing current shelf stock against daily customer consumption</p>
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-black text-slate-900">Inventory Well-Stocked!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No medicines are currently projected to run out within the selected buffer window based on your sales records.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input 
                        type="checkbox"
                        checked={selectedItems.length === filteredSuggestions.length && filteredSuggestions.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">Medicine & Salt</th>
                    <th className="p-3 text-center">Current Stock</th>
                    <th className="p-3 text-center">30-Day Sales</th>
                    <th className="p-3 text-center">Daily Velocity</th>
                    <th className="p-3 text-center">Days Left</th>
                    <th className="p-3 text-center">Order Qty (Target)</th>
                    <th className="p-3 text-right">Est. Cost</th>
                    <th className="p-3">Supplier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSuggestions.map((item, idx) => {
                    return (
                      <tr 
                        key={item.medicine.id}
                        className={`hover:bg-blue-50/40 transition-colors ${
                          item.selected ? 'bg-blue-50/20' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input 
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleItemSelection(idx)}
                            className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{item.medicine.name}</div>
                          <div className="text-[11px] text-slate-500">{item.medicine.genericName || item.medicine.manufacturer || 'General'}</div>
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          <span className={`px-2 py-0.5 rounded-md ${
                            item.currentStock <= 0 ? 'bg-rose-100 text-rose-800' :
                            item.currentStock <= item.minStock ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.currentStock}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono text-slate-700">
                          {item.totalSold30Days} units
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-900">
                          {item.dailyConsumptionRate} / day
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            item.daysOfStockLeft <= 1 ? 'bg-rose-600 text-white' :
                            item.daysOfStockLeft <= 3 ? 'bg-rose-100 text-rose-800' :
                            item.daysOfStockLeft <= 7 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item.daysOfStockLeft === 0 ? 'EMPTY' : `~${item.daysOfStockLeft} Days`}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              value={item.recommendedOrderQty}
                              onChange={(e) => updateQuantity(idx, parseInt(e.target.value, 10) || 1)}
                              className="w-16 text-center border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 text-xs"
                            />
                            <span className="text-[10px] text-slate-400">units</span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(item.estimatedCost)}
                        </td>
                        <td className="p-3 text-slate-600 truncate max-w-[140px]" title={item.supplierName}>
                          {item.supplierName}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom Action Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-500">Selected Items:</span>
              <span className="ml-1.5 font-black text-slate-900 text-sm">{selectedItems.length}</span>
            </div>
            <div>
              <span className="text-slate-500">Estimated Total Cost:</span>
              <span className="ml-1.5 font-black text-blue-700 text-sm font-mono">{formatCurrency(totalEstimatedCost)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendWhatsAppToSupplier}
              disabled={selectedItems.length === 0}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp Supplier List</span>
            </button>

            <button
              onClick={handleCreatePurchaseOrder}
              disabled={selectedItems.length === 0 || isGeneratingPO}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingPO ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ShoppingBag className="w-4 h-4" />
              )}
              <span>1-Click Generate Purchase Order ({selectedItems.length})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
