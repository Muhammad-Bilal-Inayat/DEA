import React, { useState } from 'react';
import { X, ShieldAlert, AlertOctagon, CheckCircle2, Lock, Printer, Download, Users, Package, Phone } from 'lucide-react';
import { Medicine, Invoice, ProductRecallRecord } from '../../types';
import { generateBatchTraceability } from '../../lib/enterprisePharma';
import { formatDate } from '../../lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface ProductRecallModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: Medicine | null;
  selectedBatch?: string;
  invoices: Invoice[];
  onConfirmQuarantine: (medicineId: string, batchNumber: string, recallRecord: ProductRecallRecord) => void;
}

export const ProductRecallModal: React.FC<ProductRecallModalProps> = ({
  isOpen,
  onClose,
  medicine,
  selectedBatch,
  invoices,
  onConfirmQuarantine
}) => {
  if (!isOpen || !medicine) return null;

  const targetBatch = selectedBatch || medicine.batchNumber || 'DEFAULT';
  const report = generateBatchTraceability(medicine, targetBatch, invoices, [], []);

  const [recallReason, setRecallReason] = useState('Manufacturer / DRAP Safety Advisory Alert');
  const [issuedBy, setIssuedBy] = useState('Pharmacist In-Charge');
  const [adminNotes, setAdminNotes] = useState('Immediate quarantine required. Do not dispense.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isQuarantineComplete, setIsQuarantineComplete] = useState(medicine.stockStatus === 'Quarantined' || medicine.stockStatus === 'Recalled');

  // Find unique affected customers
  const affectedCustomers = Array.from(
    new Map(
      report.sales.map(s => [
        s.customerName + (s.customerPhone || ''),
        {
          customerName: s.customerName,
          customerPhone: s.customerPhone,
          invoiceNumber: s.invoiceNumber,
          date: s.date,
          qty: s.quantity
        }
      ])
    ).values()
  );

  const handleExecuteRecallAndQuarantine = () => {
    setIsProcessing(true);

    const record: ProductRecallRecord = {
      id: `recall-${Date.now()}`,
      medicineId: medicine.id,
      medicineName: medicine.name,
      batchNumber: targetBatch,
      recallDate: new Date().toISOString(),
      reason: recallReason,
      issuedBy: issuedBy,
      supplierName: medicine.manufacturer,
      affectedStockQty: report.currentStock,
      quarantinedQty: report.currentStock,
      affectedInvoicesCount: report.sales.length,
      affectedCustomersCount: affectedCustomers.length,
      status: 'ACTIVE_RECALL',
      notes: adminNotes,
      createdAt: new Date().toISOString()
    };

    setTimeout(() => {
      onConfirmQuarantine(medicine.id, targetBatch, record);
      setIsProcessing(false);
      setIsQuarantineComplete(true);
    }, 400);
  };

  const handlePrintRecallNotice = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh] border-2 border-rose-500/50">
        
        {/* Header */}
        <div className="bg-rose-700 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-800 rounded-xl text-rose-200">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                DRAP / Enterprise Product Recall & Quarantine
              </h2>
              <p className="text-xs text-rose-100">
                Segregate from saleable inventory & trace affected consumer sales
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-rose-200 hover:text-white rounded-lg hover:bg-rose-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-xs">
          
          {/* Target Product Summary Banner */}
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Target Recalled Medicine</span>
              <h3 className="text-base font-black text-rose-950">{medicine.name}</h3>
              <p className="text-slate-600 mt-0.5">
                Batch: <strong className="font-mono text-rose-800">{targetBatch}</strong> | Expiry: <strong>{formatDate(medicine.expiryDate)}</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white px-3 py-2 rounded-lg border border-rose-200 text-center">
                <span className="text-[10px] text-slate-500 font-semibold block">Remaining Stock</span>
                <span className="text-base font-black text-rose-700">{report.currentStock} {medicine.unit || 'units'}</span>
              </div>
              <div className="bg-white px-3 py-2 rounded-lg border border-rose-200 text-center">
                <span className="text-[10px] text-slate-500 font-semibold block">Sold to Customers</span>
                <span className="text-base font-black text-slate-900">{report.totalSold} {medicine.unit || 'units'}</span>
              </div>
            </div>
          </div>

          {/* Action Form */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-rose-600" />
              Recall & Quarantine Protocol Parameters
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Recall Reason / Notice Reference</label>
                <input
                  type="text"
                  value={recallReason}
                  onChange={(e) => setRecallReason(e.target.value)}
                  placeholder="e.g. DRAP Safety Alert #4092, Packaging defect"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Authorized Official / Person</label>
                <input
                  type="text"
                  value={issuedBy}
                  onChange={(e) => setIssuedBy(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Quarantine Instructions / Action Notes</label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none font-medium text-xs"
                />
              </div>
            </div>

            {!isQuarantineComplete ? (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteRecallAndQuarantine}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Lock className="w-4 h-4" />
                {isProcessing ? 'Quarantining Stock...' : 'Execute Recall & Move Stock to Quarantined'}
              </button>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Stock Successfully Quarantined & Blocked from POS sales
                </div>
                <button
                  type="button"
                  onClick={handlePrintRecallNotice}
                  className="px-3 py-1.5 bg-slate-900 text-white font-bold rounded-lg flex items-center gap-1.5 text-xs hover:bg-slate-800"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Recall Report
                </button>
              </div>
            )}
          </div>

          {/* Affected Customers for Recall Notification */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Users className="w-4 h-4 text-blue-600" />
                Affected Customer Invoices ({affectedCustomers.length} Contact(s))
              </div>
              <span className="text-[11px] text-slate-500">Total units sold: {report.totalSold}</span>
            </div>

            {affectedCustomers.length === 0 ? (
              <div className="p-4 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 italic">
                No past sales recorded for this batch. Zero consumers affected.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-44 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Customer Name</th>
                      <th className="py-2 px-3 font-semibold">Phone Contact</th>
                      <th className="py-2 px-3 font-semibold">Invoice #</th>
                      <th className="py-2 px-3 font-semibold">Sale Date</th>
                      <th className="py-2 px-3 font-semibold text-right">Units</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {affectedCustomers.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">{c.customerName}</td>
                        <td className="py-2 px-3 font-mono text-blue-600 flex items-center gap-1">
                          {c.customerPhone ? (
                            <>
                              <Phone className="w-3 h-3 text-slate-400" />
                              {c.customerPhone}
                            </>
                          ) : (
                            <span className="text-slate-400">Walk-in</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">{c.invoiceNumber}</td>
                        <td className="py-2 px-3 text-slate-600">{formatDate(c.date)}</td>
                        <td className="py-2 px-3 font-bold text-slate-900 text-right">{c.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};
