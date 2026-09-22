import React, { useState } from 'react';
import { 
  Info, ChevronRight, CheckCircle2, Truck, DollarSign, 
  Layers, Lock, Sparkles, Hash, Plus, Trash2, X, ShieldAlert, Edit2, Check
} from 'lucide-react';
import { useSettings, WarrantyCustomField } from '../../contexts/SettingsContext';

export const TransactionTab: React.FC = () => {
  const { settings, updateTransaction, updateItem, updatePrint } = useSettings();

  // Submodals state
  const [isCountModalOpen, setIsCountModalOpen] = useState(false);
  const [isAdditionalFieldsModalOpen, setIsAdditionalFieldsModalOpen] = useState(false);
  const [isWarrantyFieldsModalOpen, setIsWarrantyFieldsModalOpen] = useState(false);
  const [isTransportModalOpen, setIsTransportModalOpen] = useState(false);
  const [isChargesModalOpen, setIsChargesModalOpen] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const prefixes = settings.transaction.prefixes;
  const handlePrefixChange = (key: keyof typeof prefixes, val: string) => {
    updateTransaction({
      prefixes: {
        ...prefixes,
        [key]: val,
      },
    });
  };

  const [newFieldName, setNewFieldName] = useState('');
  const handleAddCustomField = () => {
    if (!newFieldName.trim()) return;
    const newField = {
      id: `f-${Date.now()}`,
      name: newFieldName.trim(),
      enabled: true,
      showInPrint: true,
    };
    updateTransaction({
      additionalFields: [...settings.transaction.additionalFields, newField],
    });
    setNewFieldName('');
    showToast('Custom field added');
  };

  // Warranty Custom Fields Management
  const warrantyFields: WarrantyCustomField[] = settings.transaction.warrantyCustomFields || settings.item?.warrantyCustomFields || [
    { id: 'wcf-1', name: 'Warranty Type', enabled: true, defaultValue: 'Replacement', placeholder: 'e.g. Replacement / Repair / Service' },
    { id: 'wcf-2', name: 'Warranty Period', enabled: true, defaultValue: '1 Year', placeholder: 'e.g. 1 Year / 6 Months / 30 Days' },
  ];

  const [newWarrantyFieldName, setNewWarrantyFieldName] = useState('');
  const [newWarrantyDefaultVal, setNewWarrantyDefaultVal] = useState('');
  const [newWarrantyPlaceholder, setNewWarrantyPlaceholder] = useState('');
  const [editingWarrantyId, setEditingWarrantyId] = useState<string | null>(null);
  const [editWarrantyName, setEditWarrantyName] = useState('');
  const [editWarrantyDefaultVal, setEditWarrantyDefaultVal] = useState('');

  const handleAddWarrantyField = () => {
    if (!newWarrantyFieldName.trim()) return;
    const newField: WarrantyCustomField = {
      id: `wcf-${Date.now()}`,
      name: newWarrantyFieldName.trim(),
      enabled: true,
      defaultValue: newWarrantyDefaultVal.trim() || undefined,
      placeholder: newWarrantyPlaceholder.trim() || `Enter ${newWarrantyFieldName.trim()}`,
    };
    updateTransaction({
      warrantyCustomFields: [...warrantyFields, newField],
    });
    setNewWarrantyFieldName('');
    setNewWarrantyDefaultVal('');
    setNewWarrantyPlaceholder('');
    showToast(`Warranty field "${newField.name}" added`);
  };

  const handleDeleteWarrantyField = (id: string) => {
    const updated = warrantyFields.filter(f => f.id !== id);
    updateTransaction({
      warrantyCustomFields: updated,
    });
    showToast('Warranty field removed');
  };

  const handleToggleWarrantyField = (id: string) => {
    const updated = warrantyFields.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f);
    updateTransaction({
      warrantyCustomFields: updated,
    });
  };

  const handleSaveEditWarranty = (id: string) => {
    if (!editWarrantyName.trim()) return;
    const updated = warrantyFields.map(f => f.id === id ? {
      ...f,
      name: editWarrantyName.trim(),
      defaultValue: editWarrantyDefaultVal.trim() || undefined
    } : f);
    updateTransaction({
      warrantyCustomFields: updated,
    });
    setEditingWarrantyId(null);
    showToast('Warranty field updated');
  };

  const handleToggleField = (id: string, key: 'enabled' | 'showInPrint') => {
    updateTransaction({
      additionalFields: settings.transaction.additionalFields.map(f => 
        f.id === id ? { ...f, [key]: !f[key] } : f
      ),
    });
  };

  const handleDeleteField = (id: string) => {
    updateTransaction({
      additionalFields: settings.transaction.additionalFields.filter(f => f.id !== id),
    });
    showToast('Custom field removed');
  };

  return (
    <div className="space-y-6 text-slate-800 text-[13px] relative">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Options Bar (Vyapar style horizontal grid) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
          
          {/* Billing Name */}
          <div className="flex items-center justify-between gap-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.transaction.billingNameOfParties}
                onChange={(e) => updateTransaction({ billingNameOfParties: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="font-medium text-slate-800 text-xs">Billing Name of Parties</span>
            </label>
            <span title="Separate trade/billing name on invoices from actual ledger party name"><Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /></span>
          </div>

          {/* Customer PO Details */}
          <div className="flex items-center justify-between gap-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.transaction.customerPoDetails}
                onChange={(e) => updateTransaction({ customerPoDetails: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="font-medium text-slate-800 text-xs truncate">Customers P.O. Details</span>
            </label>
            <span title="Record customer purchase order numbers and PO dates on sale invoices"><Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /></span>
          </div>

          {/* Free Item Quantity */}
          <div className="flex items-center justify-between gap-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.transaction.freeItemQuantity}
                onChange={(e) => updateTransaction({ freeItemQuantity: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="font-medium text-slate-800 text-xs">Free Item Quantity</span>
            </label>
            <span title="Scheme quantity / Buy X Get Y Free column without affecting rate calculation"><Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /></span>
          </div>

          {/* Count */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.transaction.countLabelEnabled}
                  onChange={(e) => updateTransaction({ countLabelEnabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800 text-xs">Count</span>
              </label>
              <button
                onClick={() => setIsCountModalOpen(true)}
                className="text-[10.5px] text-blue-600 font-bold hover:underline"
              >
                [Change Text]
              </button>
            </div>
            <span title="Displays summary count of items/units at bottom of transaction tables"><Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /></span>
          </div>

          {/* Round Off */}
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-xs font-medium text-slate-600">Round off:</span>
            <select
              value={settings.transaction.roundOffType}
              onChange={(e: any) => updateTransaction({ roundOffType: e.target.value })}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500"
            >
              <option value="Nearest">Nearest</option>
              <option value="None">None</option>
              <option value="Up">Up (+)</option>
              <option value="Down">Down (-)</option>
            </select>
            <span className="text-xs text-slate-500">To:</span>
            <select
              value={settings.transaction.roundOffValue}
              onChange={(e) => updateTransaction({ roundOffValue: Number(e.target.value) })}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-blue-500"
            >
              <option value={1}>1</option>
              <option value={0.5}>0.5</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>
          </div>

        </div>
      </div>

      {/* Main 2 Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: More Transaction Features & Sub-Drawers */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
            <h3 className="font-bold text-slate-900 text-xs tracking-wider uppercase text-slate-500 pb-1 border-b border-slate-100 flex items-center justify-between">
              <span>More Transaction Features</span>
              <span className="text-[10px] text-blue-600 font-normal">Advanced Automation</span>
            </h3>

            <div className="space-y-3">
              {/* Item-wise Discount Column (DISC %) */}
              <div className="flex items-center justify-between p-2 bg-blue-50/40 rounded-lg border border-blue-100">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.item.itemWiseDiscount !== false && settings.print.tableColumns?.discount !== false}
                    onChange={(e) => {
                      const val = e.target.checked;
                      updateItem({ itemWiseDiscount: val });
                      updatePrint({
                        tableColumns: {
                          ...settings.print.tableColumns,
                          discount: val,
                        },
                      });
                      showToast(val ? 'Discount column enabled on sales/purchases' : 'Discount column disabled on sales/purchases');
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-slate-800 font-semibold text-xs">Item-wise Discount Column (DISC %)</span>
                </label>
                <span title="Show or hide DISC % column on Sales & Purchase invoice tables"><Info className="w-3.5 h-3.5 text-blue-500" /></span>
              </div>

              {/* Quick Entry */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.transaction.quickEntry}
                    onChange={(e) => updateTransaction({ quickEntry: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-slate-800 font-medium">Quick Entry Mode</span>
                </label>
                <span title="Enables lightning-fast barcode barcode-only billing without popups"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>

              {/* Show Recent Rates on Focus */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.transaction.showRecentRatesOnFocus !== false}
                    onChange={(e) => updateTransaction({ showRecentRatesOnFocus: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-slate-800 font-medium">Show Recent Rates Popover (Last 5)</span>
                </label>
                <span title="Shows the last 5 purchase/sale rates directly underneath the price field"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>

              {/* Show Company Name in Recent Rates */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.transaction.showCompanyInRecentRates !== false}
                    onChange={(e) => updateTransaction({ showCompanyInRecentRates: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-slate-800 font-medium">Show Company Name in Recent Rates</span>
                </label>
                <span title="Displays medicine manufacturer/company and distributor/supplier with rates"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>

              {/* Do not show invoice preview */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.transaction.doNotShowInvoicePreview}
                    onChange={(e) => updateTransaction({ doNotShowInvoicePreview: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-slate-800 font-medium">Do not Show Invoice Preview</span>
                </label>
                <span title="Directly saves transaction and opens thermal print dialog"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>

              {/* Passcode for transaction edit/delete */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.transaction.enablePasscodeForTxn}
                    onChange={(e) => updateTransaction({ enablePasscodeForTxn: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-slate-800 font-medium">Enable Passcode for transaction edit/delete</span>
                </label>
                <span title="Requires supervisor PIN to alter or delete historic bills"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>

              {/* Discount during payments */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.transaction.discountDuringPayments}
                    onChange={(e) => updateTransaction({ discountDuringPayments: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-slate-800 font-medium">Discount During Payments</span>
                </label>
                <span title="Allow cash discount settlement while recording Payment In"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>

              {/* Link payments to invoices */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.transaction.linkPaymentsToInvoices}
                    onChange={(e) => updateTransaction({ linkPaymentsToInvoices: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-slate-800 font-medium">Link Payments to Invoices (FIFO / Manual Knock-off)</span>
                </label>
                <span title="Knock off specific unpaid bills when party pays"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>

              {/* Due dates and payment terms */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.transaction.dueDatesAndPaymentTerms}
                    onChange={(e) => updateTransaction({ dueDatesAndPaymentTerms: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-slate-800 font-medium">Due Dates and Payment Terms (Net 15 / Net 30)</span>
                </label>
                <span title="Calculate due dates automatically based on credit terms"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>

              {/* Show Profit while making Sale Invoice */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.transaction.showProfitOnSale}
                    onChange={(e) => updateTransaction({ showProfitOnSale: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-slate-800 font-medium">Show Profit while making Sale Invoice</span>
                </label>
                <span title="Displays live gross margin and estimated profit during billing"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>
            </div>

            {/* ITEM AUTOCOMPLETE & SEARCH DROPDOWN DISPLAY SETTINGS */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Item Search & Autocomplete Dropdown Settings</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Control which product metadata appears in the rapid add (⚡) and table item search popups
                  </p>
                </div>
              </div>

              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  
                  {/* Purchase Rate Toggle */}
                  <label className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.transaction.showPurchasePriceInAutocomplete !== false}
                        onChange={(e) => {
                          updateTransaction({ showPurchasePriceInAutocomplete: e.target.checked });
                          showToast(`Purchase Rate display ${e.target.checked ? 'enabled' : 'disabled'}`);
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-800">Show Purchase Rate</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                      Pur. Rate
                    </span>
                  </label>

                  {/* Batch Number Toggle */}
                  <label className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.transaction.showBatchInAutocomplete !== false}
                        onChange={(e) => {
                          updateTransaction({ showBatchInAutocomplete: e.target.checked });
                          showToast(`Batch display ${e.target.checked ? 'enabled' : 'disabled'}`);
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-800">Show Batch</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      Batch No
                    </span>
                  </label>

                  {/* MRP Toggle */}
                  <label className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.transaction.showMrpInAutocomplete !== false}
                        onChange={(e) => {
                          updateTransaction({ showMrpInAutocomplete: e.target.checked });
                          showToast(`MRP display ${e.target.checked ? 'enabled' : 'disabled'}`);
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-800">Show MRP</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      MRP
                    </span>
                  </label>

                  {/* Stock Quantity Toggle */}
                  <label className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.transaction.showStockInAutocomplete !== false}
                        onChange={(e) => {
                          updateTransaction({ showStockInAutocomplete: e.target.checked });
                          showToast(`Stock display ${e.target.checked ? 'enabled' : 'disabled'}`);
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-800">Show Stock</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Qty Available
                    </span>
                  </label>

                  {/* Sale Price Toggle */}
                  <label className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.transaction.showSalePriceInAutocomplete !== false}
                        onChange={(e) => {
                          updateTransaction({ showSalePriceInAutocomplete: e.target.checked });
                          showToast(`Sale Price display ${e.target.checked ? 'enabled' : 'disabled'}`);
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-800">Show Sale Price</span>
                    </div>
                    <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-bold">
                      Rs Rate
                    </span>
                  </label>

                  {/* Expiry Date Toggle */}
                  <label className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.transaction.showExpDateInAutocomplete === true}
                        onChange={(e) => {
                          updateTransaction({ showExpDateInAutocomplete: e.target.checked });
                          showToast(`Expiry Date display ${e.target.checked ? 'enabled' : 'disabled'}`);
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-800">Show Expiry Date</span>
                    </div>
                    <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                      MM/YYYY
                    </span>
                  </label>

                </div>

                {/* Live Preview Box */}
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Live Search Dropdown Preview:
                  </div>
                  <div className="bg-white border border-blue-200 rounded-lg p-2.5 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900">Augmentin 625mg Tablet</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {settings.transaction.showBatchInAutocomplete !== false && (
                          <span>Batch: <span className="font-mono text-slate-700 font-medium">AG-882</span></span>
                        )}
                        {settings.transaction.showBatchInAutocomplete !== false && settings.transaction.showStockInAutocomplete !== false && <span className="text-slate-300">|</span>}
                        {settings.transaction.showStockInAutocomplete !== false && (
                          <span>Stock: <strong className="text-emerald-700 font-bold">45</strong> (Box)</span>
                        )}
                        {(settings.transaction.showBatchInAutocomplete !== false || settings.transaction.showStockInAutocomplete !== false) && settings.transaction.showMrpInAutocomplete !== false && <span className="text-slate-300">|</span>}
                        {settings.transaction.showMrpInAutocomplete !== false && (
                          <span>MRP: <span className="font-mono text-slate-700">Rs 800</span></span>
                        )}
                        {settings.transaction.showPurchasePriceInAutocomplete !== false && (
                          <span className="text-amber-800 font-semibold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                            Pur. Rate: <span className="font-mono font-bold">Rs 620</span>
                          </span>
                        )}
                        {settings.transaction.showExpDateInAutocomplete && (
                          <span className="text-purple-800 font-medium bg-purple-50 px-1 py-0.2 rounded border border-purple-200">
                            Exp: <span className="font-mono">12/2027</span>
                          </span>
                        )}
                      </div>
                    </div>
                    {settings.transaction.showSalePriceInAutocomplete !== false && (
                      <div className="text-right flex-shrink-0 pl-2">
                        <span className="font-black font-mono text-blue-700 text-sm">Rs 720</span>
                        <div className="text-[9px] text-slate-400">Sale Rate</div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Custom Modals Triggers */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={() => setIsWarrantyFieldsModalOpen(true)}
                className="w-full flex items-center justify-between p-2.5 bg-amber-50/80 hover:bg-amber-100/80 text-amber-900 rounded-xl transition-all font-semibold text-xs border border-amber-200"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Warranty Custom Fields ({warrantyFields.length})</span>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-500" />
              </button>

              <button
                onClick={() => setIsAdditionalFieldsModalOpen(true)}
                className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl transition-all font-semibold text-xs border border-slate-100"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Additional Fields</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setIsTransportModalOpen(true)}
                className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl transition-all font-semibold text-xs border border-slate-100"
              >
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span>Transportation Details</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setIsChargesModalOpen(true)}
                className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl transition-all font-semibold text-xs border border-slate-100"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span>Additional Charges (Freight, Packaging, Insurance)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

          </div>
        </div>

        {/* Right Column: Transaction Prefixes */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-xs tracking-wider uppercase text-slate-500">
                Transaction Prefixes
              </h3>
              <span className="text-[11px] text-blue-600 font-semibold">
                Auto-increment Series
              </span>
            </div>

            {/* Firm Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Select Firm for Series:</label>
              <select className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800">
                {settings.general.firms.map(f => (
                  <option key={f.id} value={f.name}>{f.name} {f.isDefault ? '(DEFAULT)' : ''}</option>
                ))}
              </select>
            </div>

            {/* Prefixes Table / Inputs matching Screenshot 2 */}
            <div className="space-y-2.5">
              {[
                { key: 'sale', label: 'Sale Invoice', defaultPref: 'INV-' },
                { key: 'creditNote', label: 'Credit Note / Return', defaultPref: 'CN-' },
                { key: 'saleOrder', label: 'Sale Order', defaultPref: 'SO-' },
                { key: 'purchaseOrder', label: 'Purchase Order', defaultPref: 'PO-' },
                { key: 'estimate', label: 'Estimate / Quotation', defaultPref: 'EST-' },
                { key: 'deliveryChallan', label: 'Delivery Challan', defaultPref: 'DC-' },
                { key: 'paymentIn', label: 'Payment In', defaultPref: 'REC-' },
                { key: 'purchaseBill', label: 'Purchase Bill', defaultPref: 'BILL-' },
                { key: 'debitNote', label: 'Debit Note / Return', defaultPref: 'DN-' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3 py-1 border-b border-slate-100 last:border-0">
                  <span className="text-xs font-medium text-slate-700">{item.label}</span>
                  <div className="flex items-center gap-1.5 w-44">
                    <input
                      type="text"
                      placeholder={item.defaultPref}
                      value={prefixes[item.key as keyof typeof prefixes] || ''}
                      onChange={(e) => handlePrefixChange(item.key as keyof typeof prefixes, e.target.value)}
                      className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 text-center uppercase focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handlePrefixChange(item.key as keyof typeof prefixes, '')}
                      className="text-[10px] text-slate-400 hover:text-slate-700 px-1 py-0.5 rounded"
                      title="Clear Prefix"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11.5px] text-blue-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Smart Auto-Numbering Example:</span>
              </p>
              <p className="font-mono text-[11px] text-blue-900 bg-white/70 p-1.5 rounded border border-blue-200">
                {prefixes.sale || 'INV-'}0001, {prefixes.sale || 'INV-'}0002, {prefixes.sale || 'INV-'}0003...
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* Count Modal */}
      {isCountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-base">Custom Count Label</h3>
            <p className="text-xs text-slate-500">Define the text shown in invoice summary row</p>
            <input
              type="text"
              value={settings.transaction.countLabelText}
              onChange={(e) => updateTransaction({ countLabelText: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsCountModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Additional Fields Modal */}
      {isAdditionalFieldsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Additional Header Fields</h3>
              <button onClick={() => setIsAdditionalFieldsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New Field Name (e.g. Sales Agent, Driver License)"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
                <button
                  onClick={handleAddCustomField}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {settings.transaction.additionalFields.map(field => (
                  <div key={field.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{field.name}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.showInPrint}
                          onChange={() => handleToggleField(field.id, 'showInPrint')}
                          className="w-3.5 h-3.5 text-blue-600 rounded"
                        />
                        <span className="text-[11px] text-slate-600">Print</span>
                      </label>
                      <button onClick={() => handleDeleteField(field.id)} className="text-rose-500 hover:text-rose-700">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsAdditionalFieldsModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transportation Details Modal */}
      {isTransportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <span>Transportation Details</span>
              </h3>
              <button onClick={() => setIsTransportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                <label className="font-semibold text-slate-800">Enable Transportation Section</label>
                <input
                  type="checkbox"
                  checked={settings.transaction.transportDetails.enabled}
                  onChange={(e) => updateTransaction({
                    transportDetails: { ...settings.transaction.transportDetails, enabled: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>

              {settings.transaction.transportDetails.enabled && (
                <div className="space-y-2 pl-2">
                  {[
                    { key: 'transportName', label: 'Transporter Name / Carrier' },
                    { key: 'vehicleNo', label: 'Vehicle / Truck Number' },
                    { key: 'lrNo', label: 'LR No. / Bilty Number' },
                    { key: 'deliveryLocation', label: 'Delivery Destination / Station' },
                  ].map(item => (
                    <label key={item.key} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <span className="text-slate-700">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={(settings.transaction.transportDetails as any)[item.key]}
                        onChange={(e) => updateTransaction({
                          transportDetails: { ...settings.transaction.transportDetails, [item.key]: e.target.checked }
                        })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsTransportModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Additional Charges Modal */}
      {isChargesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span>Additional Charges Configuration</span>
              </h3>
              <button onClick={() => setIsChargesModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                <label className="font-semibold text-slate-800">Enable Additional Charges in Invoices</label>
                <input
                  type="checkbox"
                  checked={settings.transaction.additionalCharges.enabled}
                  onChange={(e) => updateTransaction({
                    additionalCharges: { ...settings.transaction.additionalCharges, enabled: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>

              {settings.transaction.additionalCharges.enabled && (
                <div className="space-y-2 pl-2">
                  {[
                    { key: 'shipping', label: 'Shipping / Freight Charges' },
                    { key: 'packaging', label: 'Packaging & Handling' },
                    { key: 'insurance', label: 'Transit Insurance' },
                    { key: 'labor', label: 'Labor / Loading Charges' },
                  ].map(item => (
                    <label key={item.key} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <span className="text-slate-700">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={(settings.transaction.additionalCharges as any)[item.key]}
                        onChange={(e) => updateTransaction({
                          additionalCharges: { ...settings.transaction.additionalCharges, [item.key]: e.target.checked }
                        })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsChargesModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warranty Custom Fields Configuration Modal */}
      {isWarrantyFieldsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <span>Warranty & Guarantee Custom Fields</span>
              </h3>
              <button onClick={() => setIsWarrantyFieldsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Add, remove, or rename custom fields for warranty details (e.g. Warranty Type, Warranty Period, Serial Codes). These fields appear during sales checkout when warranty is active.
            </p>

            {/* Add New Field Box */}
            <div className="space-y-2 bg-amber-50/70 p-3 rounded-xl border border-amber-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Field Name (e.g. Warranty Period)"
                  value={newWarrantyFieldName}
                  onChange={(e) => setNewWarrantyFieldName(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500"
                />
                <input
                  type="text"
                  placeholder="Default Value (e.g. 1 Year)"
                  value={newWarrantyDefaultVal}
                  onChange={(e) => setNewWarrantyDefaultVal(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Placeholder hint (e.g. e.g. 12 Months)"
                  value={newWarrantyPlaceholder}
                  onChange={(e) => setNewWarrantyPlaceholder(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddWarrantyField}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Field
                </button>
              </div>
            </div>

            {/* Existing List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {warrantyFields.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No warranty fields configured. Add custom fields above.
                </div>
              ) : (
                warrantyFields.map(field => (
                  <div key={field.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    {editingWarrantyId === field.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editWarrantyName}
                          onChange={(e) => setEditWarrantyName(e.target.value)}
                          placeholder="Field Name"
                          className="flex-1 px-2 py-1 bg-white border border-amber-400 rounded text-xs font-bold"
                        />
                        <input
                          type="text"
                          value={editWarrantyDefaultVal}
                          onChange={(e) => setEditWarrantyDefaultVal(e.target.value)}
                          placeholder="Default Value"
                          className="w-28 px-2 py-1 bg-white border border-amber-400 rounded text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditWarranty(field.id)}
                          className="p-1 text-emerald-600 hover:text-emerald-800"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingWarrantyId(null)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={field.enabled}
                            onChange={() => handleToggleWarrantyField(field.id)}
                            className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-slate-900 text-xs">{field.name}</span>
                            {field.defaultValue && (
                              <span className="ml-2 text-[10px] bg-slate-200 text-slate-700 font-mono px-1.5 py-0.2 rounded font-semibold">
                                {field.defaultValue}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingWarrantyId(field.id);
                              setEditWarrantyName(field.name);
                              setEditWarrantyDefaultVal(field.defaultValue || '');
                            }}
                            className="text-slate-400 hover:text-blue-600 p-1 rounded"
                            title="Edit / Rename"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWarrantyField(field.id)}
                            className="text-rose-400 hover:text-rose-600 p-1 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsWarrantyFieldsModalOpen(false)}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
