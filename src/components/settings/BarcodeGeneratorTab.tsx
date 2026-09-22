import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, Barcode, Printer, Search, RefreshCw, Check, 
  Layers, Sliders, Copy, CheckCircle2, Download, AlertCircle, Eye
} from 'lucide-react';
import { dbMedicines } from '../../lib/db';
import { Medicine } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

export type LabelSize = '50x25' | '38x25' | '40x30' | '50x30' | '100x50';

export interface StickerConfig {
  size: LabelSize;
  codeType: 'BARCODE' | 'QR' | 'BOTH';
  showStoreName: boolean;
  showMedicineName: boolean;
  showGeneric: boolean;
  showMrp: boolean;
  showSalePrice: boolean;
  showBatch: boolean;
  showExpiry: boolean;
  copies: number;
}

export const BarcodeGeneratorTab: React.FC = () => {
  const { business } = useAuth();
  const { showToast } = useToast();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

  // Custom manual sticker data (if user wants to print loose strip or custom text)
  const [customMedicineName, setCustomMedicineName] = useState('');
  const [customGeneric, setCustomGeneric] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customBatch, setCustomBatch] = useState('B-2401');
  const [customExpiry, setCustomExpiry] = useState(new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 7));
  const [customMrp, setCustomMrp] = useState<number>(150);
  const [customSalePrice, setCustomSalePrice] = useState<number>(140);

  // Sticker configuration
  const [config, setConfig] = useState<StickerConfig>({
    size: '50x25',
    codeType: 'BARCODE',
    showStoreName: true,
    showMedicineName: true,
    showGeneric: false,
    showMrp: true,
    showSalePrice: true,
    showBatch: true,
    showExpiry: true,
    copies: 1,
  });

  // Generated Canvas / SVG references
  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    setLoading(true);
    try {
      const all = await dbMedicines.getAll();
      setMedicines(all || []);
      if (all && all.length > 0) {
        handleSelectMedicine(all[0]);
      } else {
        // Default placeholder
        setCustomMedicineName('Panadol Extra 500mg');
        setCustomCode('896400012345');
        setCustomGeneric('Paracetamol + Caffeine');
        setCustomMrp(120);
        setCustomSalePrice(115);
      }
    } catch (err) {
      console.error('Failed to load medicines for barcode generator:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMedicine = (med: Medicine) => {
    setSelectedMedicine(med);
    setCustomMedicineName(med.name);
    setCustomGeneric(med.genericName || '');
    // If medicine has no barcode, generate a standard 12-digit code
    const validCode = med.barcode?.trim() || `896${med.id.replace(/[^0-9]/g, '').padEnd(9, '0').slice(0, 9)}` || '896123456789';
    setCustomCode(validCode);
    setCustomBatch(med.batchNumber || 'B-NEW');
    setCustomExpiry(med.expiryDate ? med.expiryDate.slice(0, 7) : new Date().toISOString().slice(0, 7));
    setCustomMrp(med.mrp || 100);
    setCustomSalePrice(med.sellingPrice || med.salePrice || 95);
  };

  // Render Barcode and QR when code changes
  useEffect(() => {
    const codeValue = customCode.trim() || '896000000001';

    // Generate Barcode via JsBarcode
    if (barcodeSvgRef.current && (config.codeType === 'BARCODE' || config.codeType === 'BOTH')) {
      try {
        JsBarcode(barcodeSvgRef.current, codeValue, {
          format: 'CODE128',
          width: 1.3,
          height: config.size === '38x25' ? 24 : 32,
          displayValue: true,
          fontSize: 9,
          margin: 1,
          font: 'monospace',
          fontOptions: 'bold',
        });
      } catch (err) {
        console.warn('JsBarcode render error, falling back to basic display:', err);
      }
    }

    // Generate QR Code via QRCode package
    if (config.codeType === 'QR' || config.codeType === 'BOTH') {
      const qrPayload = JSON.stringify({
        c: codeValue,
        n: customMedicineName,
        p: customSalePrice,
        b: customBatch,
        e: customExpiry
      });

      QRCode.toDataURL(qrPayload, {
        width: 90,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      }).then(url => {
        setQrDataUrl(url);
      }).catch(err => {
        console.warn('QR Code generation error:', err);
      });
    }
  }, [customCode, customMedicineName, customSalePrice, customBatch, customExpiry, config.codeType, config.size]);

  // Filtered search list
  const filteredMedicines = medicines.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.barcode && m.barcode.includes(searchQuery)) ||
    (m.genericName && m.genericName.toLowerCase().includes(searchQuery.toLowerCase()))
  ).slice(0, 20);

  // Trigger Print using dedicated Print Stylesheet
  const handlePrintLabels = () => {
    window.print();
    showToast(`Sending ${config.copies} sticker labels to thermal printer...`, 'success');
  };

  // Dimensions mapping in mm
  const dimensionsMap: Record<LabelSize, { widthMm: number; heightMm: number; label: string }> = {
    '50x25': { widthMm: 50, heightMm: 25, label: '50mm × 25mm (Standard Pharmacy)' },
    '38x25': { widthMm: 38, heightMm: 25, label: '38mm × 25mm (Small Strip)' },
    '40x30': { widthMm: 40, heightMm: 30, label: '40mm × 30mm (Medium Box)' },
    '50x30': { widthMm: 50, heightMm: 30, label: '50mm × 30mm (Syrup / Bottle)' },
    '100x50': { widthMm: 100, heightMm: 50, label: '100mm × 50mm (Outer Carton)' },
  };

  const activeDim = dimensionsMap[config.size];

  return (
    <div className="space-y-6">
      
      {/* Top Banner Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">Thermal Barcode & QR Sticker Generator</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 uppercase tracking-wider">
                Thermal Roll POS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Print direct thermal sticker labels (50×25mm, 38×25mm) for loose strips, syrups, and non-barcoded items for instant counter scanning.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintLabels}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print {config.copies} Label{config.copies > 1 ? 's' : ''} Now</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Product Selection & Data Customizer (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Select Medicine from Catalog */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" />
                Select Medicine from Inventory
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {medicines.length} items loaded
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medicine name, barcode, or generic formula..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {searchQuery && filteredMedicines.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-lg">
                {filteredMedicines.map(m => (
                  <div
                    key={m.id}
                    onClick={() => {
                      handleSelectMedicine(m);
                      setSearchQuery('');
                    }}
                    className="p-2.5 hover:bg-blue-50/70 transition-colors flex items-center justify-between cursor-pointer text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{m.name}</p>
                      <p className="text-[11px] text-slate-500">{m.genericName || m.manufacturer || 'General'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-blue-600">{formatCurrency(m.sellingPrice || m.salePrice || 0)}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Code: {m.barcode || 'N/A'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Editable Fields for the Sticker */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product / Medicine Name</label>
                <input
                  type="text"
                  value={customMedicineName}
                  onChange={(e) => setCustomMedicineName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Barcode / Numerical Code</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const gen = `896${Math.floor(100000000 + Math.random() * 900000000)}`;
                      setCustomCode(gen);
                    }}
                    title="Generate New 12-Digit EAN/Code128"
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Batch Number</label>
                <input
                  type="text"
                  value={customBatch}
                  onChange={(e) => setCustomBatch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Expiry Date (MM/YYYY)</label>
                <input
                  type="text"
                  value={customExpiry}
                  onChange={(e) => setCustomExpiry(e.target.value)}
                  placeholder="e.g. 12/2026"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Retail MRP (Rs.)</label>
                <input
                  type="number"
                  value={customMrp}
                  onChange={(e) => setCustomMrp(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Discounted Sale Price (Rs.)</label>
                <input
                  type="number"
                  value={customSalePrice}
                  onChange={(e) => setCustomSalePrice(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Roll Size & Sticker Customization Toggles */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              Thermal Roll Format & Elements
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Roll Sticker Size</label>
                <select
                  value={config.size}
                  onChange={(e) => setConfig({ ...config, size: e.target.value as LabelSize })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="50x25">50mm × 25mm (Standard Pharmacy Strip)</option>
                  <option value="38x25">38mm × 25mm (Compact 1.5" Roll)</option>
                  <option value="40x30">40mm × 30mm (Medium Strip/Box)</option>
                  <option value="50x30">50mm × 30mm (Syrup & Injection)</option>
                  <option value="100x50">100mm × 50mm (4" Shipping / Carton)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Code Format</label>
                <select
                  value={config.codeType}
                  onChange={(e) => setConfig({ ...config, codeType: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BARCODE">1D Barcode (Code128 / Laser Scanner)</option>
                  <option value="QR">2D QR Code (Camera / 2D Imager)</option>
                  <option value="BOTH">Dual (Barcode + Mini QR Code)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Print Copies</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={config.copies}
                  onChange={(e) => setConfig({ ...config, copies: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Toggle Switches */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showStoreName}
                  onChange={(e) => setConfig({ ...config, showStoreName: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-semibold text-slate-700">Store Name</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showMedicineName}
                  onChange={(e) => setConfig({ ...config, showMedicineName: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-semibold text-slate-700">Medicine Name</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showMrp}
                  onChange={(e) => setConfig({ ...config, showMrp: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-semibold text-slate-700">Show MRP</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showSalePrice}
                  onChange={(e) => setConfig({ ...config, showSalePrice: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-semibold text-slate-700">Sale Price</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showBatch}
                  onChange={(e) => setConfig({ ...config, showBatch: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-semibold text-slate-700">Batch Number</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showExpiry}
                  onChange={(e) => setConfig({ ...config, showExpiry: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-semibold text-slate-700">Expiry Date</span>
              </label>
            </div>
          </div>

        </div>

        {/* Right Column: Live Thermal Sticker Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Live Thermal Sticker Preview</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                {activeDim.label}
              </span>
            </div>

            {/* Sticker Physical Container Preview (Centered) */}
            <div className="py-8 bg-slate-100/80 rounded-xl flex items-center justify-center border border-dashed border-slate-300 p-4">
              
              {/* Thermal Label representation */}
              <div 
                className="bg-white text-black p-2.5 rounded-xs shadow-md border border-slate-300 flex flex-col justify-between overflow-hidden select-none"
                style={{
                  width: `${activeDim.widthMm * 5.2}px`,
                  minHeight: `${activeDim.heightMm * 5.2}px`,
                  fontFamily: 'monospace',
                }}
              >
                {/* Store Header */}
                {config.showStoreName && (
                  <div className="text-center font-black text-[11px] tracking-tight uppercase border-b border-black pb-0.5 mb-1 truncate">
                    {business?.name || 'MBI INVENTRA PHARMACY'}
                  </div>
                )}

                {/* Medicine Title */}
                {config.showMedicineName && (
                  <div className="font-extrabold text-[12px] leading-tight text-left line-clamp-2">
                    {customMedicineName || 'Medicine Name'}
                  </div>
                )}

                {/* Price Line */}
                <div className="flex items-center justify-between text-[11px] font-bold my-1">
                  {config.showSalePrice && (
                    <div>
                      <span className="text-[9px] uppercase">Price: </span>
                      <span className="text-[13px] font-black">Rs.{customSalePrice}</span>
                    </div>
                  )}
                  {config.showMrp && (
                    <div className="text-[10px] text-slate-700">
                      <span>MRP: </span>
                      <span>Rs.{customMrp}</span>
                    </div>
                  )}
                </div>

                {/* Code Rendering (Barcode / QR / Both) */}
                <div className="my-1 flex items-center justify-center gap-2">
                  {(config.codeType === 'BARCODE' || config.codeType === 'BOTH') && (
                    <div className="flex justify-center flex-1 overflow-hidden">
                      <svg ref={barcodeSvgRef} className="max-w-full h-auto" />
                    </div>
                  )}

                  {(config.codeType === 'QR' || config.codeType === 'BOTH') && qrDataUrl && (
                    <div className="shrink-0 flex items-center justify-center">
                      <img 
                        src={qrDataUrl} 
                        alt="QR Code" 
                        className={config.codeType === 'BOTH' ? 'w-10 h-10' : 'w-16 h-16'} 
                      />
                    </div>
                  )}
                </div>

                {/* Batch and Expiry Footer */}
                <div className="flex items-center justify-between text-[9px] font-bold border-t border-black pt-0.5 mt-0.5">
                  {config.showBatch && (
                    <span className="truncate">B: {customBatch}</span>
                  )}
                  {config.showExpiry && (
                    <span className="truncate">EXP: {customExpiry}</span>
                  )}
                </div>

              </div>

            </div>

            {/* Quick Helper Notes */}
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs space-y-1.5 text-blue-900">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Thermal Printer Setup Tip:</span>
              </div>
              <p className="text-[11px] text-blue-700">
                In your Windows / Mac Print dialog, select your thermal printer (e.g. Xprinter, TSC, Zebra) and set Paper Size to match <strong>{activeDim.widthMm}mm × {activeDim.heightMm}mm</strong> with 0 margins for sharp black thermal output.
              </p>
            </div>

            <button
              onClick={handlePrintLabels}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print {config.copies} Sticker Label{config.copies > 1 ? 's' : ''}</span>
            </button>

          </div>
        </div>

      </div>

      {/* Hidden Print Container for Clean Thermal Output */}
      <div id="thermal-print-container" className="hidden print:block print:w-full print:m-0 print:p-0">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * { visibility: hidden !important; }
            #thermal-print-container, #thermal-print-container * { visibility: visible !important; }
            #thermal-print-container {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
            }
            .thermal-page-label {
              page-break-after: always;
              width: ${activeDim.widthMm}mm;
              height: ${activeDim.heightMm}mm;
              padding: 2mm;
              box-sizing: border-box;
              font-family: monospace;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              overflow: hidden;
            }
          }
        `}} />

        {Array.from({ length: config.copies }).map((_, idx) => (
          <div key={idx} className="thermal-page-label">
            {config.showStoreName && (
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '9pt', textTransform: 'uppercase', borderBottom: '1px solid black', paddingBottom: '1px' }}>
                {business?.name || 'MBI INVENTRA PHARMACY'}
              </div>
            )}
            {config.showMedicineName && (
              <div style={{ fontWeight: 'bold', fontSize: '9pt', lineHeight: 1.1 }}>
                {customMedicineName}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', fontWeight: 'bold', margin: '1px 0' }}>
              {config.showSalePrice && <span>Price: Rs.{customSalePrice}</span>}
              {config.showMrp && <span>MRP: Rs.{customMrp}</span>}
            </div>

            <div style={{ textAlign: 'center', margin: '1px 0', display: 'flex', justifyContent: 'center' }}>
              {(config.codeType === 'BARCODE' || config.codeType === 'BOTH') && (
                <div style={{ fontSize: '8pt', fontFamily: 'monospace' }}>
                  *{customCode}*
                </div>
              )}
              {(config.codeType === 'QR' || config.codeType === 'BOTH') && qrDataUrl && (
                <img src={qrDataUrl} alt="QR" style={{ width: '20mm', height: '20mm' }} />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7pt', fontWeight: 'bold', borderTop: '1px solid black', paddingTop: '1px' }}>
              {config.showBatch && <span>B: {customBatch}</span>}
              {config.showExpiry && <span>EXP: {customExpiry}</span>}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
