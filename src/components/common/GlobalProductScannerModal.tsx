import React, { useEffect, useRef, useState } from 'react';
import { 
  X, Camera, RefreshCw, AlertCircle, CheckCircle2, 
  Scan, Keyboard, Volume2, VolumeX, Sparkles, Package,
  AlertTriangle, ArrowRight, ShieldAlert, Plus, Eye, Edit3,
  Search, Layers, Tag, DollarSign, Calendar, Clock, MapPin, Check,
  Usb, Radio, Zap
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Medicine } from '../../types';
import { dbMedicines } from '../../lib/db';
import { calculateDaysUntilExpiry } from '../../lib/fefoEngine';
import { formatCurrency } from '../../lib/utils';
import { emitToast } from '../../contexts/ToastContext';
import { playScannerBeep } from '../../lib/barcodeAudio';
import { useHardwareBarcodeScanner } from '../../hooks/useHardwareBarcodeScanner';

interface GlobalProductScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProductForSale?: (medicine: Medicine, batchNumber?: string) => void;
  onOpenProduct360?: (medicine: Medicine) => void;
  onEditProduct?: (medicine: Medicine) => void;
  context?: 'sales' | 'inventory' | 'general';
}

export const GlobalProductScannerModal: React.FC<GlobalProductScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectProductForSale,
  onOpenProduct360,
  onEditProduct,
  context = 'general'
}) => {
  const [mode, setMode] = useState<'hardware' | 'camera'>('hardware');
  const [hardwareInput, setHardwareInput] = useState('');
  const hardwareInputRef = useRef<HTMLInputElement>(null);

  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Identified Medicine State
  const [matchedMedicine, setMatchedMedicine] = useState<Medicine | null>(null);
  const [matchedBatchNumber, setMatchedBatchNumber] = useState<string | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const elementId = useRef(`global-scanner-${Math.random().toString(36).substring(2, 9)}`).current;
  const isScanningRef = useRef(false);

  // Auto-focus hardware scanner input
  useEffect(() => {
    if (isOpen && mode === 'hardware' && !matchedMedicine) {
      setHardwareInput('');
      const timer = setTimeout(() => {
        hardwareInputRef.current?.focus();
        hardwareInputRef.current?.select();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mode, matchedMedicine]);

  // Load medicines database for instant local lookups
  useEffect(() => {
    if (!isOpen) return;
    dbMedicines.getAll().then((meds) => setAllMedicines(meds || []));
  }, [isOpen]);

  // Universal Hardware Scanner Hook
  useHardwareBarcodeScanner({
    enabled: isOpen,
    onScan: (scanned) => {
      performProductLookup(scanned);
    }
  });

  // Lookup function for scanned barcode / EAN / batch / item code
  const performProductLookup = (rawQuery: string) => {
    const clean = rawQuery.trim().toLowerCase();
    if (!clean) return;

    setScannedCode(rawQuery);
    setSearchAttempted(true);

    let foundMed: Medicine | null = null;
    let foundBatch: string | null = null;

    // 1. Direct Barcode Match
    foundMed = allMedicines.find(m => m.barcode && m.barcode.trim().toLowerCase() === clean) || null;

    // 2. Item ID / Code Match
    if (!foundMed) {
      foundMed = allMedicines.find(m => ((m as any).code && (m as any).code.trim().toLowerCase() === clean) || m.id.toLowerCase() === clean) || null;
    }

    // 3. Batch Number Match inside medicine batches
    if (!foundMed) {
      for (const m of allMedicines) {
        if (m.batchNumber && m.batchNumber.trim().toLowerCase() === clean) {
          foundMed = m;
          foundBatch = m.batchNumber;
          break;
        }
        if (m.batches && Array.isArray(m.batches)) {
          const matchedB = m.batches.find(b => b.batchNumber && b.batchNumber.trim().toLowerCase() === clean);
          if (matchedB) {
            foundMed = m;
            foundBatch = matchedB.batchNumber;
            break;
          }
        }
      }
    }

    // 4. Fallback: Medicine Name Exact/Substring Match
    if (!foundMed) {
      foundMed = allMedicines.find(m => m.name.toLowerCase().includes(clean) || (m.genericName && m.genericName.toLowerCase().includes(clean))) || null;
    }

    if (foundMed) {
      setMatchedMedicine(foundMed);
      setMatchedBatchNumber(foundBatch || foundMed.batchNumber || null);
      if (soundEnabled) playScannerBeep();
    } else {
      setMatchedMedicine(null);
      setMatchedBatchNumber(null);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setMatchedMedicine(null);
      setScannedCode(null);
      setSearchAttempted(false);
      setManualCode('');
      return;
    }

    if (mode !== 'camera') {
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().then(() => {
            html5QrCodeRef.current?.clear();
            html5QrCodeRef.current = null;
          }).catch(() => {
            html5QrCodeRef.current = null;
          });
        } catch (e) {
          html5QrCodeRef.current = null;
        }
      }
      setIsStarting(false);
      return;
    }

    let isMounted = true;
    setIsStarting(true);
    setScannerError(null);

    const startScanner = async () => {
      try {
        await new Promise(r => setTimeout(r, 150));
        if (!isMounted) return;

        const readerElem = document.getElementById(elementId);
        if (!readerElem) {
          throw new Error('Viewfinder element container not ready');
        }

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ];

        const html5QrCode = new Html5Qrcode(elementId, {
          formatsToSupport,
          verbose: false
        });
        html5QrCodeRef.current = html5QrCode;

        const qrCodeSuccessCallback = (decodedText: string) => {
          if (!isScanningRef.current) return;
          isScanningRef.current = false;

          performProductLookup(decodedText);

          // Stop camera stream safely
          html5QrCode.stop().then(() => {
            html5QrCode.clear();
          }).catch(() => {});

          if (isMounted) setIsStarting(false);
        };

        const config = {
          fps: 15,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.333333,
        };

        await html5QrCode.start(
          { facingMode: facingMode },
          config,
          qrCodeSuccessCallback,
          () => {}
        );

        if (isMounted) {
          isScanningRef.current = true;
          setIsStarting(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setIsStarting(false);
          setScannerError(
            err?.message || 'Camera stream could not be started. Allow camera permissions or use manual entry.'
          );
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      isScanningRef.current = false;
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().then(() => {
            html5QrCodeRef.current?.clear();
          }).catch(() => {});
        } catch (e) {}
      }
    };
  }, [isOpen, mode, facingMode]);

  const handleRestartScan = () => {
    setMatchedMedicine(null);
    setScannedCode(null);
    setSearchAttempted(false);
    setHardwareInput('');
    setScannerError(null);

    if (mode === 'hardware') {
      setTimeout(() => {
        hardwareInputRef.current?.focus();
        hardwareInputRef.current?.select();
      }, 50);
      return;
    }

    setIsStarting(true);
    if (html5QrCodeRef.current) {
      try {
        html5QrCodeRef.current.stop().then(() => {
          html5QrCodeRef.current?.clear();
          setFacingMode(prev => prev); // Trigger re-mount
        }).catch(() => {
          setFacingMode(prev => prev);
        });
      } catch (e) {
        setFacingMode(prev => prev);
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    performProductLookup(manualCode.trim());
  };

  const handleAddToSale = () => {
    if (!matchedMedicine) return;
    if (onSelectProductForSale) {
      onSelectProductForSale(matchedMedicine, matchedBatchNumber || undefined);
    } else {
      // Broadcast global event for Sales page listener
      window.dispatchEvent(new CustomEvent('mbi-add-to-sale', {
        detail: { medicine: matchedMedicine, batchNumber: matchedBatchNumber }
      }));
      emitToast(`Added ${matchedMedicine.name} to Active Sale Invoice`, 'success');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Scan className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                Instant Product & Barcode Identifier
                <span className="text-[9.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {mode === 'hardware' ? 'Scanner Gun (HID)' : 'Camera'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                {mode === 'hardware' 
                  ? 'Scan barcode directly with your USB or wireless scanner gun' 
                  : 'Align EAN-13, UPC, QR, or Batch Code inside camera frame'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Beep Sound' : 'Enable Beep Sound'}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="bg-slate-800/90 border-b border-slate-700/80 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setMode('hardware');
                handleRestartScan();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                mode === 'hardware'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Usb className="w-3.5 h-3.5" />
              <span>Barcode Scanner Gun (Recommended)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('camera');
                handleRestartScan();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                mode === 'camera'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera</span>
            </button>
          </div>

          <div className="text-[11px] font-semibold text-emerald-400 hidden sm:flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Scanner Ready</span>
          </div>
        </div>

        {/* Viewfinder Camera Stream OR Hardware Scanner Station OR Identification Card */}
        <div className="relative bg-slate-950 flex flex-col items-center justify-center overflow-hidden min-h-[260px] shrink-0">
          
          {!matchedMedicine && mode === 'hardware' && (
            <div className="w-full p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
                  <Scan className="w-8 h-8 animate-pulse" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>

              <div className="space-y-1 max-w-sm">
                <h4 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                  <span>Hardware Barcode Scanner Gun Ready</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                    Active
                  </span>
                </h4>
                <p className="text-xs text-slate-300">
                  Point your handheld USB or wireless barcode scanner at any medicine barcode and pull the trigger.
                </p>
                <p className="text-[10.5px] text-slate-400">
                  (Direct hardware scanner input — laptop camera is not required)
                </p>
              </div>

              {/* Live Scanner Field */}
              <div className="w-full max-w-md">
                <div className="relative flex items-center">
                  <Scan className="w-4 h-4 text-emerald-400 absolute left-3 pointer-events-none" />
                  <input
                    ref={hardwareInputRef}
                    type="text"
                    value={hardwareInput}
                    onChange={(e) => setHardwareInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && hardwareInput.trim()) {
                        e.preventDefault();
                        performProductLookup(hardwareInput.trim());
                        setHardwareInput('');
                      }
                    }}
                    placeholder="Scan with gun or type barcode & press Enter..."
                    className="w-full pl-9 pr-24 py-2.5 bg-slate-900 border-2 border-emerald-500/60 rounded-xl text-xs font-mono font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (hardwareInput.trim()) {
                        performProductLookup(hardwareInput.trim());
                        setHardwareInput('');
                      }
                    }}
                    disabled={!hardwareInput.trim()}
                    className="absolute right-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Lookup
                  </button>
                </div>
              </div>

              {/* No match error banner if search attempted */}
              {searchAttempted && !matchedMedicine && scannedCode && (
                <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl text-xs text-amber-200 max-w-md flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-left">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Barcode &quot;{scannedCode}&quot; not found in medicines list.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRestartScan}
                    className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 rounded font-bold text-[10px] cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          {!matchedMedicine && mode === 'camera' && (
            <>
              {/* HTML5 QR Reader Container */}
              <div id={elementId} className="w-full h-[260px] overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

              {/* Laser Target Reticle Overlay */}
              {!scannerError && !scannedCode && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                  <div className="w-64 h-36 border-2 border-emerald-400/80 rounded-xl relative shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center">
                    <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-300" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-300" />
                    <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-300" />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-300" />
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse" />
                  </div>
                  <p className="text-white/80 text-[11px] font-semibold mt-3 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                    Align barcode or batch code within target reticle
                  </p>
                </div>
              )}

              {/* Camera Starting Loader */}
              {isStarting && !scannerError && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-2.5 text-white z-10">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                  <p className="text-xs font-semibold">Initializing Camera Feed...</p>
                </div>
              )}

              {/* Camera Error State */}
              {scannerError && (
                <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center gap-3 z-10">
                  <AlertCircle className="w-8 h-8 text-rose-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Camera Access Notice</p>
                    <p className="text-[11px] text-slate-300 mt-1 max-w-xs">{scannerError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowManualInput(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                    Type Barcode or Batch Code Manually
                  </button>
                </div>
              )}

              {/* No Match Found Notification */}
              {searchAttempted && !matchedMedicine && scannedCode && (
                <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center gap-3 z-20 animate-in fade-in">
                  <AlertTriangle className="w-9 h-9 text-amber-400 animate-bounce" />
                  <div>
                    <h4 className="text-sm font-bold text-white">No Matching Product Found</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Scanned Code: <span className="font-mono font-bold text-amber-300">{scannedCode}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      No registered medicine or batch matched this identifier in your inventory database.
                    </p>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={handleRestartScan}
                      className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Scan Again
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManualInput(true)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Keyboard className="w-3.5 h-3.5" />
                      Search Manually
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* INSTANT PRODUCT IDENTIFICATION CARD */}
          {matchedMedicine && (
            <div className="w-full bg-slate-900 text-white p-4 space-y-3 animate-in zoom-in-95">
              
              {/* Product Header Badge */}
              <div className="flex items-start justify-between gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Identified Product
                    </span>
                    {matchedMedicine.category && (
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold">
                        {matchedMedicine.category}
                      </span>
                    )}
                    {matchedMedicine.dosageForm && (
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[10px] font-bold">
                        {matchedMedicine.dosageForm}
                      </span>
                    )}
                  </div>
                  
                  <h2 className="text-base font-black text-white truncate">{matchedMedicine.name}</h2>
                  <p className="text-xs text-slate-300 truncate">
                    Formula: <span className="font-semibold text-slate-200">{matchedMedicine.genericName || 'N/A'}</span> • Manufacturer: {matchedMedicine.manufacturer || 'Standard Pharma'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Total Stock</div>
                  <div className={`text-lg font-black ${
                    matchedMedicine.quantity <= (matchedMedicine.lowStockThreshold || 10)
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                  }`}>
                    {matchedMedicine.quantity} {matchedMedicine.unit || 'Box'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Rack: {matchedMedicine.rackLocation || 'A-1'}
                  </div>
                </div>
              </div>

              {/* Scanned Code details */}
              <div className="flex items-center justify-between text-xs bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400">Scanned Barcode / Batch Code:</span>
                <span className="font-mono font-bold text-amber-300">{scannedCode}</span>
              </div>

            </div>
          )}

        </div>

        {/* IDENTIFICATION DETAILS & BATCH BREAKDOWN */}
        {matchedMedicine ? (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/90 overflow-y-auto space-y-4 flex-1">
            
            {/* Quick Metrics & Financials */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Selling Price</span>
                <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                  Rs {matchedMedicine.sellingPrice.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block">per {matchedMedicine.unit || 'Box'}</span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Purchase Rate</span>
                <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">
                  Rs {matchedMedicine.purchasePrice.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block">Cost basis</span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">MRP Retail</span>
                <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                  Rs {(matchedMedicine.mrp || matchedMedicine.sellingPrice).toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block">Max Retail</span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Profit Margin</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {matchedMedicine.sellingPrice > matchedMedicine.purchasePrice
                    ? (((matchedMedicine.sellingPrice - matchedMedicine.purchasePrice) / matchedMedicine.sellingPrice) * 100).toFixed(1)
                    : 0}%
                </span>
                <span className="text-[10px] text-slate-400 block">Gross Profit %</span>
              </div>
            </div>

            {/* Batch Traceability Details */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Available Batch Traceability Streams
                </span>
                <span className="text-[10px] text-slate-500">
                  {matchedMedicine.batches?.length || 1} Batch Record(s)
                </span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {matchedMedicine.batches && matchedMedicine.batches.length > 0 ? (
                  matchedMedicine.batches.map((b, idx) => {
                    const daysLeft = calculateDaysUntilExpiry(b.expiryDate);
                    const isSelectedBatch = matchedBatchNumber === b.batchNumber;

                    return (
                      <div 
                        key={idx}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                          isSelectedBatch
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-1 ring-blue-400'
                            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{b.batchNumber}</span>
                            {isSelectedBatch && (
                              <span className="px-1.5 py-0.2 bg-blue-600 text-white font-bold text-[9px] rounded">
                                Scanned Batch
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Exp: <strong className="font-mono text-slate-700 dark:text-slate-300">{b.expiryDate}</strong></span>
                            <span>• Rate: Rs {b.sellingPrice || matchedMedicine.sellingPrice}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] block ${
                            daysLeft <= 0
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : daysLeft <= 30
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                              : daysLeft <= 90
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {daysLeft <= 0 ? 'EXPIRED' : `${daysLeft} Days Left`}
                          </span>
                          <span className="text-[10px] text-slate-500 block font-bold mt-0.5">
                            Qty: {b.quantity} {matchedMedicine.unit || 'Box'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">Batch: {matchedMedicine.batchNumber || 'DEFAULT'}</span>
                      <p className="text-[11px] text-slate-500">Expiry: {matchedMedicine.expiryDate || 'N/A'}</p>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Qty: {matchedMedicine.quantity} {matchedMedicine.unit || 'Box'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleAddToSale}
                className="flex-1 min-w-[180px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Active Sale Invoice</span>
              </button>

              {onOpenProduct360 && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenProduct360(matchedMedicine);
                    onClose();
                  }}
                  className="py-2.5 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  <span>Product 360</span>
                </button>
              )}

              {onEditProduct && (
                <button
                  type="button"
                  onClick={() => {
                    onEditProduct(matchedMedicine);
                    onClose();
                  }}
                  className="py-2.5 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Edit Item</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleRestartScan}
                className="py-2.5 px-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Scan Another</span>
              </button>
            </div>

          </div>
        ) : (
          /* Controls Bar for Viewfinder or Hardware mode */
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
            
            <div className="flex items-center justify-between gap-2">
              {mode === 'camera' ? (
                <button
                  type="button"
                  onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                  className="flex-1 py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Flip Camera ({facingMode === 'environment' ? 'Rear' : 'Front'})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    hardwareInputRef.current?.focus();
                    hardwareInputRef.current?.select();
                  }}
                  className="flex-1 py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Scan className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Focus Scanner Gun Input</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowManualInput(!showManualInput)}
                className="flex-1 py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Keyboard className="w-3.5 h-3.5 text-indigo-600" />
                <span>{showManualInput ? 'Hide Keypad' : 'Manual Entry'}</span>
              </button>
            </div>

            {showManualInput && (
              <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2 animate-in fade-in">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  Enter Barcode, EAN-13, Item Code, or Batch Number:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. 8964000190059 or BATCH-1042"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!manualCode.trim()}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Lookup
                  </button>
                </div>
              </form>
            )}

            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
              <span>Press Alt+S anytime to launch camera scanner</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-500" /> Real-time Batch Traceability
              </span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
