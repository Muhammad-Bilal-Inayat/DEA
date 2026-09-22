/**
 * MBI Inventra - Progressive Web App (PWA) & 100% Offline Resilience Service
 * 
 * Features:
 * 1. Automatic Service Worker Registration & Pre-caching.
 * 2. Persistent Storage API (`navigator.storage.persist()`) to prevent browser eviction across PC restarts.
 * 3. Offline status telemetry and instant local-first readiness.
 */

import { registerSW } from 'virtual:pwa-register';

export interface PWAState {
  isRegistered: boolean;
  isPersistent: boolean;
  offlineReady: boolean;
  needRefresh: boolean;
  quotaBytes?: number;
  usageBytes?: number;
}

let pwaState: PWAState = {
  isRegistered: false,
  isPersistent: false,
  offlineReady: false,
  needRefresh: false,
};

let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;

/**
 * Register Service Worker and pre-cache application shell for 100% offline capability
 */
export function registerPWA(): void {
  if (typeof window === 'undefined') return;

  try {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        pwaState.needRefresh = true;
        console.log('%c[MBI PWA]%c New version available. Ready to auto-update in background.', 'color: #38bdf8; font-weight: bold;', 'color: #94a3b8;');
        window.dispatchEvent(new CustomEvent('mbi-pwa-update-available'));
      },
      onOfflineReady() {
        pwaState.offlineReady = true;
        console.log('%c[MBI PWA]%c 100% Offline Ready! App cached for zero-internet execution.', 'color: #10b981; font-weight: bold;', 'color: #94a3b8;');
        window.dispatchEvent(new CustomEvent('mbi-pwa-offline-ready'));
      },
      onRegistered(r) {
        pwaState.isRegistered = true;
        console.log('%c[MBI PWA]%c Service Worker registered successfully.', 'color: #10b981; font-weight: bold;', 'color: #94a3b8;', r);
      },
      onRegisterError(error) {
        console.warn('[MBI PWA] Service Worker registration skipped or failed:', error);
      }
    });

    updateSWFn = updateSW;
  } catch (err) {
    console.warn('[MBI PWA] SW registration init warning:', err);
  }

  // Request Persistent Storage
  requestPersistentStorage();
}

/**
 * Request Persistent Storage from the browser.
 * When granted, the browser will NEVER clear IndexedDB or offline caches upon PC restarts or low disk space!
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.storage || !navigator.storage.persist) {
    return false;
  }

  try {
    const isAlreadyPersisted = await navigator.storage.persisted();
    if (isAlreadyPersisted) {
      pwaState.isPersistent = true;
      console.log('%c[MBI Storage]%c Persistent storage already granted by host browser.', 'color: #10b981; font-weight: bold;', 'color: #94a3b8;');
      return true;
    }

    const granted = await navigator.storage.persist();
    pwaState.isPersistent = granted;
    if (granted) {
      console.log('%c[MBI Storage]%c Persistent storage request GRANTED. Data will survive PC shutdowns and offline days.', 'color: #10b981; font-weight: bold;', 'color: #94a3b8;');
    } else {
      console.warn('[MBI Storage] Persistent storage request was not granted by browser defaults, but IndexedDB remains durable.');
    }
    return granted;
  } catch (err) {
    console.warn('[MBI Storage] Error checking storage persistence:', err);
    return false;
  }
}

/**
 * Check storage estimate (Usage vs Quota)
 */
export async function getStorageEstimate(): Promise<{ usageMB: number; quotaMB: number; percentUsed: number; isPersistent: boolean }> {
  let usageMB = 0;
  let quotaMB = 0;
  let percentUsed = 0;
  let isPersistent = pwaState.isPersistent;

  if (typeof window !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 1;
      usageMB = parseFloat((usage / (1024 * 1024)).toFixed(2));
      quotaMB = parseFloat((quota / (1024 * 1024)).toFixed(2));
      percentUsed = parseFloat(((usage / quota) * 100).toFixed(2));

      if (navigator.storage.persisted) {
        isPersistent = await navigator.storage.persisted();
      }
    } catch (e) {
      // ignore
    }
  }

  return { usageMB, quotaMB, percentUsed, isPersistent };
}

/**
 * Trigger immediate SW reload/update
 */
export async function applyPWAUpdate(): Promise<void> {
  if (updateSWFn) {
    await updateSWFn(true);
  } else {
    window.location.reload();
  }
}
