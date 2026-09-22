import React, { useState, useEffect } from 'react';
import { Sliders, X, Plus, Minus, Calendar, FileText, CheckCircle2, Layers, AlertCircle } from 'lucide-react';
import { Medicine, AuditLog, MedicineBatch } from '../../types';
import { dbMedicines, dbAuditLogs } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { getFEFOSortedBatches, adjustBatchStockQuantity } from '../../lib/fefoEngine';

interface AdjustItemModalProps {
  isOpen: boolean;
  medicine: Medicine | null;
  onClose: () => void;
  onSuccess: (updatedMedicine: Medicine) => void;
}

export const AdjustItemModal: React.FC<AdjustItemModalProps> = ({
  isOpen,
  medicine,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !medicine) return null;

  const batches = getFEFOSortedBatches(medicine);
  const defaultBatchNo = batches[0]?.batchNumber || medicine.batchNumber || 'BATCH-01';

  const [selectedBatchNumber, setSelectedBatchNumber] = useState<string>(defaultBatchNo);
  const [isNewBatch, setIsNewBatch] = useState(false);
  const [newBatchNumber, setNewBatchNumber] = useState('');
  const [newBatchExpiry, setNewBatchExpiry] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2).toISOString().slice(0, 10)
  );
  const [adjustmentType, setAdjustmentType] = useState<'ADD' | 'REDUCE' | 'SET'>('ADD');
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [unitPrice, setUnitPrice] = useState<number>(medicine.purchasePrice || 0);
  const [adjustDate, setAdjustDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState<string>('Cycle Count Physical Variance');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine current stock of the active target batch
  const activeBatchObj = batches.find(b => b.batchNumber.toLowerCase() === selectedBatchNumber.toLowerCase());
  const currentBatchQty = isNewBatch ? 0 : (activeBatchObj ? activeBatchObj.quantity : medicine.quantity);

  const calculateNewBatchQty = () => {
    if (adjustmentType === 'SET') return Math.max(0, Number(adjustQty || 0));
    if (adjustmentType === 'ADD') return currentBatchQty + Number(adjustQty || 0);
    return Math.max(0, currentBatchQty - Number(adjustQty || 0));
  };

  const newBatchQty = calculateNewBatchQty();
  const batchDelta = newBatchQty - currentBatchQty;
  const newTotalOverallStock = Math.max(0, (medicine.quantity || 0) + batchDelta);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicine || (adjustmentType !== 'SET' && adjustQty <= 0)) return;

    setIsSubmitting(true);
    try {
      const targetBatchNo = isNewBatch ? (newBatchNumber.trim() || 'BATCH-NEW') : selectedBatchNumber;
      
      // Update medicine batches
      let updatedMedicine = adjustBatchStockQuantity(medicine, targetBatchNo, newBatchQty, reason);
      
      // If a brand new batch was added, ensure its expiry is recorded
      if (isNewBatch && updatedMedicine.batches) {
        const idx = updatedMedicine.batches.findIndex(b => b.batchNumber.toLowerCase() === targetBatchNo.toLowerCase());
        if (idx >= 0) {
          updatedMedicine.batches[idx].expiryDate = newBatchExpiry;
          updatedMedicine.batches[idx].purchasePrice = unitPrice;
        }
      }

      if (unitPrice > 0) {
        updatedMedicine.purchasePrice = unitPrice;
      }

      await dbMedicines.save(updatedMedicine);

      // Create Audit Log
      const audit: AuditLog = {
        id: uuidv4(),
        date: new Date(adjustDate).toISOString(),
        action: 'ADJUST_STOCK',
        medicineId: medicine.id,
        medicineName: medicine.name,
        quantityChanged: batchDelta,
        userId: 'admin',
        notes: `Batch ${targetBatchNo} Adjustment: ${batchDelta >= 0 ? '+' : ''}${batchDelta} (${reason}${notes ? ` - ${notes}` : ''}) @ Rs ${unitPrice}`,
      };
      await dbAuditLogs.save(audit);

      onSuccess(updatedMedicine);
      onClose();
    } catch (err) {
      console.error('Failed to adjust item stock', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Sliders className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide">FEFO Batch Stock Adjustment</h3>
              <p className="text-xs text-blue-100 font-medium truncate max-w-xs">{medicine.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Stock Banner */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-slate-600">
            Total Item Stock: <span className={`font-bold font-mono text-sm ${medicine.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{medicine.quantity}</span>
          </div>
          <div className="text-slate-600">
            Batch Stock: <span className="font-bold font-mono text-slate-800">{currentBatchQty}</span> → <span className="font-bold font-mono text-blue-700">{newBatchQty}</span>
          </div>
          <div className="text-slate-600">
            New Total: <span className={`font-bold font-mono text-sm ${newTotalOverallStock >= 0 ? 'text-blue-700' : 'text-rose-600'}`}>{newTotalOverallStock}</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Batch Selector */}
          <div className="space-y-1.5 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" /> Target Batch
              </label>
              <button
                type="button"
                onClick={() => setIsNewBatch(!isNewBatch)}
                className="text-[11px] font-bold text-blue-600 hover:underline"
              >
                {isNewBatch ? '← Select Existing Batch' : '+ Add to New Batch'}
              </button>
            </div>

            {!isNewBatch ? (
              <div className="space-y-1">
                <select
                  value={selectedBatchNumber}
                  onChange={(e) => setSelectedBatchNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 bg-white rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {batches.map((b) => (
                    <option key={b.batchNumber} value={b.batchNumber}>
                      Batch: {b.batchNumber} | Exp: {b.expiryDate ? b.expiryDate.slice(0, 7) : 'N/A'} | Stock: {b.quantity} {b.isFEFOPrimary ? '(FEFO Primary)' : ''}
                    </option>
                  ))}
                </select>
                {activeBatchObj && (
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-0.5 px-1">
                    <span>Expiry: <strong className="font-mono text-slate-700">{activeBatchObj.expiryDate || 'N/A'}</strong> ({activeBatchObj.daysUntilExpiry} days left)</span>
                    <span>Status: <strong className="text-emerald-700">{activeBatchObj.status}</strong></span>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-slate-600">New Batch No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BT-9092"
                    value={newBatchNumber}
                    onChange={(e) => setNewBatchNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-blue-200 bg-white rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={newBatchExpiry}
                    onChange={(e) => setNewBatchExpiry(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-blue-200 bg-white rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Type Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Adjustment Mode</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('ADD')}
                className={`py-2 px-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1 transition ${
                  adjustmentType === 'ADD'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Add (+)
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('REDUCE')}
                className={`py-2 px-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1 transition ${
                  adjustmentType === 'REDUCE'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                Reduce (-)
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('SET')}
                className={`py-2 px-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1 transition ${
                  adjustmentType === 'SET'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Set Exact (=)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Quantity */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                {adjustmentType === 'SET' ? 'Exact New Quantity *' : 'Quantity Change *'}
              </label>
              <input
                type="number"
                min={adjustmentType === 'SET' ? 0 : 1}
                required
                value={adjustQty}
                onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Unit Price */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Batch Cost / Unit (Rs)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Adjustment Date</label>
              <input
                type="date"
                required
                value={adjustDate}
                onChange={(e) => setAdjustDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Cycle Count Physical Variance">Cycle Count Physical Variance</option>
                <option value="FEFO Batch Stock Rebalancing">FEFO Batch Stock Rebalancing</option>
                <option value="Stock Shortage / Discrepancy">Stock Shortage / Discrepancy</option>
                <option value="Stock Overage / Surplus">Stock Overage / Surplus</option>
                <option value="Damaged / Broken in Transit">Damaged / Broken in Transit</option>
                <option value="Expired Stock Quarantine">Expired Stock Quarantine</option>
                <option value="Theft / Unexplained Loss">Theft / Unexplained Loss</option>
                <option value="Counting Error Correction">Counting Error Correction</option>
                <option value="Supplier Short Shipment">Supplier Short Shipment</option>
                <option value="Customer Return Restock">Customer Return Restock</option>
                <option value="Opening Stock">Opening Stock Balance</option>
                <option value="Other">Other Reason</option>
              </select>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Remarks / Description</label>
            <input
              type="text"
              placeholder="e.g. Physical inventory count verified..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Confirm Adjustment'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
