import React, { useState } from 'react';
import { 
  X, Check, AlertTriangle, Layers, DollarSign, Building2, 
  MapPin, ShieldAlert, Sparkles, Trash2, ArrowRight, CheckCircle2 
} from 'lucide-react';
import { Medicine } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { emitToast } from '../../contexts/ToastContext';
import { dbMedicines, dbAuditLogs, dbUserActivities } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMedicines: Medicine[];
  allCategories?: string[];
  allManufacturers?: string[];
  onSuccess?: () => void;
  onUpdated?: () => void;
}

type TabType = 'category' | 'pricing' | 'manufacturer' | 'location' | 'controlled' | 'delete';

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  onClose,
  selectedMedicines,
  allCategories = [],
  allManufacturers = [],
  onSuccess,
  onUpdated,
}) => {
  const { activeUser, activeRole } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('pricing');
  const [isConfirmStep, setIsConfirmStep] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Category State
  const [categoryAction, setCategoryAction] = useState<'SELECT' | 'NEW'>('SELECT');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Pricing State
  const [pricingMode, setPricingMode] = useState<'PERCENT_INCREASE' | 'PERCENT_DECREASE' | 'FIXED_ADD' | 'FIXED_SUBTRACT' | 'SET_FIXED_PRICE' | 'SET_FIXED_MRP'>('PERCENT_INCREASE');
  const [priceValue, setPriceValue] = useState<number>(0);
  const [adjustMrpTogether, setAdjustMrpTogether] = useState(true);

  // Manufacturer State
  const [manufacturerAction, setManufacturerAction] = useState<'SELECT' | 'NEW'>('SELECT');
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('');
  const [newManufacturerName, setNewManufacturerName] = useState<string>('');

  // Location State
  const [rackLocation, setRackLocation] = useState<string>('');
  const [shelfLocation, setShelfLocation] = useState<string>('');
  const [lowStockThreshold, setLowStockThreshold] = useState<string>('');

  // Controlled Regulatory State
  const [isControlledState, setIsControlledState] = useState<'KEEP' | 'ENABLE' | 'DISABLE'>('KEEP');
  const [showInNormalPOSState, setShowInNormalPOSState] = useState<'KEEP' | 'ENABLE' | 'DISABLE'>('KEEP');
  const [showInNormalSearchState, setShowInNormalSearchState] = useState<'KEEP' | 'ENABLE' | 'DISABLE'>('KEEP');
  const [showInOnlineStoreState, setShowInOnlineStoreState] = useState<'KEEP' | 'ENABLE' | 'DISABLE'>('KEEP');
  const [specialAccessState, setSpecialAccessState] = useState<'KEEP' | 'ENABLE' | 'DISABLE'>('KEEP');
  const [regulatorySchedule, setRegulatorySchedule] = useState<string>('');

  // Delete State
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  if (!isOpen) return null;

  const count = selectedMedicines.length;

  const handleApplyChanges = async () => {
    if (count === 0) return;
    setIsApplying(true);

    try {
      const updatedMedicines: Medicine[] = [];
      const timestamp = new Date().toISOString();
      const userName = activeUser?.name || 'Authorized Admin';

      if (activeTab === 'delete') {
        if (deleteConfirmText.toLowerCase() !== 'delete') {
          emitToast('Please type "DELETE" to confirm batch deletion', 'error');
          setIsApplying(false);
          return;
        }

        for (const med of selectedMedicines) {
          await dbMedicines.delete(med.id);
        }

        await dbAuditLogs.save({
          id: 'audit_' + Date.now(),
          action: 'DELETE',
          module: 'INVENTORY',
          details: `Batch deleted ${count} inventory products`,
          user: userName,
          timestamp
        } as any);

        emitToast(`Successfully deleted ${count} items`, 'success');
        if (onSuccess) onSuccess();
        if (onUpdated) onUpdated();
        onClose();
        return;
      }

      for (const med of selectedMedicines) {
        const itemCopy: Medicine = { ...med, updatedAt: timestamp };

        if (activeTab === 'category') {
          const finalCat = categoryAction === 'SELECT' ? selectedCategory : newCategoryName.trim();
          if (finalCat) itemCopy.category = finalCat;
        } 
        else if (activeTab === 'pricing') {
          let newSelling = itemCopy.sellingPrice || 0;
          let newMrp = itemCopy.mrp || 0;

          if (pricingMode === 'PERCENT_INCREASE' && priceValue > 0) {
            newSelling = Math.round(newSelling * (1 + priceValue / 100) * 100) / 100;
            if (adjustMrpTogether) newMrp = Math.round(newMrp * (1 + priceValue / 100) * 100) / 100;
          } else if (pricingMode === 'PERCENT_DECREASE' && priceValue > 0) {
            newSelling = Math.max(0, Math.round(newSelling * (1 - priceValue / 100) * 100) / 100);
            if (adjustMrpTogether) newMrp = Math.max(0, Math.round(newMrp * (1 - priceValue / 100) * 100) / 100);
          } else if (pricingMode === 'FIXED_ADD' && priceValue > 0) {
            newSelling = Math.round((newSelling + priceValue) * 100) / 100;
            if (adjustMrpTogether) newMrp = Math.round((newMrp + priceValue) * 100) / 100;
          } else if (pricingMode === 'FIXED_SUBTRACT' && priceValue > 0) {
            newSelling = Math.max(0, Math.round((newSelling - priceValue) * 100) / 100);
            if (adjustMrpTogether) newMrp = Math.max(0, Math.round((newMrp - priceValue) * 100) / 100);
          } else if (pricingMode === 'SET_FIXED_PRICE' && priceValue > 0) {
            newSelling = priceValue;
          } else if (pricingMode === 'SET_FIXED_MRP' && priceValue > 0) {
            newMrp = priceValue;
          }

          itemCopy.sellingPrice = newSelling;
          itemCopy.mrp = Math.max(newMrp, newSelling);
        }
        else if (activeTab === 'manufacturer') {
          const finalMfg = manufacturerAction === 'SELECT' ? selectedManufacturer : newManufacturerName.trim();
          if (finalMfg) itemCopy.manufacturer = finalMfg;
        }
        else if (activeTab === 'location') {
          if (rackLocation.trim()) itemCopy.rackLocation = rackLocation.trim();
          if (shelfLocation.trim()) itemCopy.shelfLocation = shelfLocation.trim();
          if (lowStockThreshold.trim()) itemCopy.lowStockThreshold = Number(lowStockThreshold) || itemCopy.lowStockThreshold;
        }
        else if (activeTab === 'controlled') {
          if (isControlledState !== 'KEEP') {
            itemCopy.isControlled = isControlledState === 'ENABLE';
          }
          if (showInNormalPOSState !== 'KEEP') {
            itemCopy.showInNormalPOS = showInNormalPOSState === 'ENABLE';
          }
          if (showInNormalSearchState !== 'KEEP') {
            itemCopy.showInNormalSearch = showInNormalSearchState === 'ENABLE';
          }
          if (showInOnlineStoreState !== 'KEEP') {
            itemCopy.showInOnlineStore = showInOnlineStoreState === 'ENABLE';
          }
          if (specialAccessState !== 'KEEP') {
            itemCopy.specialAccessRequired = specialAccessState === 'ENABLE';
          }
          if (regulatorySchedule.trim()) {
            itemCopy.regulatorySchedule = regulatorySchedule.trim();
          }
        }

        await dbMedicines.save(itemCopy);
        updatedMedicines.push(itemCopy);
      }

      await dbAuditLogs.save({
        id: 'audit_' + Date.now(),
        action: 'UPDATE',
        module: 'INVENTORY_BULK',
        details: `Bulk updated ${count} products in mode: ${activeTab.toUpperCase()}`,
        user: userName,
        timestamp
      } as any);

      await dbUserActivities.save({
        id: 'act_' + Date.now(),
        userName,
        userRole: activeRole,
        details: `Batch edited ${count} inventory products (${activeTab})`,
        timestamp: Date.now()
      } as any);

      emitToast(`Batch update applied to ${count} products successfully`, 'success');
      if (onSuccess) onSuccess();
      if (onUpdated) onUpdated();
      onClose();
    } catch (e: any) {
      console.error('Bulk edit error:', e);
      emitToast(e?.message || 'Failed to apply bulk update', 'error');
    } finally {
      setIsApplying(false);
      setIsConfirmStep(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Bulk Inventory Editor
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-semibold">
                  {count} items selected
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Apply batch updates to categories, pricing, manufacturers, locations, or regulatory tags.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Operation Tabs */}
        {!isConfirmStep && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto text-xs font-semibold">
            {[
              { id: 'pricing', label: 'Pricing & MRP', icon: DollarSign },
              { id: 'category', label: 'Category', icon: Layers },
              { id: 'manufacturer', label: 'Manufacturer', icon: Building2 },
              { id: 'location', label: 'Location & Min Stock', icon: MapPin },
              { id: 'controlled', label: 'Controlled / Safety', icon: ShieldAlert },
              { id: 'delete', label: 'Batch Delete', icon: Trash2, danger: true },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition ${
                    isActive
                      ? tab.danger 
                        ? 'border-red-600 text-red-600 bg-red-50/50 dark:bg-red-950/20'
                        : 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-950/20'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">
          {!isConfirmStep ? (
            <>
              {/* Pricing Tab */}
              {activeTab === 'pricing' && (
                <div className="space-y-4">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Choose Pricing Operation
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'PERCENT_INCREASE', label: 'Increase Selling Price (%)', desc: 'Markup price by percentage' },
                      { id: 'PERCENT_DECREASE', label: 'Discount / Decrease Price (%)', desc: 'Markdown price by percentage' },
                      { id: 'FIXED_ADD', label: 'Add Fixed Amount (+ PKR)', desc: 'Increase all prices by fixed amount' },
                      { id: 'FIXED_SUBTRACT', label: 'Subtract Fixed Amount (- PKR)', desc: 'Reduce all prices by fixed amount' },
                      { id: 'SET_FIXED_PRICE', label: 'Set Exact Selling Price', desc: 'Override selling price for all' },
                      { id: 'SET_FIXED_MRP', label: 'Set Exact MRP', desc: 'Override MRP for all selected' },
                    ].map(opt => (
                      <label 
                        key={opt.id} 
                        className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                          pricingMode === opt.id 
                            ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-600' 
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <input 
                            type="radio" 
                            name="pricingMode" 
                            checked={pricingMode === opt.id} 
                            onChange={() => setPricingMode(opt.id as any)}
                            className="text-blue-600 focus:ring-blue-500" 
                          />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{opt.label}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 pl-5">{opt.desc}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {pricingMode.includes('PERCENT') ? 'Percentage Value (%)' : 'Amount in PKR (Rs.)'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={priceValue || ''}
                        onChange={(e) => setPriceValue(parseFloat(e.target.value) || 0)}
                        placeholder={pricingMode.includes('PERCENT') ? 'e.g. 10 for 10%' : 'e.g. 50'}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input
                      type="checkbox"
                      checked={adjustMrpTogether}
                      onChange={(e) => setAdjustMrpTogether(e.target.checked)}
                      className="rounded-sm text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      Also adjust Maximum Retail Price (MRP) proportionally
                    </span>
                  </label>
                </div>
              )}

              {/* Category Tab */}
              {activeTab === 'category' && (
                <div className="space-y-4">
                  <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <input
                        type="radio"
                        name="catAction"
                        checked={categoryAction === 'SELECT'}
                        onChange={() => setCategoryAction('SELECT')}
                        className="text-blue-600"
                      />
                      Select Existing Category
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <input
                        type="radio"
                        name="catAction"
                        checked={categoryAction === 'NEW'}
                        onChange={() => setCategoryAction('NEW')}
                        className="text-blue-600"
                      />
                      Create New Category
                    </label>
                  </div>

                  {categoryAction === 'SELECT' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Target Category
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                      >
                        <option value="">-- Choose Category --</option>
                        {allCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        New Category Name
                      </label>
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="e.g. Surgical Disposable"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Manufacturer Tab */}
              {activeTab === 'manufacturer' && (
                <div className="space-y-4">
                  <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <input
                        type="radio"
                        name="mfgAction"
                        checked={manufacturerAction === 'SELECT'}
                        onChange={() => setManufacturerAction('SELECT')}
                        className="text-blue-600"
                      />
                      Select Existing Manufacturer / Company
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <input
                        type="radio"
                        name="mfgAction"
                        checked={manufacturerAction === 'NEW'}
                        onChange={() => setManufacturerAction('NEW')}
                        className="text-blue-600"
                      />
                      Enter New Manufacturer Name
                    </label>
                  </div>

                  {manufacturerAction === 'SELECT' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Target Manufacturer
                      </label>
                      <select
                        value={selectedManufacturer}
                        onChange={(e) => setSelectedManufacturer(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                      >
                        <option value="">-- Choose Manufacturer --</option>
                        {allManufacturers.map(mfg => (
                          <option key={mfg} value={mfg}>{mfg}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        New Manufacturer / Company Name
                      </label>
                      <input
                        type="text"
                        value={newManufacturerName}
                        onChange={(e) => setNewManufacturerName(e.target.value)}
                        placeholder="e.g. GSK Pakistan Ltd."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Location & Min Stock Tab */}
              {activeTab === 'location' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Rack Location
                    </label>
                    <input
                      type="text"
                      value={rackLocation}
                      onChange={(e) => setRackLocation(e.target.value)}
                      placeholder="e.g. Rack A-04"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Shelf / Bin Location
                    </label>
                    <input
                      type="text"
                      value={shelfLocation}
                      onChange={(e) => setShelfLocation(e.target.value)}
                      placeholder="e.g. Shelf 3"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Low Stock Threshold (Alert Quantity)
                    </label>
                    <input
                      type="number"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(e.target.value)}
                      placeholder="e.g. 20"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Controlled & Safety Tab */}
              {activeTab === 'controlled' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <strong className="font-bold">Regulatory & Controlled Controls:</strong> Toggling an item to Controlled restricts billing strictly to authorized staff, hides it from normal search, and creates mandatory prescription audit records.
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { 
                        title: 'Controlled / Restricted Item Status', 
                        desc: 'Flag items as narcotics / restricted drugs requiring Special Controlled Sale flow',
                        state: isControlledState, 
                        setter: setIsControlledState 
                      },
                      { 
                        title: 'Show in Normal POS', 
                        desc: 'Whether standard cashier terminals can see and bill this item',
                        state: showInNormalPOSState, 
                        setter: setShowInNormalPOSState 
                      },
                      { 
                        title: 'Show in Normal Search', 
                        desc: 'Whether standard inventory search displays this item',
                        state: showInNormalSearchState, 
                        setter: setShowInNormalSearchState 
                      },
                      { 
                        title: 'Show in Online Store', 
                        desc: 'Allow purchase or display on public e-commerce storefront',
                        state: showInOnlineStoreState, 
                        setter: setShowInOnlineStoreState 
                      },
                      { 
                        title: 'Special Authorization Required', 
                        desc: 'Enforce manager PIN / approval before allowing transaction save',
                        state: specialAccessState, 
                        setter: setSpecialAccessState 
                      },
                    ].map((row, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{row.title}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{row.desc}</div>
                        </div>
                        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
                          <button
                            type="button"
                            onClick={() => row.setter('KEEP')}
                            className={`px-2.5 py-1 font-semibold ${row.state === 'KEEP' ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                          >
                            Unchanged
                          </button>
                          <button
                            type="button"
                            onClick={() => row.setter('ENABLE')}
                            className={`px-2.5 py-1 font-semibold ${row.state === 'ENABLE' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                          >
                            Enable (ON)
                          </button>
                          <button
                            type="button"
                            onClick={() => row.setter('DISABLE')}
                            className={`px-2.5 py-1 font-semibold ${row.state === 'DISABLE' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                          >
                            Disable (OFF)
                          </button>
                        </div>
                      </div>
                    ))}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Regulatory Schedule (e.g. Schedule G / Form 9 / Psychotropic)
                      </label>
                      <input
                        type="text"
                        value={regulatorySchedule}
                        onChange={(e) => setRegulatorySchedule(e.target.value)}
                        placeholder="e.g. Schedule G - Controlled Substance"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Batch Delete Tab */}
              {activeTab === 'delete' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-xs text-red-900 dark:text-red-300 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
                    <div>
                      <strong className="font-bold text-sm block mb-1">Permanent Batch Deletion Warning</strong>
                      You are about to permanently delete <span className="font-bold underline">{count} products</span> from your inventory database. This action cannot be undone.
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Type <span className="text-red-600 font-mono font-bold">DELETE</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="w-full px-4 py-2.5 rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 outline-hidden font-mono"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Confirmation Step */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-blue-950 dark:text-blue-200">
                    Ready to apply changes to {count} selected products
                  </div>
                  <div className="text-xs text-blue-800 dark:text-blue-300">
                    Operation: <span className="font-bold uppercase">{activeTab}</span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <tr>
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-3">Manufacturer</th>
                      <th className="py-2 px-3">Current Price</th>
                      <th className="py-2 px-3">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {selectedMedicines.slice(0, 10).map(m => (
                      <tr key={m.id}>
                        <td className="py-1.5 px-3 font-medium text-slate-900 dark:text-white">{m.name}</td>
                        <td className="py-1.5 px-3 text-slate-500">{m.manufacturer}</td>
                        <td className="py-1.5 px-3 font-mono">{formatCurrency(m.sellingPrice || 0)}</td>
                        <td className="py-1.5 px-3 font-mono">{m.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selectedMedicines.length > 10 && (
                  <div className="py-2 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    + {selectedMedicines.length - 10} more items...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={() => {
              if (isConfirmStep) {
                setIsConfirmStep(false);
              } else {
                onClose();
              }
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            {isConfirmStep ? 'Back to Options' : 'Cancel'}
          </button>

          {!isConfirmStep ? (
            <button
              type="button"
              onClick={() => setIsConfirmStep(true)}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md shadow-blue-500/20 flex items-center gap-2"
            >
              Review & Proceed
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isApplying}
              onClick={handleApplyChanges}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition shadow-md flex items-center gap-2 ${
                activeTab === 'delete'
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
              } disabled:opacity-50`}
            >
              {isApplying ? (
                <>Applying changes...</>
              ) : activeTab === 'delete' ? (
                <>Confirm Delete ({count} Items)</>
              ) : (
                <>Confirm & Apply ({count} Items)</>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
