import React, { useState, useEffect } from 'react';
import { 
  Coins, RefreshCw, Plus, Check, Edit3, RotateCcw, 
  ArrowRightLeft, Search, CheckCircle2, AlertCircle, 
  Globe, Sparkles, SlidersHorizontal, Trash2, ArrowUpRight
} from 'lucide-react';
import { ExchangeRateItem, MultiCurrencySettings } from '../../types';
import { 
  getMultiCurrencySettings, 
  saveMultiCurrencySettings, 
  syncCurrencyRatesWithLive, 
  convertCurrency,
  DEFAULT_CURRENCIES
} from '../../lib/currencyManager';

interface MultiCurrencySectionProps {
  onSettingsChange?: (settings: MultiCurrencySettings) => void;
  compact?: boolean;
}

export const MultiCurrencySection: React.FC<MultiCurrencySectionProps> = ({ 
  onSettingsChange,
  compact = false 
}) => {
  const [currencyConfig, setCurrencyConfig] = useState<MultiCurrencySettings>(getMultiCurrencySettings());
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });

  // Custom rate editing state
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editRateValue, setEditRateValue] = useState<string>('');

  // Add Currency Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCurrencyForm, setNewCurrencyForm] = useState({
    code: '',
    name: '',
    symbol: '',
    rate: '',
    flag: '🌐',
  });

  // Converter Calculator state
  const [calcAmount, setCalcAmount] = useState<number>(100);
  const [calcFrom, setCalcFrom] = useState<string>('USD');
  const [calcTo, setCalcTo] = useState<string>('PKR');

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) {
        setCurrencyConfig(e.detail);
      }
    };
    window.addEventListener('multi-currency-updated', handleUpdate);
    return () => window.removeEventListener('multi-currency-updated', handleUpdate);
  }, []);

  const updateConfig = (newConfig: MultiCurrencySettings) => {
    setCurrencyConfig(newConfig);
    saveMultiCurrencySettings(newConfig);
    if (onSettingsChange) {
      onSettingsChange(newConfig);
    }
  };

  // Trigger Auto live sync
  const handleAutoSync = async (forceAll: boolean = false) => {
    setIsSyncing(true);
    setSyncStatus({ type: null, message: '' });
    try {
      const result = await syncCurrencyRatesWithLive(currencyConfig, forceAll);
      if (result.success) {
        updateConfig(result.updatedConfig);
        setSyncStatus({ type: 'success', message: result.message });
      } else {
        setSyncStatus({ type: 'error', message: result.message });
      }
    } catch (err: any) {
      setSyncStatus({ 
        type: 'error', 
        message: 'Network error while contacting exchange rate server.' 
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        setSyncStatus({ type: null, message: '' });
      }, 5000);
    }
  };

  // Change Base Currency
  const handleBaseCurrencyChange = (newBaseCode: string) => {
    if (newBaseCode === currencyConfig.baseCurrency) return;

    // Convert all rates relative to the new base
    const oldBase = currencyConfig.baseCurrency;
    const newBaseCurr = currencyConfig.currencies.find(c => c.code === newBaseCode);
    const newBaseRateInOldBase = newBaseCurr ? newBaseCurr.rate : 1.0;

    const updatedCurrencies = currencyConfig.currencies.map(curr => {
      if (curr.code === newBaseCode) {
        return { ...curr, isBase: true, rate: 1.0, isEnabled: true };
      }
      // 1 unit of curr in newBase = (curr.rate in oldBase) / newBaseRateInOldBase
      const convertedRate = newBaseRateInOldBase > 0 
        ? Number((curr.rate / newBaseRateInOldBase).toFixed(4))
        : 1.0;
      return {
        ...curr,
        isBase: false,
        rate: convertedRate,
      };
    });

    const updated: MultiCurrencySettings = {
      ...currencyConfig,
      baseCurrency: newBaseCode,
      currencies: updatedCurrencies,
    };
    updateConfig(updated);
    setCalcTo(newBaseCode);
  };

  // Toggle Currency Active Status
  const handleToggleCurrency = (code: string) => {
    if (code === currencyConfig.baseCurrency) return; // Base cannot be disabled
    const updated = {
      ...currencyConfig,
      currencies: currencyConfig.currencies.map(c => 
        c.code === code ? { ...c, isEnabled: !c.isEnabled } : c
      ),
    };
    updateConfig(updated);
  };

  // Save manual rate edit
  const handleSaveManualRate = (code: string) => {
    const val = parseFloat(editRateValue);
    if (isNaN(val) || val <= 0) {
      alert('Please enter a valid positive exchange rate.');
      return;
    }

    const updated = {
      ...currencyConfig,
      currencies: currencyConfig.currencies.map(c => {
        if (c.code === code) {
          return {
            ...c,
            rate: val,
            manualOverride: true,
            lastUpdated: new Date().toISOString(),
          };
        }
        return c;
      }),
    };

    updateConfig(updated);
    setEditingCode(null);
    setEditRateValue('');
  };

  // Reset rate to live market rate
  const handleResetToAuto = async (code: string) => {
    const updated = {
      ...currencyConfig,
      currencies: currencyConfig.currencies.map(c => 
        c.code === code ? { ...c, manualOverride: false } : c
      ),
    };
    updateConfig(updated);
    // Sync live rate for this
    await handleAutoSync(false);
  };

  // Add new custom currency
  const handleAddCustomCurrency = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCurrencyForm.code.trim().toUpperCase();
    const name = newCurrencyForm.name.trim();
    const symbol = newCurrencyForm.symbol.trim() || code;
    const rate = parseFloat(newCurrencyForm.rate);

    if (!code || code.length < 2) {
      alert('Please enter a valid 3-letter currency code (e.g. KWD, NZD)');
      return;
    }
    if (!name) {
      alert('Please enter a currency name.');
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      alert('Please enter a valid positive exchange rate.');
      return;
    }

    // Check if already exists
    if (currencyConfig.currencies.some(c => c.code === code)) {
      alert(`Currency with code ${code} already exists.`);
      return;
    }

    const newCurr: ExchangeRateItem = {
      code,
      name,
      symbol,
      rate,
      flag: newCurrencyForm.flag || '🌐',
      isBase: false,
      isEnabled: true,
      manualOverride: true,
      lastUpdated: new Date().toISOString(),
    };

    const updated = {
      ...currencyConfig,
      currencies: [...currencyConfig.currencies, newCurr],
    };

    updateConfig(updated);
    setIsAddModalOpen(false);
    setNewCurrencyForm({ code: '', name: '', symbol: '', rate: '', flag: '🌐' });
  };

  // Delete currency
  const handleDeleteCurrency = (code: string) => {
    if (code === currencyConfig.baseCurrency) return;
    if (confirm(`Remove currency ${code} from your list?`)) {
      const updated = {
        ...currencyConfig,
        currencies: currencyConfig.currencies.filter(c => c.code !== code),
      };
      updateConfig(updated);
    }
  };

  const filteredCurrencies = currencyConfig.currencies.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const baseCurrencyItem = currencyConfig.currencies.find(c => c.code === currencyConfig.baseCurrency) || currencyConfig.currencies[0];

  // Live conversion result for test calculator
  const conversionResult = convertCurrency(calcAmount, calcFrom, calcTo, currencyConfig);

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Base Currency & Auto-Sync Controls */}
      <div className="bg-gradient-to-r from-blue-900/90 to-indigo-900/90 text-white p-4 sm:p-5 rounded-xl border border-blue-700/50 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">Multi-Currency & Exchange Rates</h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                  Auto & Manual
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Manage base operational currency, auto-fetch live market rates, or set custom manual rates.
              </p>
            </div>
          </div>

          {/* Action Buttons: Auto Sync & Add Currency */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleAutoSync(false)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
              title="Fetch live rates from international market against base currency"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Fetching Rates...' : 'Auto-Sync Live Rates'}
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Currency
            </button>
          </div>
        </div>

        {/* Sync Status Alert */}
        {syncStatus.type && (
          <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
            syncStatus.type === 'success' 
              ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-200' 
              : 'bg-rose-950/70 border border-rose-500/50 text-rose-200'
          }`}>
            {syncStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{syncStatus.message}</span>
          </div>
        )}

        {/* Secondary controls strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-blue-800/60">
          {/* Base Currency Selection */}
          <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] text-blue-200 block uppercase font-bold tracking-wider">Company Base Currency</span>
              <span className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                <span>{baseCurrencyItem.flag}</span>
                <span>{baseCurrencyItem.code} ({baseCurrencyItem.symbol})</span>
              </span>
            </div>
            <select
              value={currencyConfig.baseCurrency}
              onChange={(e) => handleBaseCurrencyChange(e.target.value)}
              className="bg-slate-900/90 text-white border border-blue-400/40 rounded-md px-2 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              {currencyConfig.currencies.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} - {c.symbol}
                </option>
              ))}
            </select>
          </div>

          {/* Auto Update Setting */}
          <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] text-blue-200 block uppercase font-bold tracking-wider">Auto-Sync FX System</span>
              <span className="text-xs text-white font-medium">
                {currencyConfig.autoUpdate ? 'Automatic Daily Sync' : 'Manual Update Mode'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => updateConfig({ ...currencyConfig, autoUpdate: !currencyConfig.autoUpdate })}
              className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                currencyConfig.autoUpdate ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                currencyConfig.autoUpdate ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Last Synced Indicator */}
          <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] text-blue-200 block uppercase font-bold tracking-wider">Exchange Rate Timestamp</span>
              <span className="text-xs text-white font-medium">
                {currencyConfig.lastSynced 
                  ? new Date(currencyConfig.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
                  : 'Live Default Rates'}
              </span>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="System online" />
          </div>
        </div>
      </div>

      {/* Quick Test Converter Widget */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <ArrowRightLeft className="w-4 h-4 text-blue-600" />
            <span>Interactive Multi-Currency Rate Tester</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Calculated with your configured rates
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Amount Input */}
          <div className="sm:col-span-3">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount</label>
            <input 
              type="number" 
              min="0"
              step="any"
              value={calcAmount || ''}
              onChange={(e) => setCalcAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="100"
            />
          </div>

          {/* From Currency */}
          <div className="sm:col-span-3">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">From Currency</label>
            <select
              value={calcFrom}
              onChange={(e) => setCalcFrom(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {currencyConfig.currencies.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Swap Indicator */}
          <div className="sm:col-span-1 flex justify-center pt-4">
            <button
              type="button"
              onClick={() => {
                const prevFrom = calcFrom;
                setCalcFrom(calcTo);
                setCalcTo(prevFrom);
              }}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shadow-sm"
              title="Swap currencies"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* To Currency */}
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">To Currency</label>
            <select
              value={calcTo}
              onChange={(e) => setCalcTo(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {currencyConfig.currencies.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Result Output */}
          <div className="sm:col-span-3 bg-blue-50/80 border border-blue-200 p-2.5 rounded-lg">
            <span className="block text-[10px] font-bold text-blue-700 uppercase">Converted Value</span>
            <div className="text-sm sm:text-base font-black text-blue-900 truncate">
              {calcTo} {conversionResult.convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-blue-600 block mt-0.5">
              1 {calcFrom} = {conversionResult.rate.toLocaleString('en-US', { maximumFractionDigits: 4 })} {calcTo}
            </span>
          </div>
        </div>
      </div>

      {/* Currency Table & Search */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search currency (USD, AED, Euro)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Auto Live Rate
            </span>
            <span className="flex items-center gap-1 ml-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Custom Manual Rate
            </span>
          </div>
        </div>

        {/* Currencies Grid/Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Currency</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Exchange Rate (vs {currencyConfig.baseCurrency})</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions / Manual Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCurrencies.map((curr) => {
                  const isBase = curr.code === currencyConfig.baseCurrency;
                  const isEditing = editingCode === curr.code;

                  return (
                    <tr 
                      key={curr.code}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isBase ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Currency Info */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{curr.flag || '🌐'}</span>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{curr.code}</span>
                              {isBase && (
                                <span className="px-1.5 py-0.2 text-[9px] font-black bg-blue-600 text-white rounded">
                                  BASE
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">{curr.name}</span>
                          </div>
                        </div>
                      </td>

                      {/* Symbol */}
                      <td className="py-3 px-3 font-bold text-slate-700">
                        <span className="px-2 py-0.5 bg-slate-100 rounded font-mono text-slate-800">
                          {curr.symbol}
                        </span>
                      </td>

                      {/* Exchange Rate */}
                      <td className="py-3 px-3">
                        {isBase ? (
                          <span className="font-bold text-slate-500">1.0000 (Base)</span>
                        ) : isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-500">1 {curr.code} =</span>
                            <input 
                              type="number"
                              step="any"
                              value={editRateValue}
                              onChange={(e) => setEditRateValue(e.target.value)}
                              placeholder={curr.rate.toString()}
                              className="w-24 px-2 py-1 bg-white border-2 border-blue-500 rounded text-xs font-bold text-slate-900 focus:outline-none"
                              autoFocus
                            />
                            <span className="text-[11px] text-slate-500">{currencyConfig.baseCurrency}</span>
                            <button
                              type="button"
                              onClick={() => handleSaveManualRate(curr.code)}
                              className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                              title="Save manual rate"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCode(null);
                                setEditRateValue('');
                              }}
                              className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors"
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-sm">
                              {curr.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {currencyConfig.baseCurrency} / 1 {curr.code}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Mode (Auto vs Manual) */}
                      <td className="py-3 px-3">
                        {isBase ? (
                          <span className="text-slate-400 text-[11px]">Primary</span>
                        ) : curr.manualOverride ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            ✏️ Manual Rate
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ⚡ Live Market
                          </span>
                        )}
                      </td>

                      {/* Active Status Toggle */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          disabled={isBase}
                          onClick={() => handleToggleCurrency(curr.code)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                            curr.isEnabled !== false 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-slate-100 text-slate-400'
                          } ${isBase ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80'}`}
                        >
                          {curr.isEnabled !== false ? 'Active' : 'Disabled'}
                        </button>
                      </td>

                      {/* Actions / Rate Editor */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isBase && !isEditing && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCode(curr.code);
                                  setEditRateValue(curr.rate.toString());
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors"
                                title="Set manual custom exchange rate"
                              >
                                <Edit3 className="w-3 h-3 text-blue-600" />
                                <span>Edit Rate</span>
                              </button>

                              {curr.manualOverride && (
                                <button
                                  type="button"
                                  onClick={() => handleResetToAuto(curr.code)}
                                  className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100"
                                  title="Reset to live market rate"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {!DEFAULT_CURRENCIES.some(d => d.code === curr.code) && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCurrency(curr.code)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                                  title="Remove custom currency"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Custom Currency Dialog */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-bold">Add Custom Currency</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomCurrency} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Currency Code <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. KWD, NZD, CHF"
                    value={newCurrencyForm.code}
                    onChange={(e) => setNewCurrencyForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Flag / Icon
                  </label>
                  <input 
                    type="text" 
                    placeholder="🇰🇼 or 🌐"
                    value={newCurrencyForm.flag}
                    onChange={(e) => setNewCurrencyForm(prev => ({ ...prev, flag: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Currency Full Name <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Kuwaiti Dinar, New Zealand Dollar"
                  value={newCurrencyForm.name}
                  onChange={(e) => setNewCurrencyForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Symbol
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. KD, NZ$, Fr."
                    value={newCurrencyForm.symbol}
                    onChange={(e) => setNewCurrencyForm(prev => ({ ...prev, symbol: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Exchange Rate ({currencyConfig.baseCurrency}) <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    step="any"
                    required
                    placeholder="e.g. 910.50"
                    value={newCurrencyForm.rate}
                    onChange={(e) => setNewCurrencyForm(prev => ({ ...prev, rate: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg text-[11px] text-blue-800 border border-blue-200">
                1 unit of your new currency will equal {newCurrencyForm.rate || 'X'} {currencyConfig.baseCurrency}.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                >
                  Save Currency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
