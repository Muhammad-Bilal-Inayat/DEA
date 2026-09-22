import React, { useEffect, useRef, useState } from 'react';
import { 
  X, Camera, RefreshCw, AlertCircle, CheckCircle2, 
  Scan, Keyboard, Volume2, VolumeX, Sparkles,
  Usb, Radio, Zap, Check, ArrowRight
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { playScannerBeep } from '../../lib/barcodeAudio';
import { useHardwareBarcodeScanner } from '../../hooks/useHardwareBarcodeScanner';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (scannedCode: string, format?: string) => void;
  onScan?: (scannedCode: string, format?: string) => void;
  title?: string;
  subtitle?: string;
  defaultMode?: 'hardware' | 'camera';
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  onScan,
  title = 'Scan Product Barcode',
  subtitle = 'Pull trigger on your attached USB / Wireless barcode scanner gun',
  defaultMode = 'hardware'
}) => {
  // Mode: Default to 'hardware' (attached barcode reader gun)
  const [mode, setMode] = useState<'hardware' | 'camera'>(defaultMode);
  
  // Hardware scanner state
  const [hardwareInput, setHardwareInput] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isBeeping, setIsBeeping] = useState(false);
  const hardwareInputRef = useRef<HTMLInputElement>(null);

  // Camera scanner state
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const elementId = useRef(`barcode-reader-${Math.random().toString(36).substring(2, 9)}`).current;
  const isCameraScanningRef = useRef(false);

  // Auto-focus hardware scanner input when modal opens or when mode is 'hardware'
  useEffect(() => {
    if (isOpen && mode === 'hardware') {
      setHardwareInput('');
      setLastScanned(null);
      const timer = setTimeout(() => {
        hardwareInputRef.current?.focus();
        hardwareInputRef.current?.select();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mode]);

  // Keep focus on input if user clicks inside the hardware scanner view
  const keepFocus = () => {
    if (mode === 'hardware') {
      hardwareInputRef.current?.focus();
    }
  };

  // Reusable scan finisher
  const completeScan = (code: string, source: string) => {
    const clean = code.trim();
    if (!clean) return;

    if (soundEnabled) {
      playScannerBeep('success');
    }
    setIsBeeping(true);
    setLastScanned(clean);

    setTimeout(() => {
      setIsBeeping(false);
      const callback = onScanSuccess || onScan;
      if (callback) {
        callback(clean, source);
      }
      onClose();
    }, 380);
  };

  // Universal Hardware Scanner Hook Listener (Catches rapid bursts even if input wasn't focused)
  useHardwareBarcodeScanner({
    enabled: isOpen && mode === 'hardware',
    onScan: (scannedBarcode) => {
      completeScan(scannedBarcode, 'Attached Hardware Barcode Gun');
    }
  });

  // Handle manual / hardware input Enter submit
  const handleHardwareInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hardwareInput.trim()) return;
    completeScan(hardwareInput.trim(), 'Hardware Barcode Scanner');
  };

  // Camera scanning lifecycle (Only active if user explicitly toggles to 'camera' mode)
  useEffect(() => {
    if (!isOpen || mode !== 'camera') {
      // Safely tear down camera when not in camera mode
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
      return;
    }

    let isMounted = true;
    setIsCameraStarting(true);
    setCameraError(null);

    const startCamera = async () => {
      try {
        await new Promise(r => setTimeout(r, 150));
        if (!isMounted) return;

        const readerElem = document.getElementById(elementId);
        if (!readerElem) throw new Error('Camera element not ready');

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

        const html5QrCode = new Html5Qrcode(elementId, { formatsToSupport, verbose: false });
        html5QrCodeRef.current = html5QrCode;

        const successCallback = (decodedText: string, decodedResult: any) => {
          if (!isCameraScanningRef.current) return;
          isCameraScanningRef.current = false;
          const format = decodedResult?.result?.format?.formatName || 'Camera Barcode';
          
          if (soundEnabled) playScannerBeep('success');
          setLastScanned(decodedText);

          html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {});

          setTimeout(() => {
            onScanSuccess(decodedText, format);
            onClose();
          }, 400);
        };

        await html5QrCode.start(
          { facingMode: facingMode },
          { fps: 15, qrbox: { width: 280, height: 160 }, aspectRatio: 1.3333 },
          successCallback,
          () => {}
        );

        if (isMounted) {
          isCameraScanningRef.current = true;
          setIsCameraStarting(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setIsCameraStarting(false);
          setCameraError(err?.message || 'Camera access error. Please use the attached hardware barcode scanner.');
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      isCameraScanningRef.current = false;
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().then(() => {
            html5QrCodeRef.current?.clear();
          }).catch(() => {});
        } catch (e) {}
      }
    };
  }, [isOpen, mode, facingMode]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={keepFocus}
    >
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                {title}
                <span className="text-[9.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Scanner Ready
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 truncate max-w-[240px]">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
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

        {/* Mode Selector Tabs (Hardware Scanner is Default) */}
        <div className="flex border-b border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode('hardware')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'hardware'
                ? 'bg-white text-blue-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Usb className="w-3.5 h-3.5 text-blue-600" />
            <span>Hardware Barcode Scanner (Recommended)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('camera')}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'camera'
                ? 'bg-white text-blue-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-slate-500" />
            <span>Camera</span>
          </button>
        </div>

        {/* MAIN BODY: Hardware Scanner Mode (Default) */}
        {mode === 'hardware' && (
          <div className="p-6 flex flex-col items-center justify-center text-center space-y-5 bg-gradient-to-b from-slate-50 to-white">
            
            {/* Animated Laser / Scanner Beacon */}
            <div className="relative flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center shadow-inner relative">
                <Scan className={`w-12 h-12 text-emerald-600 transition-transform ${isBeeping ? 'scale-125 text-emerald-500' : ''}`} />
                {/* Horizontal Laser Line animation */}
                <div className="absolute inset-x-2 h-0.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
              </span>
            </div>

            {/* Instruction */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-300">
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                Active & Listening for Attached Scanner Gun
              </div>
              <p className="text-xs text-slate-600 max-w-xs pt-1">
                Point your handheld USB, wireless, or Bluetooth barcode scanner at any medicine box and pull the trigger.
              </p>
              <p className="text-[11px] text-slate-400">
                (No laptop camera needed - scanner operates directly)
              </p>
            </div>

            {/* Live Scan Input Target Form */}
            <form onSubmit={handleHardwareInputSubmit} className="w-full max-w-sm space-y-2">
              <div className="relative">
                <input
                  ref={hardwareInputRef}
                  type="text"
                  autoFocus
                  value={hardwareInput}
                  onChange={(e) => setHardwareInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleHardwareInputSubmit(e);
                    }
                  }}
                  placeholder="Scan barcode now or type code..."
                  className="w-full pl-9 pr-20 py-2.5 bg-white border-2 border-blue-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-center font-mono font-bold text-slate-900 text-sm shadow-xs focus:outline-none transition-all"
                />
                <Usb className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="submit"
                  disabled={!hardwareInput.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
                >
                  OK
                </button>
              </div>
            </form>

            {/* Last Scanned Confirmation Display */}
            {lastScanned && (
              <div className="w-full max-w-sm p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-left animate-in zoom-in-95">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-emerald-700 font-bold uppercase">Scanned Successfully</span>
                    <p className="text-xs font-mono font-black text-slate-900">{lastScanned}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              </div>
            )}

            <div className="flex items-center justify-between w-full max-w-sm pt-2 text-[11px] text-slate-500 border-t border-slate-100">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" /> Auto-detects on trigger
              </span>
              <span>1D EAN, UPC, Code128, 2D QR</span>
            </div>

          </div>
        )}

        {/* CAMERA MODE (Only if explicitly selected) */}
        {mode === 'camera' && (
          <div className="flex flex-col">
            <div className="relative bg-black flex items-center justify-center overflow-hidden min-h-[260px]">
              <div id={elementId} className="w-full h-full overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

              {!cameraError && !lastScanned && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  <div className="w-64 h-36 border-2 border-emerald-400/80 rounded-xl relative shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center">
                    <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-300" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-300" />
                    <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-300" />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-300" />
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse" />
                  </div>
                  <p className="text-white/80 text-[11px] font-semibold mt-3 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                    Align barcode inside red target
                  </p>
                </div>
              )}

              {isCameraStarting && !cameraError && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-2.5 text-white z-10">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                  <p className="text-xs font-semibold">Starting Camera...</p>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center gap-3 z-10">
                  <AlertCircle className="w-8 h-8 text-rose-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Camera Not Available</p>
                    <p className="text-[11px] text-slate-300 mt-1 max-w-xs">{cameraError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('hardware')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Usb className="w-3.5 h-3.5" />
                    Use Attached Hardware Scanner Instead
                  </button>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                className="py-1 px-3 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-blue-600" />
                Flip Camera
              </button>
              <button
                type="button"
                onClick={() => setMode('hardware')}
                className="py-1 px-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Usb className="w-3 h-3" />
                Switch to Hardware Scanner
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
