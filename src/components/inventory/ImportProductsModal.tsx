import React, { useState, useRef } from 'react';
import { 
  X, Upload, Download, FileSpreadsheet, Check, AlertCircle, 
  CheckCircle2, RefreshCw, Package
} from 'lucide-react';
import { 
  downloadProductTemplateExcel, 
  parseProductsExcel, 
  ParsedProductRow 
} from '../../lib/excelUtils';
import { Medicine } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface ImportProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedCount: number) => void;
  onSaveProducts: (medicines: Medicine[]) => Promise<void>;
}

export const ImportProductsModal: React.FC<ImportProductsModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onSaveProducts,
}) => {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const rows = await parseProductsExcel(file);
      if (rows.length === 0) {
        setErrorMsg('No valid product rows found. Please ensure Medicine Names are provided.');
      } else {
        setParsedRows(rows);
      }
    } catch (err: any) {
      console.error('Error parsing product Excel:', err);
      setErrorMsg('Failed to parse Excel file. Please use the official Excel template.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);
    try {
      const newMedicines: Medicine[] = validRows.map(r => ({
        id: uuidv4(),
        name: r.name,
        barcode: r.barcode || `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
        batchNumber: r.batchNumber || 'B-01',
        manufacturer: r.manufacturer || 'Generic Pharma',
        expiryDate: r.expiryDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
        quantity: r.quantity,
        purchasePrice: r.purchasePrice,
        mrp: r.mrp,
        sellingPrice: r.sellingPrice,
        lowStockThreshold: r.lowStockThreshold || 20,
        gstPercentage: r.gstPercentage || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      await onSaveProducts(newMedicines);
      onImportSuccess(newMedicines.length);
      handleReset();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save imported products to inventory database.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setExcelFile(null);
    setParsedRows([]);
    setErrorMsg(null);
  };

  const validCount = parsedRows.filter(r => r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Import Items & Products (Excel)</h2>
              <p className="text-xs text-slate-500">Bulk upload pharmaceutical and surgical items from Excel/CSV</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[68vh] overflow-y-auto space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 1: Download Template */}
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Download Product Excel Template</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Includes formatted columns: Item Name, Barcode, Batch, Manufacturer, Expiry Date, Quantity, Purchase Price, Selling Price.
                </p>
              </div>
            </div>
            <button
              onClick={downloadProductTemplateExcel}
              className="flex items-center justify-center gap-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4" /> Download Template (.xlsx)
            </button>
          </div>

          {/* Step 2: Upload File */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h4 className="text-sm font-bold text-slate-900">Upload Your Filled Excel File</h4>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-blue-50/20 cursor-pointer transition-colors"
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls, .csv"
                className="hidden" 
              />
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                {excelFile ? excelFile.name : 'Click to select or drop your Excel file here'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Supports .xlsx, .xls, and .csv formats</p>
            </div>
          </div>

          {/* Step 3: Parsed Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Preview Products ({validCount} Valid / {parsedRows.length} Total)
                  </h4>
                </div>
                <button 
                  onClick={handleReset}
                  className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-upload
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3">Batch</th>
                      <th className="py-2.5 px-3">Expiry</th>
                      <th className="py-2.5 px-3 text-center">Stock</th>
                      <th className="py-2.5 px-3 text-right">Cost Price</th>
                      <th className="py-2.5 px-3 text-right">Selling Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                        <td className="py-2 px-3">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                              <Check className="w-3 h-3" /> Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-medium bg-rose-100 px-2 py-0.5 rounded text-[11px]">
                              <AlertCircle className="w-3 h-3" /> Error
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{row.name}</td>
                        <td className="py-2 px-3 font-mono text-[11px]">{row.batchNumber}</td>
                        <td className="py-2 px-3">{row.expiryDate}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800">{row.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-slate-600">
                          Rs {row.purchasePrice}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                          Rs {row.sellingPrice}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmImport}
            disabled={validCount === 0 || isProcessing}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
              validCount === 0 || isProcessing
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-98'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isProcessing ? 'Importing...' : `Import ${validCount} Products`}
          </button>
        </div>

      </div>
    </div>
  );
};
