import React, { useRef } from 'react';
import { X, Printer, Download, Building2, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { PurchaseOrder } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { formatCurrency, formatDate } from '../../lib/utils';
import { downloadPurchaseBillPDF } from '../../lib/pdfGenerator';
import { emitToast } from '../../contexts/ToastContext';
import { printHtmlElement } from '../../lib/invoiceExport';

interface PurchasePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
}

export const PurchasePrintModal: React.FC<PurchasePrintModalProps> = ({
  isOpen,
  onClose,
  order
}) => {
  const { business } = useAuth();
  const { settings } = useSettings();
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const activeColor = settings.print?.themeColor || '#2563eb';
  const isMonochromeOrWhite = 
    activeColor.toLowerCase() === '#ffffff' || 
    activeColor.toLowerCase() === '#fff' || 
    activeColor.toLowerCase() === 'white' || 
    activeColor.toLowerCase() === '#000000' || 
    activeColor.toLowerCase() === '#000' || 
    activeColor.toLowerCase() === 'black';

  const handlePrint = () => {
    if (printRef.current) {
      printHtmlElement(printRef.current, `Purchase_Bill_${order.poNumber || order.billNumber || 'PO'}`, false, isMonochromeOrWhite);
      emitToast('Print dialog opened', 'info');
    } else {
      window.print();
    }
  };

  const businessName = business?.name || 'MBI INVENTRA';
  const businessAddress = business?.address || 'MBI Corporate Plaza, Commercial Center, Lahore';
  const businessPhone = business?.phone || '03364585863';
  const businessTaxNo = business?.taxNumber || '4928172-9';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center print:hidden">
          <h2 className="text-base font-bold text-slate-900">Purchase Bill Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                downloadPurchaseBillPDF(order);
                emitToast('Purchase bill PDF generated & downloaded', 'success');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
              title="Download professional vector PDF"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div 
          className="p-8 overflow-y-auto bg-white text-slate-800 space-y-6" 
          ref={printRef} 
          id="printable-purchase-bill"
          data-print-theme={isMonochromeOrWhite ? 'white' : 'color'}
          data-monochrome={isMonochromeOrWhite ? 'true' : 'false'}
        >
          
          {/* Business & Bill Title */}
          <div className="flex justify-between items-start border-b border-slate-300 pb-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{businessName}</h1>
              <p className="text-xs text-slate-600 mt-1">{businessAddress}</p>
              <p className="text-xs text-slate-600">Phone: {businessPhone} | NTN: {businessTaxNo}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded font-bold text-sm uppercase">
                {order.transactionType || 'Purchase Bill'}
              </span>
              <p className="text-xs font-semibold text-slate-900 mt-2">
                Bill No: #{order.billNumber || order.poNumber}
              </p>
              <p className="text-xs text-slate-600">
                Date: {formatDate(order.date)}
              </p>
            </div>
          </div>

          {/* Supplier Info & Payment Details */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="font-semibold text-slate-500 uppercase text-[10px]">Supplier / Party Details</span>
              <div className="font-bold text-sm text-slate-900 mt-0.5">{order.supplierName || order.partyName || 'Cash Supplier'}</div>
              <div className="text-slate-600 mt-0.5">Payment Terms: {order.paymentType || 'Cash'}</div>
            </div>
            <div className="text-right">
              <span className="font-semibold text-slate-500 uppercase text-[10px]">Transaction Status</span>
              <div className="mt-0.5">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  order.status === 'Paid' || order.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                  order.status === 'Partial' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {order.status}
                </span>
              </div>
              <div className="text-slate-600 mt-1">Payment Method: <strong>{order.paymentType}</strong></div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="px-3 py-2 w-12 text-center">#</th>
                  <th className="px-3 py-2">Item Description</th>
                  <th className="px-3 py-2 w-20 text-center">Qty</th>
                  <th className="px-3 py-2 w-20 text-center">Unit</th>
                  <th className="px-3 py-2 w-28 text-right">Unit Price</th>
                  <th className="px-3 py-2 w-28 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-center text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{it.name}</td>
                    <td className="px-3 py-2 text-center font-semibold">{it.quantity}</td>
                    <td className="px-3 py-2 text-center text-slate-600 uppercase">{it.unit || 'PCS'}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(it.purchasePrice)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatCurrency(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(order.subTotal || order.totalAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Amount:</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Paid Amount:</span>
                <span>{formatCurrency(order.paidAmount !== undefined ? order.paidAmount : order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold border-t border-slate-200 pt-1">
                <span>Balance Due:</span>
                <span>{formatCurrency(order.balanceDue || 0)}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {order.description && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Notes / Remarks: </span>
              {order.description}
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 pt-10 text-xs text-slate-500 border-t border-slate-200">
            <div>
              <div className="w-36 border-b border-slate-400 mb-1"></div>
              <span>Receiver Signature</span>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="w-36 border-b border-slate-400 mb-1"></div>
              <span>Authorized Signature</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
