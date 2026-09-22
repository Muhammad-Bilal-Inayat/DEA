import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerPWA } from './lib/pwaService';
import { wipeAllDataExceptMedicines } from './lib/db';

// One-time startup reset: Remove all data except medicine name catalog database
if (typeof window !== 'undefined' && localStorage.getItem('mbi_wipe_total_clean_v3') !== 'true') {
  localStorage.setItem('mbi_wipe_total_clean_v3', 'true');
  wipeAllDataExceptMedicines().catch(console.error);
}

// Initialize Progressive Web App Service Worker and Persistent Storage
registerPWA();

// Comprehensive bootstrap tracking & diagnostic logger
const BOOTSTRAP_START = performance.now();
console.groupCollapsed(
  '%c[MBI Bootstrap]%c Initializing Application Engine...',
  'background: #1e293b; color: #38bdf8; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
  'color: #94a3b8;'
);
console.log('Timestamp:', new Date().toISOString());
console.log('User Agent:', navigator.userAgent);
console.log('Online Status:', navigator.onLine ? 'ONLINE' : 'OFFLINE');
console.log('Viewport:', `${window.innerWidth}x${window.innerHeight}`);
console.log('Iframe Container:', window.self !== window.top);
console.groupEnd();

// Global listener for early unhandled errors before React root mounts
window.addEventListener('error', (event: any) => {
  // Ignore resource load errors (img, script, link tags) which emit target events without JS error messages
  if (event.target && event.target !== window && (event.target.tagName || event.target.nodeName)) {
    if (event.preventDefault) event.preventDefault();
    return true;
  }

  const msg = event?.message || (event?.error && event.error.message) || '';
  if (
    !msg ||
    msg === 'Script error.' ||
    msg.includes('ResizeObserver') || 
    msg.includes('Script error.') ||
    msg.includes('failed to connect to websocket') ||
    msg.includes("Cannot read properties of undefined (reading 'send')") ||
    msg.includes("Cannot set property fetch of #<Window>") ||
    msg.includes("which has only a getter")
  ) {
    if (event.preventDefault) event.preventDefault();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    return true;
  }
  console.error('[MBI Global Error Hook]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
  });
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const reasonMsg = String(event?.reason?.message || event?.reason || '');
  // Always prevent default to prevent top-level unhandled rejection crash in iframe
  if (event.preventDefault) event.preventDefault();
  if (event.stopImmediatePropagation) event.stopImmediatePropagation();

  if (
    reasonMsg.includes('ResizeObserver') ||
    reasonMsg.includes('failed to connect to websocket') ||
    reasonMsg.includes("Cannot read properties of undefined (reading 'send')") ||
    reasonMsg.includes("Cannot set property fetch of #<Window>") ||
    reasonMsg.includes("which has only a getter") ||
    reasonMsg.includes('AudioContext') ||
    reasonMsg.includes('audio') ||
    reasonMsg.includes('permission-denied') ||
    reasonMsg.includes('unavailable') ||
    reasonMsg.includes('AbortError') ||
    reasonMsg.includes('QuotaExceededError') ||
    reasonMsg.includes('network') ||
    reasonMsg.includes('fetch')
  ) {
    return true;
  }
  console.warn('[MBI Managed Async Rejection]', event.reason);
  return true;
}, true);

// Safe Mount Execution with Catch-All Fallback
try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Fatal DOM Error: Element #root not found in document.');
  }

  const root = createRoot(rootElement);

  // Mark app as mounted and clear early timeout fallback
  (window as any).__mbi_mounted = true;
  if ((window as any).__mbi_timeout_timer) {
    clearTimeout((window as any).__mbi_timeout_timer);
  }

  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );

  console.log(`%c[MBI Bootstrap]%c Mounted successfully in ${(performance.now() - BOOTSTRAP_START).toFixed(1)}ms`, 'color: #10b981; font-weight: bold;', 'color: #94a3b8;');
} catch (err: any) {
  console.error('[MBI Fatal Mount Error]', err);
  // Render Emergency Fallback directly into root if React bootstrap fails
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="min-height: 100vh; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: system-ui, sans-serif;">
        <div style="max-width: 480px; width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 24px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
          <div style="width: 48px; height: 48px; background: rgba(220, 38, 38, 0.2); color: #f87171; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; font-size: 24px; font-weight: bold;">
            ⚠️
          </div>
          <h2 style="font-size: 18px; font-weight: bold; margin: 0 0 8px 0; color: #ffffff;">Application Initialization Error</h2>
          <p style="font-size: 13px; color: #94a3b8; margin: 0 0 16px 0; line-height: 1.5;">
            A critical error prevented the application from mounting. This is usually caused by corrupted cached data.
          </p>
          <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 11px; color: #f87171; text-align: left; max-height: 120px; overflow-y: auto; margin-bottom: 20px;">
            ${err?.message || 'Unknown initialization error'}
          </div>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button onclick="window.location.reload()" style="padding: 10px 16px; background: #334155; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 12px; cursor: pointer;">
              Reload Page
            </button>
            <button onclick="window.__mbi_emergency_reset()" style="padding: 10px 16px; background: #dc2626; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 12px; cursor: pointer;">
              Reset Local Data & Restart
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
