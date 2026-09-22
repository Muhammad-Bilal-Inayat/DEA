import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Layers,
  Building2
} from 'lucide-react';
import { importCentralMedicinesFromCsv, exportCentralMedicinesToCsv } from '../../../lib/centralMedicineDatabaseService';

interface ImportExportTabProps {
  categories: string[];
  onImportComplete: () => void;
  showToast?: (msg: string) => void;
}

export const ImportExportTab: React.FC<ImportExportTabProps> = ({
  categories,
  onImportComplete,
  showToast
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    totalParsed: number;
    addedCount: number;
    duplicateCount: number;
    message: string;
  } | null>(null);
  const [exportCategory, setExportCategory] = useState('ALL');

  // Sample CSV template generator
  const handleDownloadSampleCsv = () => {
    const csvContent = [
      'Item Name,Brand Name,Company,Category,Generic Formula,Dosage Form,Strength,Unit',
      'Bone Holding Forceps,Endo Tech,Endo Tech,Orthopedic Instruments,Surgical Steel,Instrument,,Piece',
      'Panadol 500mg,Panadol,GSK,Analgesic / Anti-inflammatory,Paracetamol,Tablet,500mg,Strip',
      'Augmentin 625mg,Augmentin,GSK,Antibiotic / Antibacterial,Amoxicillin + Clavulanic Acid,Tablet,625mg,Box',
      'Total Hip Replacement System,FDS Pvt. Ltd.,FDS Pvt. Ltd.,Joint Replacement,Titanium Alloy,Implant,,Set',
      'Risek 20mg,Risek,Getz Pharma,Gastrointestinal,Omeprazole,Capsule,20mg,Box'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'master_central_medicines_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setImportResult(null);
    }
  };

  const handleProcessImport = () => {
    if (!selectedFile) {
      alert('Please select a CSV file to import.');
      return;
    }

    setIsProcessing(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target?.result as string;
        const res = importCentralMedicinesFromCsv(text, 'CSV_IMPORT');

        setIsProcessing(false);
        setImportResult(res);

        if (res.success) {
          if (showToast) showToast(res.message);
          onImportComplete();
        }
      } catch (err: any) {
        setIsProcessing(false);
        setImportResult({
          success: false,
          totalParsed: 0,
          addedCount: 0,
          duplicateCount: 0,
          message: 'Error processing CSV file: ' + (err?.message || 'Invalid format')
        });
      }
    };

    reader.readAsText(selectedFile);
  };

  const handleExportCsv = () => {
    const csv = exportCentralMedicinesToCsv(exportCategory);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `central_medicines_${exportCategory.toLowerCase().replace(/[^a-z0-9]/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast('Central medicine catalog exported to CSV.');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Import Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Central Excel / CSV Import</span>
          </div>

          <button
            onClick={handleDownloadSampleCsv}
            className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 underline font-medium"
          >
            <Download className="w-3 h-3" />
            Download Sample CSV
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Upload bulk lists of surgical instruments, medicines, orthopedic items, and brands.
          Duplicate entries will be automatically filtered.
        </p>

        {/* Upload Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl p-6 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/70 transition-all"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="text-xs font-semibold text-white">
              {selectedFile ? selectedFile.name : 'Click to select or drag CSV file'}
            </div>
            <div className="text-[11px] text-slate-500">
              {selectedFile
                ? `${(selectedFile.size / 1024).toFixed(1)} KB • Ready to process`
                : 'Supports CSV formatted with standard columns'}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          disabled={!selectedFile || isProcessing}
          onClick={handleProcessImport}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg text-xs shadow-md shadow-sky-600/20 transition-colors"
        >
          <UploadCloud className="w-4 h-4" />
          {isProcessing ? 'Parsing and Importing...' : 'Import to Central Database'}
        </button>

        {/* Result Message */}
        {importResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              importResult.success
                ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-200'
                : 'bg-rose-950/20 border-rose-800/60 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {importResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              <span>{importResult.message}</span>
            </div>

            {importResult.success && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-900/40 text-center font-mono text-[11px]">
                <div className="bg-slate-900/60 p-2 rounded">
                  <div className="text-slate-400">Parsed</div>
                  <div className="text-white font-bold">{importResult.totalParsed}</div>
                </div>
                <div className="bg-slate-900/60 p-2 rounded">
                  <div className="text-emerald-400">Added</div>
                  <div className="text-white font-bold">{importResult.addedCount}</div>
                </div>
                <div className="bg-slate-900/60 p-2 rounded">
                  <div className="text-amber-400">Skipped (Dupes)</div>
                  <div className="text-white font-bold">{importResult.duplicateCount}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm pb-3 border-b border-slate-800">
            <Download className="w-4 h-4" />
            <span>Central Medicine Catalog Export</span>
          </div>

          <p className="text-xs text-slate-400">
            Export full centralized medicine database records as an Excel-compatible CSV file.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Filter by Category</label>
            <select
              value={exportCategory}
              onChange={e => setExportCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-white font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Standard Formatted Export</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Exports include Item Name, Generic Formula, Brand, Company, Category, Source, and Assigned Tenants.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCsv}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs shadow-md shadow-indigo-600/20 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Central Catalog to CSV
        </button>
      </div>
    </div>
  );
};
