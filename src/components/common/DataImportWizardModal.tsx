import React, { useState, useRef } from 'react';
import { 
  X, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, 
  ArrowRight, Download, RefreshCw, Layers, Database, HelpCircle
} from 'lucide-react';
import { Medicine, Supplier, Invoice } from '../../types';
import { dbMedicines, dbSuppliers, dbInvoices } from '../../lib/db';
import { parseExcelOrCsv, exportToExcel } from '../../lib/excelUtils';

interface DataImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  defaultEntity?: 'PRODUCTS' | 'PARTIES' | 'INVOICES';
}

export const DataImportWizardModal: React.FC<DataImportWizardModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  defaultEntity = 'PRODUCTS',
}) => {
  const [selectedEntity, setSelectedEntity] = useState<'PRODUCTS' | 'PARTIES' | 'INVOICES'>(defaultEntity);
  const [step, setStep] = useState<'UPLOAD' | 'MAP' | 'PREVIEW' | 'COMPLETE'>('UPLOAD');
  const [fileData, setFileData] = useState<any[]>([]);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Standard target schema fields per entity
  const targetFields = selectedEntity === 'PRODUCTS' ? [
    { key: 'name', label: 'Product Name', required: true },
    { key: 'barcode', label: 'Barcode', required: false },
    { key: 'purchasePrice', label: 'Purchase Cost', required: true },
    { key: 'sellingPrice', label: 'Sale Price', required: true },
    { key: 'mrp', label: 'MRP', required: false },
    { key: 'quantity', label: 'Opening Stock Qty', required: true },
    { key: 'unit', label: 'Unit (PCS, Box)', required: false },
    { key: 'category', label: 'Category', required: false },
    { key: 'batchNumber', label: 'Batch No', required: false },
    { key: 'expiryDate', label: 'Expiry Date', required: false },
    { key: 'rackLocation', label: 'Rack Location', required: false },
  ] : selectedEntity === 'PARTIES' ? [
    { key: 'name', label: 'Customer / Party Name', required: true },
    { key: 'partyType', label: 'Party Type (Customer/Supplier)', required: false },
    { key: 'phone', label: 'Phone Number', required: false },
    { key: 'company', label: 'Company / Shop Name', required: false },
    { key: 'address', label: 'Address', required: false },
    { key: 'city', label: 'City', required: false },
    { key: 'openingBalance', label: 'Opening Balance', required: false },
    { key: 'creditLimit', label: 'Credit Limit', required: false },
    { key: 'taxNumber', label: 'NTN / Tax Number', required: false },
  ] : [
    { key: 'invoiceNumber', label: 'Invoice Number', required: true },
    { key: 'date', label: 'Invoice Date', required: true },
    { key: 'customerName', label: 'Customer Name', required: true },
    { key: 'grandTotal', label: 'Grand Total Amount', required: true },
    { key: 'receivedAmount', label: 'Paid Amount', required: false },
    { key: 'paymentType', label: 'Payment Type', required: false },
  ];

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const rows = await parseExcelOrCsv(file);
      if (!rows || rows.length === 0) {
        setValidationErrors(['The selected file contains no readable rows or headers.']);
        setIsProcessing(false);
        return;
      }

      const headers = Object.keys(rows[0]);
      setColumnHeaders(headers);
      setFileData(rows);

      // Auto Map headers by fuzzy matching
      const initialMap: Record<string, string> = {};
      targetFields.forEach(tf => {
        const matchingHeader = headers.find(h => {
          const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanKey = tf.key.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanLabel = tf.label.toLowerCase().replace(/[^a-z0-9]/g, '');
          return cleanH.includes(cleanKey) || cleanH.includes(cleanLabel) || cleanLabel.includes(cleanH);
        });
        if (matchingHeader) {
          initialMap[tf.key] = matchingHeader;
        }
      });

      setColumnMapping(initialMap);
      setStep('MAP');
    } catch (err: any) {
      setValidationErrors([`Failed to read file: ${err.message || err}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate Sample CSV Template
  const handleDownloadSample = () => {
    let sampleHeaders: Record<string, any>[] = [];
    if (selectedEntity === 'PRODUCTS') {
      sampleHeaders = [{
        'Product Name': 'Panadol Extra 500mg',
        'Barcode': '8964000123456',
        'Purchase Cost': 180,
        'Sale Price': 220,
        'MRP': 220,
        'Opening Stock Qty': 50,
        'Unit': 'Box',
        'Category': 'Analgesics',
        'Batch No': 'BATCH-001',
        'Expiry Date': '2027-12-31',
        'Rack Location': 'RACK-A1'
      }];
    } else if (selectedEntity === 'PARTIES') {
      sampleHeaders = [{
        'Customer / Party Name': 'Al-Shifa Pharmacy',
        'Party Type': 'Customer',
        'Phone Number': '03001234567',
        'Company / Shop Name': 'Al-Shifa Medical Store',
        'Address': 'Main Bazar, Lahore',
        'City': 'Lahore',
        'Opening Balance': 5000,
        'Credit Limit': 50000,
        'NTN / Tax Number': 'PK-NTN-12345'
      }];
    } else {
      sampleHeaders = [{
        'Invoice Number': 'INV-2026-001',
        'Invoice Date': '2026-09-01',
        'Customer Name': 'Walk-in Customer',
        'Grand Total Amount': 4500,
        'Paid Amount': 4500,
        'Payment Type': 'Cash'
      }];
    }

    exportToExcel(sampleHeaders, `MBI_Import_Template_${selectedEntity}`);
  };

  // Validate and Proceed to Preview
  const handleProceedToPreview = () => {
    const missingRequired = targetFields.filter(f => f.required && !columnMapping[f.key]);
    if (missingRequired.length > 0) {
      setValidationErrors([
        `Please map the required field(s): ${missingRequired.map(f => f.label).join(', ')}`
      ]);
      return;
    }
    setValidationErrors([]);
    setStep('PREVIEW');
  };

  // Commit Import to IndexedDB & System
  const handleExecuteImport = async () => {
    try {
      setIsProcessing(true);
      setValidationErrors([]);
      let count = 0;

      if (selectedEntity === 'PRODUCTS') {
        const existingMeds = await dbMedicines.getAll();
        const existingBarcodes = new Set(existingMeds.map(m => m.barcode).filter(Boolean));
        const existingNames = new Set(existingMeds.map(m => m.name.toLowerCase()));

        for (const row of fileData) {
          const name = String(row[columnMapping.name] || '').trim();
          if (!name) continue;

          const barcode = row[columnMapping.barcode] ? String(row[columnMapping.barcode]).trim() : '';

          if (skipDuplicates) {
            if (barcode && existingBarcodes.has(barcode)) continue;
            if (existingNames.has(name.toLowerCase())) continue;
          }

          const purchasePrice = Number(row[columnMapping.purchasePrice]) || 0;
          const sellingPrice = Number(row[columnMapping.sellingPrice]) || purchasePrice;
          const qty = Number(row[columnMapping.quantity]) || 0;

          const newMed: Medicine = {
            id: `med-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            name,
            barcode: barcode || `BC-${Date.now().toString().slice(-6)}`,
            purchasePrice,
            sellingPrice,
            mrp: Number(row[columnMapping.mrp]) || sellingPrice,
            quantity: qty,
            lowStockThreshold: 10,
            gstPercentage: 0,
            unit: String(row[columnMapping.unit] || 'PCS'),
            category: String(row[columnMapping.category] || 'General'),
            batchNumber: String(row[columnMapping.batchNumber] || 'BATCH-01'),
            expiryDate: String(row[columnMapping.expiryDate] || '2027-12-31'),
            rackLocation: String(row[columnMapping.rackLocation] || ''),
            manufacturer: 'Standard Pharma',
            showOnline: true,
            showInOnlineStore: true,
            onlineStatus: 'Published',
            onlineSaleAllowed: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await dbMedicines.save(newMed);
          count++;
        }
      } else if (selectedEntity === 'PARTIES') {
        const existingParties = await dbSuppliers.getAll();
        const existingPhones = new Set(existingParties.map(p => p.phone).filter(Boolean));
        const existingNames = new Set(existingParties.map(p => p.name.toLowerCase()));

        for (const row of fileData) {
          const name = String(row[columnMapping.name] || '').trim();
          if (!name) continue;
          const phone = row[columnMapping.phone] ? String(row[columnMapping.phone]).trim() : '';

          if (skipDuplicates) {
            if (phone && existingPhones.has(phone)) continue;
            if (existingNames.has(name.toLowerCase())) continue;
          }

          const newParty: Supplier = {
            id: `party-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            name,
            partyType: (row[columnMapping.partyType] === 'Supplier' ? 'Supplier' : 'Customer'),
            phone,
            company: String(row[columnMapping.company] || ''),
            address: String(row[columnMapping.address] || ''),
            city: String(row[columnMapping.city] || ''),
            openingBalance: Number(row[columnMapping.openingBalance]) || 0,
            balance: Number(row[columnMapping.openingBalance]) || 0,
            creditLimit: Number(row[columnMapping.creditLimit]) || 0,
            taxNumber: String(row[columnMapping.taxNumber] || ''),
            createdAt: new Date().toISOString(),
          };

          await dbSuppliers.save(newParty);
          count++;
        }
      }

      setImportedCount(count);
      setStep('COMPLETE');
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      setValidationErrors([`Import failed: ${err.message || err}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in select-none">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="h-16 bg-slate-900 text-white px-5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Universal Data Import Wizard</h2>
              <p className="text-xs text-slate-400">
                Bulk upload Products, Parties & Invoices with automated column mapping and duplicate safety
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-600">
          {[
            { key: 'UPLOAD', label: '1. Select File & Entity' },
            { key: 'MAP', label: '2. Column Mapping' },
            { key: 'PREVIEW', label: '3. Preview & Validation' },
            { key: 'COMPLETE', label: '4. Finish' },
          ].map(s => (
            <div 
              key={s.key} 
              className={`flex items-center gap-1.5 ${
                step === s.key ? 'text-blue-600 font-extrabold' : 'text-slate-400'
              }`}
            >
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
          {validationErrors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                {validationErrors.map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            </div>
          )}

          {step === 'UPLOAD' && (
            <div className="space-y-5">
              {/* Entity Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Select Import Destination Target
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'PRODUCTS', label: 'Products & Inventory Catalog', desc: 'Item names, barcodes, prices, stock, batches' },
                    { id: 'PARTIES', label: 'Parties & Customers Ledger', desc: 'Customer & supplier contact info, credit limits' },
                    { id: 'INVOICES', label: 'Historical Invoices', desc: 'Past sales and receipts records' },
                  ].map(ent => (
                    <button
                      key={ent.id}
                      type="button"
                      onClick={() => setSelectedEntity(ent.id as any)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        selectedEntity === ent.id
                          ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <h4 className="text-xs font-bold text-slate-900">{ent.label}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">{ent.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Drag & Drop Box */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/20 rounded-2xl text-center cursor-pointer transition-all space-y-3"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv, .xlsx, .xls" 
                  className="hidden" 
                />
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Click or drag & drop Excel / CSV file here</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Supports .xlsx, .xls, and standard UTF-8 .csv files</p>
                </div>
              </div>

              {/* Sample Template Download */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Need a pre-formatted Excel template?</h4>
                  <p className="text-[11px] text-slate-500">Download our sample spreadsheet with matching column headers</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download Template
                </button>
              </div>
            </div>
          )}

          {step === 'MAP' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between">
                <span>Map the columns from your uploaded file to the MBI Inventra system fields:</span>
                <span className="font-bold">{fileData.length} records found in file</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">MBI Target Field</th>
                      <th className="px-4 py-3">Requirement</th>
                      <th className="px-4 py-3">Your Excel File Header</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {targetFields.map(tf => (
                      <tr key={tf.key} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-slate-900">{tf.label}</td>
                        <td className="px-4 py-3">
                          {tf.required ? (
                            <span className="text-red-600 font-bold text-[11px]">* Required</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Optional</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={columnMapping[tf.key] || ''}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, [tf.key]: e.target.value }))}
                            className="w-full max-w-xs px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-- Do Not Import --</option>
                            {columnHeaders.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'PREVIEW' && (
            <div className="space-y-4">
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-slate-900">Preview (First 5 Rows)</h4>
                  <p className="text-slate-500 text-[11px]">Verify that your data parsed correctly before importing</p>
                </div>
                <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>Skip Duplicate Entries</span>
                </label>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      {targetFields.filter(f => columnMapping[f.key]).map(f => (
                        <th key={f.key} className="px-4 py-2.5 whitespace-nowrap">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fileData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        {targetFields.filter(f => columnMapping[f.key]).map(f => (
                          <td key={f.key} className="px-4 py-2.5 text-slate-700 whitespace-nowrap font-medium">
                            {String(row[columnMapping[f.key]] || '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'COMPLETE' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Data Import Successful!</h3>
                <p className="text-xs text-slate-500">
                  Successfully imported <span className="font-bold text-slate-900">{importedCount}</span> records into your {selectedEntity.toLowerCase()} database.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-14 bg-white border-t border-slate-200 px-5 flex items-center justify-between shrink-0">
          {step === 'MAP' && (
            <button
              onClick={() => setStep('UPLOAD')}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Back
            </button>
          )}

          {step === 'PREVIEW' && (
            <button
              onClick={() => setStep('MAP')}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Back
            </button>
          )}

          {step === 'UPLOAD' && <div />}

          <div className="flex items-center gap-2">
            {step === 'MAP' && (
              <button
                onClick={handleProceedToPreview}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
              >
                Proceed to Preview
              </button>
            )}

            {step === 'PREVIEW' && (
              <button
                onClick={handleExecuteImport}
                disabled={isProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5"
              >
                {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Import {fileData.length} Records</span>
              </button>
            )}

            {step === 'COMPLETE' && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
              >
                Done
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
