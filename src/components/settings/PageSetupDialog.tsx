import React, { useState } from 'react';
import { 
  X, Printer, Sliders, Layout, ArrowUp, ArrowDown, GripVertical, 
  CheckCircle2, Sparkles, Shield, Maximize2, AlertCircle, RotateCcw
} from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

interface PageSetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SECTIONS = [
  { id: 'HEADER', name: 'Header Banner & Business Info', icon: '🏢' },
  { id: 'CUSTOMER', name: 'Customer & Billing Details', icon: '👤' },
  { id: 'ITEMS', name: 'Itemized Products & Services Table', icon: '📋' },
  { id: 'WARRANTY_TERMS', name: 'Statutory Warranty & Terms', icon: '⚖️' },
  { id: 'TOTALS_BANK', name: 'Financial Calculations & Bank Details', icon: '💳' },
  { id: 'SIGNATURES', name: 'Authorization & Signatures', icon: '✍️' },
];

export const PageSetupDialog: React.FC<PageSetupDialogProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useSettings();
  const printConf = settings.print;

  const [pageSetupMode, setPageSetupMode] = useState<'FIT_SINGLE_PAGE' | 'FORCE_PAGE_BREAK' | 'CONTINUOUS'>(
    printConf.pageSetupMode || 'FIT_SINGLE_PAGE'
  );
  const [marginMm, setMarginMm] = useState<number>(printConf.customPrintMarginMm ?? 5);
  const [scaleToFit, setScaleToFit] = useState<boolean>(printConf.scaleToFitEnabled ?? true);
  const [scalePercentage, setScalePercentage] = useState<number>(printConf.manualScalePercentage ?? 100);
  const [sections, setSections] = useState<string[]>(
    printConf.sectionOrder && printConf.sectionOrder.length > 0
      ? printConf.sectionOrder
      : DEFAULT_SECTIONS.map(s => s.id)
  );

  const [savedToast, setSavedToast] = useState(false);

  if (!isOpen) return null;

  const moveSection = (index: number, direction: 'UP' | 'DOWN') => {
    const newSections = [...sections];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;
    setSections(newSections);
  };

  const handleSave = () => {
    updateSettings({
      print: {
        ...printConf,
        pageSetupMode,
        customPrintMarginMm: marginMm,
        scaleToFitEnabled: scaleToFit,
        manualScalePercentage: scalePercentage,
        sectionOrder: sections,
      }
    });

    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 800);
  };

  const handleReset = () => {
    setPageSetupMode('FIT_SINGLE_PAGE');
    setMarginMm(5);
    setScaleToFit(true);
    setScalePercentage(100);
    setSections(DEFAULT_SECTIONS.map(s => s.id));
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide">A4 Document Page Setup</h2>
              <p className="text-xs text-slate-400">Configure margins, single-page fit, and section reordering</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-slate-800">

          {/* 1. Page Print Mode */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-2.5">
              1. Document Page Break Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPageSetupMode('FIT_SINGLE_PAGE')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  pageSetupMode === 'FIT_SINGLE_PAGE'
                    ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs">Continuous Single Page Fit</span>
                  {pageSetupMode === 'FIT_SINGLE_PAGE' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Automatically scales content height to ensure entire invoice fits on 1 physical A4 page.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPageSetupMode('FORCE_PAGE_BREAK')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  pageSetupMode === 'FORCE_PAGE_BREAK'
                    ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs">Force Page Break</span>
                  {pageSetupMode === 'FORCE_PAGE_BREAK' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Inserts strict page break before footer signature block if item table overflows.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPageSetupMode('CONTINUOUS')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  pageSetupMode === 'CONTINUOUS'
                    ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs">Continuous Roll</span>
                  {pageSetupMode === 'CONTINUOUS' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  No strict page height constraints (ideal for continuous paper or thermal rolls).
                </p>
              </button>
            </div>
          </div>

          {/* 2. Print Margins */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-black uppercase text-slate-700 tracking-wider block">
                  2. A4 Print Margins Setting
                </label>
                <p className="text-[11px] text-slate-500">
                  Applies CSS <code className="bg-slate-200 px-1 rounded text-slate-800">@page margin</code> to all generated invoices
                </p>
              </div>
              <span className="text-sm font-black font-mono text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200">
                {marginMm} mm
              </span>
            </div>

            {/* Quick Margin Pills */}
            <div className="flex flex-wrap gap-2">
              {[0, 3, 5, 8, 10, 12].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMarginMm(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    marginMm === m
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {m === 0 ? '0mm (Borderless)' : `${m}mm ${m === 5 ? '(Recommended)' : ''}`}
                </button>
              ))}
            </div>

            <input 
              type="range"
              min={0}
              max={15}
              step={1}
              value={marginMm}
              onChange={e => setMarginMm(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
          </div>

          {/* 3. Scale to Fit Engine */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider block">
                  3. Dynamic Scale to Fit Utility
                </span>
                <p className="text-[11px] text-slate-500">
                  Calculates content height vs printable area and scales layout proportionally
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={scaleToFit} 
                  onChange={e => setScaleToFit(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {scaleToFit && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">Manual Scale Target / Zoom Level:</span>
                  <span className="font-black font-mono text-blue-700">{scalePercentage}%</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[100, 95, 90, 85, 80, 75, 70].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setScalePercentage(s)}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                        scalePercentage === s
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {s}% {s === 100 ? '(Normal)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Section Re-ordering */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                4. Drag / Re-order Dynamic Layout Blocks
              </label>
              <button
                type="button"
                onClick={() => setSections(DEFAULT_SECTIONS.map(s => s.id))}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold"
              >
                <RotateCcw className="w-3 h-3" /> Reset Order
              </button>
            </div>

            <div className="space-y-2">
              {sections.map((secId, index) => {
                const secDef = DEFAULT_SECTIONS.find(s => s.id === secId) || { name: secId, icon: '📄' };
                return (
                  <div
                    key={secId}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                      <span className="text-base">{secDef.icon}</span>
                      <span className="text-xs font-bold text-slate-800">{secDef.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveSection(index, 'UP')}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-slate-600"
                        title="Move Section Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === sections.length - 1}
                        onClick={() => moveSection(index, 'DOWN')}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-slate-600"
                        title="Move Section Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Locked Footer Notice */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <span>System Branding Footer <strong className="font-mono">THANKS FOR SHOPPING! DEVELOPED BY MBI INVENTRA</strong> is locked at the bottom.</span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Reset Defaults
          </button>

          <div className="flex items-center gap-2">
            {savedToast && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" /> Page Setup Saved!
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              Apply & Save Settings
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
