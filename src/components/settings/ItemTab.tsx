import React, { useState } from 'react';
import { 
  Package, Info, CheckCircle2, QrCode, Boxes, 
  Layers, Sparkles, Tag, Calendar, Hash, X, Plus, Trash2, Edit2, ShieldAlert, Check 
} from 'lucide-react';
import { useSettings, WarrantyCustomField } from '../../contexts/SettingsContext';

export const ItemTab: React.FC = () => {
  const { settings, updateItem, updatePrint } = useSettings();

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const itemConf = settings.item;
  const warrantyFields: WarrantyCustomField[] = itemConf.warrantyCustomFields || settings.transaction?.warrantyCustomFields || [
    { id: 'wcf-1', name: 'Warranty Type', enabled: true, defaultValue: 'Replacement', placeholder: 'e.g. Replacement / Repair / Service' },
    { id: 'wcf-2', name: 'Warranty Period', enabled: true, defaultValue: '1 Year', placeholder: 'e.g. 1 Year / 6 Months / 30 Days' },
  ];

  const [newCustomFieldName, setNewCustomFieldName] = useState('');
  const handleAddCustomField = () => {
    if (!newCustomFieldName.trim()) return;
    const newField = {
      id: `icf-${Date.now()}`,
      name: newCustomFieldName.trim(),
      enabled: true,
    };
    updateItem({
      itemCustomFields: [...itemConf.itemCustomFields, newField],
    });
    setNewCustomFieldName('');
    showToast('Custom item field added');
  };

  const handleDeleteCustomField = (id: string) => {
    updateItem({
      itemCustomFields: itemConf.itemCustomFields.filter(f => f.id !== id),
    });
    showToast('Custom field removed');
  };

  // Warranty Custom Fields Handlers
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
    updateItem({
      warrantyCustomFields: [...warrantyFields, newField],
    });
    setNewWarrantyFieldName('');
    setNewWarrantyDefaultVal('');
    setNewWarrantyPlaceholder('');
    showToast(`Warranty field "${newField.name}" added`);
  };

  const handleDeleteWarrantyField = (id: string) => {
    const updated = warrantyFields.filter(f => f.id !== id);
    updateItem({
      warrantyCustomFields: updated,
    });
    showToast('Warranty field removed');
  };

  const handleToggleWarrantyField = (id: string) => {
    const updated = warrantyFields.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f);
    updateItem({
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
    updateItem({
      warrantyCustomFields: updated,
    });
    setEditingWarrantyId(null);
    showToast('Warranty field updated');
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

      {/* 2 Column Grid matching Screenshot 10 & 11 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Item Settings */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-xs tracking-wider uppercase text-slate-500 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-blue-600" />
              <span>Item Inventory Settings</span>
            </h3>
            <span className="text-[10px] text-blue-600 font-normal">Catalog & Units</span>
          </div>

          <div className="space-y-3">
            
            {/* Enable Item */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={itemConf.enableItem}
                  onChange={(e) => updateItem({ enableItem: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-900">Enable Item Catalog (Products / Items)</span>
              </label>
              <span title="Main product and inventory registry"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

            {/* Barcode Scan */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={itemConf.barcodeScan}
                  onChange={(e) => updateItem({ barcodeScan: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">Barcode Scan</span>
              </label>
              <span title="Enable USB/Bluetooth barcode scanner search in all billing screens"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

            {/* Stock Maintenance */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={itemConf.stockMaintenance}
                  onChange={(e) => updateItem({ stockMaintenance: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">Stock Maintenance</span>
              </label>
              <span title="Track in-stock quantities, reorder levels, and physical stock counts"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

            {/* Manufacturing */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={itemConf.manufacturing}
                  onChange={(e) => updateItem({ manufacturing: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">Manufacturing (Bill of Materials / BOM)</span>
              </label>
              <span title="Assemble finished surgical kits and pharmaceutical formulations from raw materials"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

            {/* Show Low Stock Dialog */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={itemConf.showLowStockDialog}
                  onChange={(e) => updateItem({ showLowStockDialog: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">Show Low Stock Alert Dialog</span>
              </label>
              <span title="Popup notification when selling an item that drops below minimum stock"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

            {/* Items Unit */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={itemConf.itemsUnit}
                    onChange={(e) => updateItem({ itemsUnit: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-800">Items Unit</span>
                </label>
                <span title="Support secondary unit conversions (e.g. 1 Box = 10 Strips)"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>

              {itemConf.itemsUnit && (
                <div className="pl-6 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Default Unit:</span>
                  <select
                    value={itemConf.defaultUnit}
                    onChange={(e) => updateItem({ defaultUnit: e.target.value })}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                  >
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="BOX">BOX</option>
                    <option value="STRIP">STRIP</option>
                    <option value="PACK">PACK</option>
                    <option value="VIAL">VIAL</option>
                    <option value="KG">KG</option>
                    <option value="LTR">LTR</option>
                    <option value="DOZEN">DOZEN</option>
                  </select>
                </div>
              )}
            </div>

            {/* Item Category */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={itemConf.itemCategory}
                  onChange={(e) => updateItem({ itemCategory: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">Item Category</span>
              </label>
              <span title="Organize catalog by categories (Surgical Instruments, Antibiotics, Syringes, Gloves)"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

            {/* Party Wise Item Rate */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={itemConf.partyWiseItemRate}
                  onChange={(e) => updateItem({ partyWiseItemRate: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">Party Wise Item Rate</span>
              </label>
              <span title="Remember last special contracted selling price per customer"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

            {/* Item wise Tax & Discount */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={itemConf.itemWiseTax}
                  onChange={(e) => updateItem({ itemWiseTax: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="font-medium text-slate-800 text-xs">Item-wise Tax Rate</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={itemConf.itemWiseDiscount !== false && settings.print?.tableColumns?.discount !== false}
                  onChange={(e) => {
                    const val = e.target.checked;
                    updateItem({ itemWiseDiscount: val });
                    updatePrint({
                      tableColumns: {
                        ...settings.print.tableColumns,
                        discount: val,
                      },
                    });
                    showToast(val ? 'Item-wise discount enabled' : 'Item-wise discount disabled');
                  }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="font-medium text-slate-800 text-xs">Item-wise Discount</span>
              </label>
            </div>

            {/* Quantity decimal places */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700">Quantity (upto Decimal Places):</span>
              <select
                value={itemConf.quantityDecimals}
                onChange={(e) => updateItem({ quantityDecimals: Number(e.target.value) })}
                className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-800"
              >
                <option value={0}>0 (10)</option>
                <option value={1}>1 (10.5)</option>
                <option value={2}>2 (10.50)</option>
                <option value={3}>3 (10.500)</option>
              </select>
            </div>

            {/* Wholesale Price */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={itemConf.wholesalePrice}
                  onChange={(e) => updateItem({ wholesalePrice: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">Wholesale & Minimum Order Price</span>
              </label>
              <span title="Separate bulk wholesale tier pricing"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

            {/* Online Store */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={itemConf.onlineStore}
                  onChange={(e) => updateItem({ onlineStore: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">Online Store & Digital Catalog</span>
              </label>
              <span title="Publish catalog online for customers to browse & place orders"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

          </div>
        </div>

        {/* Right Column: Additional Item Fields matching Screenshot 10 & 11 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-xs tracking-wider uppercase text-slate-500 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Additional Item Tracking Fields</span>
            </h3>
            <span className="text-[10px] text-blue-600 font-normal">Batches, Expiry & Serials</span>
          </div>

          <div className="space-y-3 text-xs">
            
            {/* MRP */}
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={itemConf.mrp}
                  onChange={(e) => updateItem({ mrp: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span>MRP / Maximum Retail Price</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">MRP</span>
            </div>

            {/* Serial No Tracking */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemConf.serialTracking}
                    onChange={(e) => updateItem({ serialTracking: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Serial No. / IMEI Tracking</span>
                </label>
                <span className="text-[11px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">Serial No.</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Track individual unit serial numbers for surgical machinery and electronic instruments.
              </p>
            </div>

            {/* Batch Tracking Box */}
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 font-bold text-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemConf.batchTracking}
                    onChange={(e) => updateItem({ batchTracking: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Pharma Batch Tracking & Expiry Controls</span>
                </label>
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              </div>

              {itemConf.batchTracking && (
                <div className="space-y-2.5 pl-2 pt-1 border-t border-blue-100">
                  
                  {/* Batch No */}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">Batch Number</span>
                    <input
                      type="text"
                      readOnly
                      value="Batch No."
                      className="w-32 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-700 text-xs"
                    />
                  </div>

                  {/* Exp Date */}
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                      <input
                        type="checkbox"
                        checked={itemConf.expDate}
                        onChange={(e) => updateItem({ expDate: e.target.checked })}
                        className="w-3.5 h-3.5 text-blue-600 rounded"
                      />
                      <span>Expiry Date (Exp)</span>
                    </label>
                    <select
                      value={itemConf.expDateFormat}
                      onChange={(e: any) => updateItem({ expDateFormat: e.target.value })}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                    >
                      <option value="mm/yy">mm/yy (e.g. 08/29)</option>
                      <option value="dd/mm/yy">dd/mm/yy</option>
                      <option value="yyyy-mm-dd">yyyy-mm-dd</option>
                    </select>
                  </div>

                  {/* Mfg Date */}
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                      <input
                        type="checkbox"
                        checked={itemConf.mfgDate}
                        onChange={(e) => updateItem({ mfgDate: e.target.checked })}
                        className="w-3.5 h-3.5 text-blue-600 rounded"
                      />
                      <span>Manufacturing Date (Mfg)</span>
                    </label>
                    <select
                      value={itemConf.mfgDateFormat}
                      onChange={(e: any) => updateItem({ mfgDateFormat: e.target.value })}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                    >
                      <option value="dd/mm/yy">dd/mm/yy</option>
                      <option value="mm/yy">mm/yy</option>
                      <option value="yyyy-mm-dd">yyyy-mm-dd</option>
                    </select>
                  </div>

                  {/* Model & Size */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={itemConf.modelNo}
                        onChange={(e) => updateItem({ modelNo: e.target.checked })}
                        className="w-3.5 h-3.5 text-blue-600 rounded"
                      />
                      <span className="text-slate-800">Model No.</span>
                    </label>
                    <label className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={itemConf.size}
                        onChange={(e) => updateItem({ size: e.target.checked })}
                        className="w-3.5 h-3.5 text-blue-600 rounded"
                      />
                      <span className="text-slate-800">Size / Gauge</span>
                    </label>
                  </div>

                  {/* Inventory Stock Rotation Engine: FIFO vs FEFO */}
                  <div className="pt-2 border-t border-blue-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">Inventory Stock Rotation Priority</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {itemConf.stockRotationMethod || 'FIFO'} Active
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* FIFO Option */}
                      <div
                        onClick={() => updateItem({ stockRotationMethod: 'FIFO' })}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                          (itemConf.stockRotationMethod || 'FIFO') === 'FIFO'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">FIFO (First In, First Out)</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            (itemConf.stockRotationMethod || 'FIFO') === 'FIFO'
                              ? 'bg-blue-800 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            Oldest Purchase First
                          </span>
                        </div>
                        <p className={`text-[10px] leading-tight ${
                          (itemConf.stockRotationMethod || 'FIFO') === 'FIFO' ? 'text-blue-100' : 'text-slate-500'
                        }`}>
                          Prioritizes stock by earliest Purchase / Received Date. Standard accounting & general wholesale flow.
                        </p>
                      </div>

                      {/* FEFO Option */}
                      <div
                        onClick={() => updateItem({ stockRotationMethod: 'FEFO' })}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                          itemConf.stockRotationMethod === 'FEFO'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">FEFO (First Expiry, First Out)</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            itemConf.stockRotationMethod === 'FEFO'
                              ? 'bg-emerald-800 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            Earliest Expiry First
                          </span>
                        </div>
                        <p className={`text-[10px] leading-tight ${
                          itemConf.stockRotationMethod === 'FEFO' ? 'text-emerald-100' : 'text-slate-500'
                        }`}>
                          Prioritizes stock by earliest Expiry Date. Ideal for medicines & perishables to minimize near-expiry loss.
                        </p>
                      </div>
                    </div>

                    {/* Additional Rotation Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <label className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={itemConf.allowManualBatchOverride ?? true}
                          onChange={(e) => updateItem({ allowManualBatchOverride: e.target.checked })}
                          className="w-3.5 h-3.5 text-blue-600 rounded"
                        />
                        <span className="text-slate-800">Allow Manual Batch Selection in POS</span>
                      </label>

                      <label className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={itemConf.enforceExpiredBlock ?? true}
                          onChange={(e) => updateItem({ enforceExpiredBlock: e.target.checked })}
                          className="w-3.5 h-3.5 text-rose-600 rounded"
                        />
                        <span className="text-slate-800">Strictly Block Expired Batches</span>
                      </label>
                    </div>

                  </div>

                </div>
              )}
            </div>

            {/* Custom Formula / Salt Fields */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Custom Item Metadata Fields</span>
                <span className="text-[11px] text-blue-600 font-semibold">{itemConf.itemCustomFields.length} Custom Fields</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Chemical Salt / Sterilization Method"
                  value={newCustomFieldName}
                  onChange={(e) => setNewCustomFieldName(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
                <button
                  onClick={handleAddCustomField}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              <div className="space-y-1.5 pt-1">
                {itemConf.itemCustomFields.map(field => (
                  <div key={field.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{field.name}</span>
                    <button
                      onClick={() => handleDeleteCustomField(field.id)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Warranty & Guarantee Configuration Fields */}
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <span className="font-bold text-amber-950">Warranty Custom Fields</span>
                </div>
                <span className="text-[11px] text-amber-800 font-semibold">{warrantyFields.length} Fields Configured</span>
              </div>

              <p className="text-[11px] text-amber-900/80 leading-relaxed">
                Add, remove, or rename custom warranty metadata fields for invoices & inventory (e.g. Warranty Type, Warranty Period, Serial Codes, Terms).
              </p>

              {/* Add New Warranty Field Input */}
              <div className="space-y-2 bg-white p-2.5 rounded-lg border border-amber-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Field Name (e.g. Warranty Period / Type)"
                    value={newWarrantyFieldName}
                    onChange={(e) => setNewWarrantyFieldName(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 font-semibold"
                  />
                  <input
                    type="text"
                    placeholder="Default Value (e.g. 1 Year / Replacement)"
                    value={newWarrantyDefaultVal}
                    onChange={(e) => setNewWarrantyDefaultVal(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Input Placeholder (Optional)"
                    value={newWarrantyPlaceholder}
                    onChange={(e) => setNewWarrantyPlaceholder(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddWarrantyField}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Field
                  </button>
                </div>
              </div>

              {/* Active Warranty Fields List */}
              <div className="space-y-1.5 pt-1">
                {warrantyFields.length === 0 ? (
                  <div className="p-3 text-center text-xs text-amber-800/70 bg-amber-100/40 rounded-lg">
                    No warranty fields configured. Click 'Add Field' above to create custom fields.
                  </div>
                ) : (
                  warrantyFields.map(field => (
                    <div key={field.id} className="p-2.5 bg-white rounded-lg border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                      {editingWarrantyId === field.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editWarrantyName}
                            onChange={(e) => setEditWarrantyName(e.target.value)}
                            placeholder="Field Name"
                            className="flex-1 px-2 py-1 border border-amber-400 rounded text-xs font-bold"
                          />
                          <input
                            type="text"
                            value={editWarrantyDefaultVal}
                            onChange={(e) => setEditWarrantyDefaultVal(e.target.value)}
                            placeholder="Default Value"
                            className="w-32 px-2 py-1 border border-amber-400 rounded text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditWarranty(field.id)}
                            className="p-1 text-emerald-600 hover:text-emerald-800"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingWarrantyId(null)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.enabled}
                              onChange={() => handleToggleWarrantyField(field.id)}
                              className="w-3.5 h-3.5 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                              title="Toggle Enabled/Disabled"
                            />
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span>{field.name}</span>
                                {field.defaultValue && (
                                  <span className="text-[10px] bg-amber-100 text-amber-800 font-mono px-1.5 py-0.2 rounded font-semibold">
                                    Default: {field.defaultValue}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingWarrantyId(field.id);
                                setEditWarrantyName(field.name);
                                setEditWarrantyDefaultVal(field.defaultValue || '');
                              }}
                              className="text-slate-500 hover:text-blue-600 p-1 rounded hover:bg-slate-100"
                              title="Rename / Edit Field"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteWarrantyField(field.id)}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50"
                              title="Delete Field"
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
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
