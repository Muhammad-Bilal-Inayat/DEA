import { ExchangeRateItem, MultiCurrencySettings } from '../types';

export const DEFAULT_CURRENCIES: ExchangeRateItem[] = [
  {
    code: 'PKR',
    name: 'Pakistani Rupee',
    symbol: 'Rs.',
    rate: 1.0,
    isBase: true,
    isEnabled: true,
    manualOverride: false,
    lastUpdated: new Date().toISOString(),
    flag: '🇵🇰',
  },
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    rate: 278.50,
    isBase: false,
    isEnabled: true,
    manualOverride: false,
    lastUpdated: new Date().toISOString(),
    flag: '🇺🇸',
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    rate: 305.20,
    isBase: false,
    isEnabled: true,
    manualOverride: false,
    lastUpdated: new Date().toISOString(),
    flag: '🇪🇺',
  },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    rate: 365.80,
    isBase: false,
    isEnabled: true,
    manualOverride: false,
    lastUpdated: new Date().toISOString(),
    flag: '🇬🇧',
  },
  {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'AED',
    rate: 75.85,
    isBase: false,
    isEnabled: true,
    manualOverride: false,
    lastUpdated: new Date().toISOString(),
    flag: '🇦🇪',
  },
  {
    code: 'SAR',
    name: 'Saudi Riyal',
    symbol: 'SAR',
    rate: 74.20,
    isBase: false,
    isEnabled: true,
    manualOverride: false,
    lastUpdated: new Date().toISOString(),
    flag: '🇸🇦',
  },
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    rate: 205.40,
    isBase: false,
    isEnabled: true,
    manualOverride: false,
    lastUpdated: new Date().toISOString(),
    flag: '🇨🇦',
  },
  {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    rate: 185.10,
    isBase: false,
    isEnabled: true,
    manualOverride: false,
    lastUpdated: new Date().toISOString(),
    flag: '🇦🇺',
  },
  {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    rate: 39.20,
    isBase: false,
    isEnabled: true,
    manualOverride: false,
    lastUpdated: new Date().toISOString(),
    flag: '🇨🇳',
  },
  {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    rate: 3.32,
    isBase: false,
    isEnabled: true,
    manualOverride: false,
    lastUpdated: new Date().toISOString(),
    flag: '🇮🇳',
  },
  {
    code: 'TRY',
    name: 'Turkish Lira',
    symbol: '₺',
    rate: 8.15,
    isBase: false,
    isEnabled: true,
    manualOverride: false,
    lastUpdated: new Date().toISOString(),
    flag: '🇹🇷',
  },
  {
    code: 'KWD',
    name: 'Kuwaiti Dinar',
    symbol: 'KWD',
    rate: 909.50,
    isBase: false,
    isEnabled: true,
    manualOverride: false,
    lastUpdated: new Date().toISOString(),
    flag: '🇰🇼',
  },
  {
    code: 'OMR',
    name: 'Omani Rial',
    symbol: 'OMR',
    rate: 723.40,
    isBase: false,
    isEnabled: true,
    manualOverride: false,
    lastUpdated: new Date().toISOString(),
    flag: '🇴🇲',
  },
  {
    code: 'QAR',
    name: 'Qatari Riyal',
    symbol: 'QAR',
    rate: 76.50,
    isBase: false,
    isEnabled: true,
    manualOverride: false,
    lastUpdated: new Date().toISOString(),
    flag: '🇶🇦',
  },
  {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    rate: 1.88,
    isBase: false,
    isEnabled: false,
    manualOverride: false,
    lastUpdated: new Date().toISOString(),
    flag: '🇯🇵',
  },
];

export const DEFAULT_MULTI_CURRENCY_CONFIG: MultiCurrencySettings = {
  baseCurrency: 'PKR',
  autoUpdate: true,
  autoUpdateFrequency: 'daily',
  lastSynced: new Date().toISOString(),
  currencies: DEFAULT_CURRENCIES,
};

const STORAGE_KEY = 'mbi_multi_currency_settings';

/**
 * Retrieve current multi-currency configuration
 */
export function getMultiCurrencySettings(): MultiCurrencySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.currencies) && parsed.currencies.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse multi-currency settings, using defaults', e);
  }
  return DEFAULT_MULTI_CURRENCY_CONFIG;
}

/**
 * Save multi-currency configuration to local storage and broadcast event
 */
export function saveMultiCurrencySettings(settings: MultiCurrencySettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('multi-currency-updated', { detail: settings }));
  } catch (e) {
    console.error('Failed to save multi-currency settings', e);
  }
}

/**
 * Fetch live exchange rates from public open rates API
 */
