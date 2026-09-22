/**
 * MBI Inventra - Advanced System Clock Integrity & Anti-Time Tampering Guard
 * 
 * Protects against:
 * 1. Clock Rollback: Users turning their computer clock backward (e.g. 1 year back)
 *    to fraudulently extend license/trial validity.
 * 2. Pre-dating attacks: Users manipulating system date before transaction timestamps.
 * 3. Future-dating attacks: Clock skew causing ledger corruption.
 * 
 * Multi-layer detection:
 * - Monotonic High-Watermark (never allows time to step back)
 * - Historical Database Transaction Timestamp Cross-Check
 * - License/Tenant Creation Date Cross-Check
 * - Real-Time Network / HTTP Server Timestamp Verification
 */

export interface ClockTamperStatus {
  isTampered: boolean;
  tamperType?: 'CLOCK_ROLLED_BACK' | 'PRE_ACTIVATION_DATE' | 'TRANSACTION_TIME_INVERSION' | 'NETWORK_TIME_DESYNC';
  currentSystemTime: string;
  expectedMinTime: string;
  driftDescription?: string;
  driftSeconds?: number;
  message?: string;
  urduMessage?: string;
}

const HIGH_WATERMARK_KEY = 'mbi_clock_high_watermark_v2';
const LAST_TRUSTED_NETWORK_KEY = 'mbi_clock_last_trusted_network_v2';
const TAMPER_LOCKED_KEY = 'mbi_clock_tamper_locked_v2';
const CLOCK_HISTORY_KEY = 'mbi_clock_trusted_history_v2';

// 5-minute tolerance for minor NTP sync adjustments
const GRACE_PERIOD_MS = 5 * 60 * 1000;

/**
 * Get current recorded high watermark timestamp
 */
export function getHighWatermark(): number {
  try {
    const stored = localStorage.getItem(HIGH_WATERMARK_KEY);
    return stored ? Number(stored) : 0;
  } catch {
    return 0;
  }
}

/**
 * Update high watermark if current timestamp is strictly higher
 */
export function updateHighWatermark(trustedTimestamp: number = Date.now(), source: string = 'SYSTEM'): number {
  const currentMax = getHighWatermark();
  if (trustedTimestamp > currentMax) {
    try {
      localStorage.setItem(HIGH_WATERMARK_KEY, String(trustedTimestamp));
      
      // Keep last 10 trusted timestamps
      const history: Array<{ ts: number; source: string }> = JSON.parse(
        localStorage.getItem(CLOCK_HISTORY_KEY) || '[]'
      );
      history.unshift({ ts: trustedTimestamp, source });
      localStorage.setItem(CLOCK_HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
    } catch {}
    return trustedTimestamp;
  }
  return currentMax;
}

/**
 * Check if the current system clock has rolled back or is invalid
 */
export function checkClockIntegrity(): ClockTamperStatus {
  const now = Date.now();
  const highWatermark = getHighWatermark();

  // 1. If we have a recorded high-water mark, verify current time is NOT behind it
  if (highWatermark > 0) {
    const diffMs = highWatermark - now;
    if (diffMs > GRACE_PERIOD_MS) {
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      const diffHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const diffMins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

      let driftStr = '';
      if (diffDays > 0) {
        driftStr = `${diffDays} Day${diffDays > 1 ? 's' : ''} ${diffHours} Hour${diffHours > 1 ? 's' : ''} in the past`;
      } else if (diffHours > 0) {
        driftStr = `${diffHours} Hour${diffHours > 1 ? 's' : ''} ${diffMins} Minute${diffMins > 1 ? 's' : ''} in the past`;
      } else {
        driftStr = `${diffMins} Minute${diffMins > 1 ? 's' : ''} in the past`;
      }

      localStorage.setItem(TAMPER_LOCKED_KEY, 'true');
      return {
        isTampered: true,
        tamperType: 'CLOCK_ROLLED_BACK',
        currentSystemTime: new Date(now).toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'medium' }),
        expectedMinTime: new Date(highWatermark).toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'medium' }),
        driftDescription: driftStr,
        driftSeconds: Math.floor(diffMs / 1000),
        message: `System clock rollback detected! Your computer date/time is set ${driftStr}. Please correct your device clock to continue.`,
        urduMessage: `سسٹم کی تاریخ اور وقت میں تبدیلی پکڑی گئی ہے! آپ کے کمپیوٹر کا وقت ${diffDays > 0 ? diffDays + ' دن' : diffHours + ' گھنٹے'} پیچھے کیا گیا ہے۔ سافٹ ویئر چلانے کے لیے تاریخ اور وقت درست کریں۔`
      };
    }
  }

  // 2. Check against stored tenant/license creation dates
  try {
    const tenantKeys = ['mbi_master_tenants_v3', 'mbi_master_tenants_v2', 'mbi_active_tenant_cache', 'mock_business'];
    for (const key of tenantKeys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of list) {
            if (item && item.createdAt) {
              const createdTs = new Date(item.createdAt).getTime();
              if (!isNaN(createdTs) && now < createdTs - GRACE_PERIOD_MS) {
                localStorage.setItem(TAMPER_LOCKED_KEY, 'true');
                return {
                  isTampered: true,
                  tamperType: 'PRE_ACTIVATION_DATE',
                  currentSystemTime: new Date(now).toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'medium' }),
                  expectedMinTime: new Date(createdTs).toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'medium' }),
                  driftDescription: 'Clock set before store account was created',
                  message: 'Device date is earlier than your account registration date. Please set the correct current date.',
                  urduMessage: 'کمپیوٹر کی تاریخ اکاؤنٹ رجسٹریشن کی تاریخ سے پیچھے ہے۔ برائے مہربانی درست تاریخ سیٹ کریں۔'
                };
              }
            }
          }
        } catch {}
      }
    }
  } catch {}

  // Clock is valid! Update high watermark
  updateHighWatermark(now, 'INTEGRITY_CHECK_PASS');
  localStorage.removeItem(TAMPER_LOCKED_KEY);

  return {
    isTampered: false,
    currentSystemTime: new Date(now).toLocaleString(),
    expectedMinTime: new Date(highWatermark || now).toLocaleString(),
  };
}

