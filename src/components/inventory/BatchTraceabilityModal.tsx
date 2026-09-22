import React from 'react';
import { X, Printer, ShieldAlert, CheckCircle, Package, ArrowRight, User, ShoppingBag, Truck, RotateCcw, Calendar, MapPin, AlertTriangle } from 'lucide-react';
import { Medicine, Invoice, PurchaseOrder, Supplier } from '../../types';
import { generateBatchTraceability } from '../../lib/enterprisePharma';
import { formatCurrency, formatDate } from '../../lib/utils';

interface BatchTraceabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: Medicine | null;
  selectedBatch?: string;
  invoices: Invoice[];
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  onOpenRecall?: (medicine: Medicine, batchNumber: string) => void;
}

export const BatchTraceabilityModal: React.FC<BatchTraceabilityModalProps> = ({
  isOpen,
  onClose,
  medicine,
  selectedBatch,
  invoices,
  purchaseOrders,
  suppliers,
  onOpenRecall
}) => {
  if (!isOpen || !medicine) return null;

  const targetBatch = selectedBatch || medicine.batchNumber || 'DEFAULT';
  const report = generateBatchTraceability(medicine, targetBatch, invoices, purchaseOrders, suppliers);

  const handlePrint = () => {
    window.print();
  };

  const isQuarantinedOrRecalled = report.stockStatus === 'Quarantined' || report.stockStatus === 'Recalled';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Batch Traceability & Lifecycle Audit
                </h2>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                  isQuarantinedOrRecalled 
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                }`}>
                  {report.stockStatus}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {medicine.name} — Batch: <span className="font-mono font-bold text-amber-300">{report.batchNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" /> Print Audit Sheet
            </button>
            {onOpenRecall && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRecall(medicine, report.batchNumber);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Product Recall
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Total Received</span>
              <span className="text-xl font-black text-blue-950">{report.totalReceived} <span className="text-xs font-normal text-slate-500">{medicine.unit || 'units'}</span></span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Total Sold</span>
              <span className="text-xl font-black text-emerald-950">{report.totalSold} <span className="text-xs font-normal text-slate-500">{medicine.unit || 'units'}</span></span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Total Returned</span>
              <span className="text-xl font-black text-amber-950">{report.totalReturned} <span className="text-xs font-normal text-slate-500">{medicine.unit || 'units'}</span></span>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Current Balance</span>
              <span className="text-xl font-black text-indigo-950">{report.currentStock} <span className="text-xs font-normal text-slate-500">{medicine.unit || 'units'}</span></span>
            </div>
          </div>

          {/* Location & Metadata Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block font-medium">Manufacturer / Brand:</span>
              <span className="font-bold text-slate-900">{medicine.manufacturer || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Expiry Date:</span>
              <span className="font-bold text-slate-900">{report.expiryDate ? formatDate(report.expiryDate) : 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Warehouse / Shelf Location:</span>
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                {medicine.rackLocation || medicine.shelfLocation || 'Main Store Rack A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Purchase / Selling Rate:</span>
              <span className="font-bold text-slate-900">{formatCurrency(medicine.purchasePrice)} / {formatCurrency(medicine.sellingPrice)}</span>
            </div>
          </div>

          {/* Section 1: Supplier Purchases & Inward Flow */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Supplier Receiving History ({report.suppliers.length})
              </h3>
            </div>

            {report.suppliers.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
                No direct purchase order recorded. Initialized via Opening Stock.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Supplier / Source</th>
                      <th className="py-2 px-3 font-semibold">PO / Ref #</th>
                      <th className="py-2 px-3 font-semibold">Date</th>
                      <th className="py-2 px-3 font-semibold text-right">Received Qty</th>
                      <th className="py-2 px-3 font-semibold text-right">Unit Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.suppliers.map((sup, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50">
                        <td className="py-2 px-3 font-bold text-slate-900">{sup.supplierName}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{sup.poNumber}</td>
                        <td className="py-2 px-3 text-slate-600">{formatDate(sup.date)}</td>
                        <td className="py-2 px-3 text-right font-black text-emerald-700">{sup.quantity}</td>
                        <td className="py-2 px-3 text-right text-slate-800">{formatCurrency(sup.purchasePrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Outward Sales & Customer Invoices */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  2. Dispensed / Customer Sales ({report.sales.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
                Total Units Dispatched: <strong className="text-slate-900">{report.totalSold}</strong>
              </span>
            </div>

            {report.sales.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
                No customer invoices billed yet for this specific batch.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Invoice #</th>
                      <th className="py-2 px-3 font-semibold">Customer</th>
                      <th className="py-2 px-3 font-semibold">Contact</th>
                      <th className="py-2 px-3 font-semibold">Date</th>
                      <th className="py-2 px-3 font-semibold text-right">Sold Qty</th>
                      <th className="py-2 px-3 font-semibold text-right">Rate</th>
                      <th className="py-2 px-3 font-semibold text-center">Warranty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.sales.map((sale, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-blue-600">{sale.invoiceNumber}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{sale.customerName}</td>
                        <td className="py-2 px-3 text-slate-600">{sale.customerPhone || '—'}</td>
                        <td className="py-2 px-3 text-slate-600">{formatDate(sale.date)}</td>
                        <td className="py-2 px-3 text-right font-black text-slate-900">{sale.quantity}</td>
                        <td className="py-2 px-3 text-right text-slate-700">{formatCurrency(sale.sellingPrice)}</td>
                        <td className="py-2 px-3 text-center">
                          {sale.isWarranty ? (
                            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded">YES</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Returns / Recalls */}
          {report.returns.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  3. Customer Returns & Reverse Stock ({report.returns.length})
                </h3>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Return Invoice #</th>
                      <th className="py-2 px-3 font-semibold">Customer</th>
                      <th className="py-2 px-3 font-semibold">Date</th>
                      <th className="py-2 px-3 font-semibold text-right">Returned Qty</th>
                      <th className="py-2 px-3 font-semibold">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.returns.map((ret, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/50">
                        <td className="py-2 px-3 font-mono font-bold text-amber-700">{ret.invoiceNumber}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{ret.customerName}</td>
                        <td className="py-2 px-3 text-slate-600">{formatDate(ret.date)}</td>
                        <td className="py-2 px-3 text-right font-black text-rose-700">+{ret.quantity}</td>
                        <td className="py-2 px-3 text-slate-600 italic">{ret.reason || 'Customer return'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DRAP Compliance Footer Note */}
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-[11px] text-slate-600">
            <span>DRAP Good Distribution Practice (GDP) & Batch Accountability Audit Trail.</span>
            <span className="font-mono">Audit ID: AUD-TRC-{medicine.id.slice(0, 6)}</span>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Close Audit
          </button>
        </div>

      </div>
    </div>
  );
};
