import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, Plus, Search, Printer, Trash2, 
  CheckCircle2, FileText, Download, Building2, Calendar, Eye
} from 'lucide-react';
import { SupplierReturnChallan, SupplierReturnItem, Medicine, Supplier } from '../../types';
import { dbSupplierReturns, dbMedicines, dbSuppliers } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

export const SupplierReturnTab: React.FC = () => {
  const { business, activeRole } = useAuth();
  const [returns, setReturns] = useState<SupplierReturnChallan[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SupplierReturnChallan | null>(null);

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [returnItems, setReturnItems] = useState<SupplierReturnItem[]>([]);
  const [returnNotes, setReturnNotes] = useState('');

  // Item selector state
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemReason, setItemReason] = useState<SupplierReturnItem['reason']>('Expired');

  const loadData = async () => {
    setLoading(true);
    try {
      const [allReturns, allMeds, allSupps] = await Promise.all([
        dbSupplierReturns.getAll(),
        dbMedicines.getAll(),
        dbSuppliers.getAll()
      ]);
      setReturns(allReturns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setMedicines(allMeds);
      setSuppliers(allSupps.filter(s => s.partyType === 'Supplier'));
    } catch (e) {
      console.error('Error loading returns:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItemToReturn = () => {
    if (!selectedMedicineId) {
      alert('Please select a medicine');
      return;
    }
    const med = medicines.find(m => m.id === selectedMedicineId);
    if (!med) return;

    const purchasePrice = med.purchasePrice || 0;
    const newItem: SupplierReturnItem = {
      medicineId: med.id,
      medicineName: med.name,
      batchNumber: med.batchNumber || 'B-01',
      expiryDate: med.expiryDate || '',
      quantity: Number(itemQty) || 1,
      purchasePrice: purchasePrice,
      totalAmount: (Number(itemQty) || 1) * purchasePrice,
      reason: itemReason
    };

    setReturnItems([...returnItems, newItem]);
    setSelectedMedicineId('');
    setItemQty(1);
  };

  const handleRemoveItem = (index: number) => {
    setReturnItems(returnItems.filter((_, idx) => idx !== index));
  };

  const handleSaveChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      alert('Please select a supplier / distributor');
      return;
    }
    if (returnItems.length === 0) {
      alert('Please add at least one item to return');
      return;
    }

    const supp = suppliers.find(s => s.id === selectedSupplierId);
    const totalAmount = returnItems.reduce((sum, it) => sum + it.totalAmount, 0);

    const challan: SupplierReturnChallan = {
      id: `ret-${Date.now()}`,
      challanNumber: `RET-${Date.now().toString().slice(-6)}`,
      supplierId: selectedSupplierId,
      supplierName: supp ? supp.name : 'Distributor',
      returnDate: new Date().toISOString().split('T')[0],
      items: returnItems,
      totalAmount: totalAmount,
      status: 'Sent to Supplier',
      notes: returnNotes.trim(),
      createdBy: activeRole,
      createdAt: new Date().toISOString()
    };

    await dbSupplierReturns.save(challan);
    setIsCreateModalOpen(false);
    setSelectedSupplierId('');
    setReturnItems([]);
    setReturnNotes('');
    await loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this return challan record?')) {
      await dbSupplierReturns.delete(id);
      await loadData();
    }
  };

  const filteredReturns = returns.filter(r =>
    r.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.challanNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">Supplier Near-Expiry & Breakage Returns</h2>
          <p className="text-xs text-slate-500 mt-1">
            Generate official Debit Notes & Return Challans for distributors to return expired, damaged, or slow-moving stock.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Return Challan</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search return challan #, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
        <span className="text-xs font-bold text-slate-500">
          {filteredReturns.length} Return Challans
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Challan #</th>
                <th className="p-3">Return Date</th>
                <th className="p-3">Distributor / Supplier</th>
                <th className="p-3">Items Count</th>
                <th className="p-3">Total Value</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Loading return challans...</td>
                </tr>
              ) : filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <p className="font-bold text-slate-600">No return challans created yet</p>
                    <p className="text-[11px] mt-1">Create a return challan to claim credit from your medicine distributors for expired items.</p>
                  </td>
                </tr>
              ) : (
                filteredReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-700">
                      {ret.challanNumber}
                    </td>
                    <td className="p-3 font-medium text-slate-700">
                      {new Date(ret.returnDate).toLocaleDateString('en-PK')}
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {ret.supplierName}
                    </td>
                    <td className="p-3 font-medium text-slate-700">
                      {ret.items.length} items ({ret.items.reduce((s, i) => s + i.quantity, 0)} units)
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      Rs. {ret.totalAmount.toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        {ret.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedReturn(ret)}
                          className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded transition-colors"
                          title="View & Print Challan"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ret.id)}
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Supplier Return Challan (Debit Note)</h3>
                <p className="text-[11px] text-slate-500">Add expired or broken stock items to return to distributor</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 font-bold p-1">✕</button>
            </div>

            <form onSubmit={handleSaveChallan} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Distributor / Supplier *</label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.phone || 'No phone'})</option>
                  ))}
                </select>
              </div>

              {/* Add Item Section */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <p className="font-bold text-slate-800">Add Medicine to Return:</p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-5">
                    <select
                      value={selectedMedicineId}
                      onChange={(e) => setSelectedMedicineId(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="">-- Select Medicine --</option>
                      {medicines.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} (Batch: {m.batchNumber || 'N/A'}, Exp: {m.expiryDate || 'N/A'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={itemQty}
                      onChange={(e) => setItemQty(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-bold"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <select
                      value={itemReason}
                      onChange={(e) => setItemReason(e.target.value as any)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold"
                    >
                      <option value="Expired">Expired</option>
                      <option value="Near Expiry">Near Expiry</option>
                      <option value="Damaged / Broken">Damaged / Broken</option>
                      <option value="Slow Moving">Slow Moving</option>
                      <option value="Wrong Delivery">Wrong Delivery</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItemToReturn}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Items List */}
              {returnItems.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-2">Medicine</th>
                        <th className="p-2">Batch/Exp</th>
                        <th className="p-2">Qty</th>
                        <th className="p-2">Price</th>
                        <th className="p-2">Total</th>
                        <th className="p-2">Reason</th>
                        <th className="p-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {returnItems.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-bold text-slate-900">{it.medicineName}</td>
                          <td className="p-2 text-slate-500">{it.batchNumber} / {it.expiryDate}</td>
                          <td className="p-2 font-bold">{it.quantity}</td>
                          <td className="p-2">Rs. {it.purchasePrice}</td>
                          <td className="p-2 font-bold text-slate-900">Rs. {it.totalAmount.toLocaleString()}</td>
                          <td className="p-2">
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">
                              {it.reason}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                      <tr>
                        <td colSpan={4} className="p-2 text-right">Grand Total Return Amount:</td>
                        <td colSpan={3} className="p-2 text-red-600 text-sm">
                          Rs. {returnItems.reduce((s, i) => s + i.totalAmount, 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Distributor Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Return handed over to delivery van representative"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Generate Return Challan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Slip Print Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Supplier Return Voucher (Debit Note)</h3>
              <button onClick={() => setSelectedReturn(null)} className="text-slate-400 font-bold p-1">✕</button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between">
                <div>
                  <p className="font-black text-slate-900 text-sm">{business?.name || '3 Pharma'}</p>
                  <p className="text-[10px] text-slate-500">{business?.address || ''}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-blue-700">{selectedReturn.challanNumber}</p>
                  <p className="text-[10px] text-slate-500">Date: {new Date(selectedReturn.returnDate).toLocaleDateString('en-PK')}</p>
                </div>
              </div>

              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-500 text-[10px]">To Distributor:</span>
                <p className="font-bold text-slate-900">{selectedReturn.supplierName}</p>
              </div>

              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 font-bold">
                    <tr>
                      <th className="p-1.5">Item</th>
                      <th className="p-1.5">Batch</th>
                      <th className="p-1.5">Qty</th>
                      <th className="p-1.5">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedReturn.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-1.5 font-medium">{it.medicineName}</td>
                        <td className="p-1.5 text-slate-500">{it.batchNumber}</td>
                        <td className="p-1.5 font-bold">{it.quantity}</td>
                        <td className="p-1.5 font-bold">Rs. {it.totalAmount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2 font-bold text-slate-900 border-t border-slate-200">
                <span>Total Return Debit Value:</span>
                <span className="text-sm text-red-600">Rs. {selectedReturn.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Challan</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReturn(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