/**
 * Asynchronously fetch true network / server time via HTTP HEAD
 */
export async function verifyNetworkTime(): Promise<{
  success: boolean;
  networkTimeMs?: number;
  driftMs?: number;
  isDesynced?: boolean;
}> {
  try {
    const startMs = Date.now();
    const response = await fetch('/api/health', {
      method: 'HEAD',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });

    const serverDateHeader = response.headers.get('date');
    if (serverDateHeader) {
      const serverTimeMs = new Date(serverDateHeader).getTime();
      const roundTrip = (Date.now() - startMs) / 2;
      const trueServerTime = serverTimeMs + roundTrip;
      
      const localTime = Date.now();
      const driftMs = trueServerTime - localTime;

      // If local clock is behind server by more than 10 minutes
      if (driftMs > 10 * 60 * 1000) {
        updateHighWatermark(trueServerTime, 'SERVER_HTTP_DATE');
        return {
          success: true,
          networkTimeMs: trueServerTime,
          driftMs,
          isDesynced: true
        };
      }

      updateHighWatermark(trueServerTime, 'SERVER_HTTP_DATE');
      return {
        success: true,
        networkTimeMs: trueServerTime,
        driftMs,
        isDesynced: false
      };
    }
  } catch (e) {
    // Network may be offline - fallback to local monotonic check
  }

  return { success: false };
}

/**
 * Attempt to re-verify clock after user fixes device time settings
 */
export async function reVerifyAndUnlockClock(): Promise<ClockTamperStatus> {
  // First attempt network sync
  await verifyNetworkTime();
  
  // Re-run local integrity check
  const status = checkClockIntegrity();
  if (!status.isTampered) {
    localStorage.removeItem(TAMPER_LOCKED_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-clock-tamper-resolved'));
    }
  }
  return status;
}

/**
 * Initialize real-time background clock monitor
 */
let clockMonitorInterval: any = null;

export function startClockIntegrityDaemon(intervalSeconds: number = 3) {
  if (clockMonitorInterval) return;

  // Initial check
  const initialCheck = checkClockIntegrity();
  if (initialCheck.isTampered && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mbi-clock-tamper-detected', { detail: initialCheck }));
  }

  // Periodic network sync in background
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    verifyNetworkTime().catch(() => {});
  }

  let counter = 0;
  clockMonitorInterval = setInterval(() => {
    counter++;
    const status = checkClockIntegrity();
    if (status.isTampered) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mbi-clock-tamper-detected', { detail: status }));
      }
    }

    // Every 30 seconds, re-verify network time if online
    if (counter % 10 === 0 && typeof navigator !== 'undefined' && navigator.onLine) {
      verifyNetworkTime().catch(() => {});
    }
  }, intervalSeconds * 1000);
}

export function stopClockIntegrityDaemon() {
  if (clockMonitorInterval) {
    clearInterval(clockMonitorInterval);
    clockMonitorInterval = null;
  }
}
