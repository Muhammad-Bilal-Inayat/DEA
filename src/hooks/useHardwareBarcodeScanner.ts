import { useEffect, useRef } from 'react';

interface HardwareBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minBarcodeLength?: number;
  maxKeyIntervalMs?: number;
  playSound?: boolean;
}

/**
 * Universal Hardware / USB / Bluetooth Barcode Scanner Hook
 * Intercepts rapid keystroke bursts sent by handheld laser/CCD/2D barcode scanners
 * Works whether focus is on the document body, table, or inputs.
 */
export function useHardwareBarcodeScanner({
  onScan,
  enabled = true,
  minBarcodeLength = 3,
  maxKeyIntervalMs = 50,
}: HardwareBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const isFastStreamRef = useRef<boolean>(false);
  const fastKeyCountRef = useRef<number>(0);

  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore functional modifier combinations like Ctrl+C, Alt+F4, Meta+S
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const now = performance.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Check if keystroke is happening at hardware scanner speeds (< 50ms)
      const isRapid = interval < maxKeyIntervalMs;

      // Handle Enter or Tab termination (standard barcode scanner suffixes)
      if (e.key === 'Enter' || e.key === 'Tab') {
        const candidateBarcode = bufferRef.current.trim();
        
        // If we accumulated enough characters and it was a rapid stream
        if (candidateBarcode.length >= minBarcodeLength && (isFastStreamRef.current || candidateBarcode.length >= 6)) {
          e.preventDefault();
          e.stopPropagation();
          bufferRef.current = '';
          isFastStreamRef.current = false;
          fastKeyCountRef.current = 0;
          if (onScanRef.current) {
            onScanRef.current(candidateBarcode);
          }
          return;
        }

        // Reset buffer on standard enter if not a valid barcode
        bufferRef.current = '';
        isFastStreamRef.current = false;
        fastKeyCountRef.current = 0;
        return;
      }

      // Single printable characters (letters, numbers, hyphens, etc.)
      if (e.key.length === 1) {
        if (isRapid) {
          fastKeyCountRef.current += 1;
          if (fastKeyCountRef.current >= 2) {
            isFastStreamRef.current = true;
          }
        } else {
          // Slow keystroke (human typing) - if interval is large (> 150ms), reset buffer
          if (interval > 150) {
            bufferRef.current = '';
            fastKeyCountRef.current = 0;
            isFastStreamRef.current = false;
          }
        }

        bufferRef.current += e.key;

        // Auto-clear buffer if no new characters arrive within 250ms
        const currentBuffer = bufferRef.current;
        setTimeout(() => {
          if (bufferRef.current === currentBuffer) {
            bufferRef.current = '';
            isFastStreamRef.current = false;
            fastKeyCountRef.current = 0;
          }
        }, 300);
      }
    };

    // Use capture phase to catch before other inputs consume if it's a scanner stream
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, minBarcodeLength, maxKeyIntervalMs]);
}