export async function fetchLiveExchangeRates(baseCurrency: string = 'PKR'): Promise<{
  success: boolean;
  rates: Record<string, number>;
  timestamp: string;
  source: string;
  error?: string;
}> {
  const base = baseCurrency.toUpperCase();
  
  // Endpoint 1: open.er-api.com (reliable, no key required, CORS enabled)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.result === 'success' && data.rates) {
        // data.rates gives how many units of target currency 1 base currency buys (e.g. 1 PKR = 0.00359 USD)
        // For our system, rate is: 1 unit of foreign currency = X units of base currency (e.g. 1 USD = 278.5 PKR)
        // So foreignRateInBase = 1 / data.rates[foreignCode]
        const computedRates: Record<string, number> = {};
        for (const [code, rateAgainstBase] of Object.entries<number>(data.rates)) {
          if (code === base) {
            computedRates[code] = 1.0;
          } else if (rateAgainstBase > 0) {
            computedRates[code] = Number((1 / rateAgainstBase).toFixed(4));
          }
        }
        return {
          success: true,
          rates: computedRates,
          timestamp: new Date().toISOString(),
          source: 'Open Exchange Rates (Live)',
        };
      }
    }
  } catch (err: any) {
    console.warn('First exchange rate provider failed or timed out, trying fallback...', err?.message);
  }

  // Endpoint 2: Fallback to exchangerate-api.com
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        const computedRates: Record<string, number> = {};
        for (const [code, rateAgainstBase] of Object.entries<number>(data.rates)) {
          if (code === base) {
            computedRates[code] = 1.0;
          } else if (rateAgainstBase > 0) {
            computedRates[code] = Number((1 / rateAgainstBase).toFixed(4));
          }
        }
        return {
          success: true,
          rates: computedRates,
          timestamp: new Date().toISOString(),
          source: 'ExchangeRate-API (Fallback)',
        };
      }
    }
  } catch (err: any) {
    console.warn('Fallback exchange rate provider also failed', err?.message);
  }

  return {
    success: false,
    rates: {},
    timestamp: new Date().toISOString(),
    source: 'Offline Fallback',
    error: 'Could not connect to live exchange rate service. Check your internet connection.',
  };
}

/**
 * Update currency list with live rates while preserving manual overrides
 */
export async function syncCurrencyRatesWithLive(
  currentConfig: MultiCurrencySettings,
  forceUpdateAll: boolean = false
): Promise<{
  updatedConfig: MultiCurrencySettings;
  success: boolean;
  message: string;
}> {
  const baseCode = currentConfig.baseCurrency || 'PKR';
  const liveResult = await fetchLiveExchangeRates(baseCode);

  if (!liveResult.success || !liveResult.rates || Object.keys(liveResult.rates).length === 0) {
    return {
      updatedConfig: currentConfig,
      success: false,
      message: liveResult.error || 'Failed to fetch live rates from FX server.',
    };
  }

  const liveRates = liveResult.rates;
  let updatedCount = 0;

  const updatedCurrencies = currentConfig.currencies.map((curr) => {
    if (curr.code === baseCode) {
      return {
        ...curr,
        isBase: true,
        rate: 1.0,
        manualOverride: false,
        lastUpdated: liveResult.timestamp,
      };
    }

    // If manual override is enabled and not forcing all, preserve custom user rate
    if (curr.manualOverride && !forceUpdateAll) {
      return curr;
    }

    const liveRate = liveRates[curr.code];
    if (liveRate && liveRate > 0) {
      updatedCount++;
      return {
        ...curr,
        isBase: false,
        rate: liveRate,
        manualOverride: false,
        lastUpdated: liveResult.timestamp,
      };
    }

    return curr;
  });

  const updatedConfig: MultiCurrencySettings = {
    ...currentConfig,
    lastSynced: liveResult.timestamp,
    currencies: updatedCurrencies,
  };

  saveMultiCurrencySettings(updatedConfig);

  return {
    updatedConfig,
    success: true,
    message: `Updated ${updatedCount} currency rates live against ${baseCode} (${liveResult.source}).`,
  };
}

/**
 * Convert an amount between two currencies based on configuration
 */
export function convertCurrency(
  amount: number,
  fromCode: string,
  toCode: string,
  config?: MultiCurrencySettings
): {
  convertedAmount: number;
  rate: number;
  fromCode: string;
  toCode: string;
} {
  if (isNaN(amount) || amount === 0 || fromCode === toCode) {
    return { convertedAmount: amount || 0, rate: 1, fromCode, toCode };
  }

  const activeConfig = config || getMultiCurrencySettings();
  const currencies = activeConfig.currencies;

  const fromCurr = currencies.find((c) => c.code.toUpperCase() === fromCode.toUpperCase());
  const toCurr = currencies.find((c) => c.code.toUpperCase() === toCode.toUpperCase());

  const fromRateInBase = fromCurr ? fromCurr.rate : 1.0;
  const toRateInBase = toCurr ? toCurr.rate : 1.0;

  // Amount in base = amount * fromRateInBase
  // Amount in toCurr = (amount * fromRateInBase) / toRateInBase
  const effectiveRate = toRateInBase > 0 ? fromRateInBase / toRateInBase : 1;
  const convertedAmount = amount * effectiveRate;

  return {
    convertedAmount: Number(convertedAmount.toFixed(2)),
    rate: Number(effectiveRate.toFixed(4)),
    fromCode,
    toCode,
  };
}

/**
 * Format currency with proper symbol and code
 */
export function formatWithCurrency(
  amount: number,
  currencyCode?: string,
  config?: MultiCurrencySettings
): string {
  const activeConfig = config || getMultiCurrencySettings();
  const code = (currencyCode || activeConfig.baseCurrency || 'PKR').toUpperCase();
  const curr = activeConfig.currencies.find((c) => c.code.toUpperCase() === code);
  const symbol = curr?.symbol || (code === 'PKR' ? 'Rs.' : code);

  const formattedNum = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

  return `${symbol} ${formattedNum}`;
}
