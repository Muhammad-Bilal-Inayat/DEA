import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { 
  Percent, 
  ShieldAlert, 
  Sliders, 
  CheckCircle2, 
  Calculator, 
  Edit3, 
  ArrowRight,
  TrendingUp,
  Sparkles,
  Lock,
  Unlock
} from 'lucide-react';

export const PricingMarginTab: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const pricing = settings.pricing || {
    defaultProfitMargin: 22,
    pricingMethod: 'Markup on Cost',
    belowCostAction: 'Warning',
    costIncreaseAlerts: true,
    costIncreaseThreshold: 5,
    allowManualMarginOverride: true,
    pricingMode: 'Hybrid',
  };

  // Sample simulation state
  const [simulationCost, setSimulationCost] = useState<number>(100);

  const handleUpdate = (key: string, value: any) => {
    updateSettings({
      pricing: {
        ...pricing,
        [key]: value,
      },
    });
  };

  const currentMargin = Number(pricing.defaultProfitMargin) || 0;
  const currentThreshold = Number(pricing.costIncreaseThreshold) || 5;

  // Calculate simulated retail price based on method
  const simCost = Number(simulationCost) || 0;
  const simulatedSellingPrice = pricing.pricingMethod === 'Gross Margin'
    ? (currentMargin >= 100 ? simCost * 2 : simCost / (1 - currentMargin / 100))
    : (simCost * (1 + currentMargin / 100));

  const simulatedProfit = Math.max(0, simulatedSellingPrice - simCost);

  const presets = [10, 15, 18, 20, 21, 22, 23, 25, 30, 35];
  const isCustomMargin = !presets.includes(currentMargin);

  const thresholdPresets = [2, 5, 10, 15, 20];
  const isCustomThreshold = !thresholdPresets.includes(currentThreshold);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 text-slate-800 dark:text-slate-100">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Percent className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Pricing & Margin Configuration
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure default profit margins, manual margin overrides, markup vs gross margin formulas, and below-cost rules.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-6">
        
        {/* ================= 1. Default & Manual Profit Margin ================= */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span>Default Profit Margin (%)</span>
                {isCustomMargin ? (
                  <span className="text-[10px] uppercase tracking-wider font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-700">
                    Manual Custom Value: {currentMargin}%
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider font-extrabold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-md">
                    Preset: {currentMargin}%
                  </span>
                )}
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set the default profit margin percentage. You can choose from presets or manually enter any custom value.
              </p>
            </div>
          </div>

          {/* Manual Input + Stepper Controls */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="w-full sm:w-auto flex items-center gap-2">
                <div className="relative flex-1 sm:w-48">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-slate-400">
                    Margin:
                  </span>
                  <input
                    id="manual-margin-input"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1000"
                    value={pricing.defaultProfitMargin ?? 22}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      handleUpdate('defaultProfitMargin', isNaN(val) ? 0 : val);
                    }}
                    placeholder="Enter manual %"
                    className="w-full pl-18 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-black font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-bold text-slate-500">
                    %
                  </span>
                </div>

                {/* Steppers */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleUpdate('defaultProfitMargin', Math.max(0, parseFloat((currentMargin - 1).toFixed(1))))}
                    className="px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                    title="Decrease by 1%"
                  >
                    -1%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdate('defaultProfitMargin', parseFloat((currentMargin + 1).toFixed(1)))}
                    className="px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                    title="Increase by 1%"
                  >
                    +1%
                  </button>
                </div>
              </div>

              <span className="text-xs text-slate-500 dark:text-slate-400">
                You can manually type any percentage (e.g. 12.5%, 22%, 35%) or select a preset below:
              </span>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mr-1">
                Quick Presets:
              </span>
              {presets.map((margin) => (
                <button
                  key={margin}
                  type="button"
                  onClick={() => handleUpdate('defaultProfitMargin', margin)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    currentMargin === margin
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {margin}%
                </button>
              ))}
            </div>
          </div>

          {/* Live Simulator Preview */}
          <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200">
                    Live Calculation Simulator ({pricing.pricingMethod})
                  </h4>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300">
                    See how your manual margin applies to actual item costs
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-900 dark:text-blue-300 font-medium">Test Cost: Rs</span>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={simulationCost}
                  onChange={(e) => setSimulationCost(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-md text-xs font-mono font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-blue-200/60 dark:border-blue-900/60 text-xs">
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-blue-100 dark:border-slate-800">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Purchase Cost</div>
                <div className="text-sm font-black font-mono text-slate-800 dark:text-white">Rs {simCost.toFixed(2)}</div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-blue-100 dark:border-slate-800">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Configured Margin</div>
                <div className="text-sm font-black font-mono text-blue-600 dark:text-blue-400">+{currentMargin}%</div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-blue-100 dark:border-slate-800">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Selling Price</div>
                <div className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">Rs {simulatedSellingPrice.toFixed(2)}</div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-blue-100 dark:border-slate-800">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Unit Profit</div>
                <div className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-300">Rs {simulatedProfit.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-slate-100 dark:border-slate-800" />

        {/* ================= 2. Manual Pricing & Margin Mode ================= */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 dark:text-white">
              Pricing Automation & Manual Override Mode
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Control whether selling prices are strictly automated from the margin formula or allow flexible manual customization.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Hybrid Mode */}
            <div
              onClick={() => {
                handleUpdate('pricingMode', 'Hybrid');
                handleUpdate('allowManualMarginOverride', true);
              }}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                pricing.pricingMode === 'Hybrid' || !pricing.pricingMode
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 ring-1 ring-blue-600 dark:ring-blue-500'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Hybrid (Recommended)
                </span>
                {(pricing.pricingMode === 'Hybrid' || !pricing.pricingMode) && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Calculates suggested retail prices using margin formula, but allows full manual edit of prices on items and invoices.
              </p>
            </div>

            {/* Manual / Custom Mode */}
            <div
              onClick={() => {
                handleUpdate('pricingMode', 'Manual / Custom');
                handleUpdate('allowManualMarginOverride', true);
              }}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                pricing.pricingMode === 'Manual / Custom'
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 ring-1 ring-blue-600 dark:ring-blue-500'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  Manual Entry Mode
                </span>
                {pricing.pricingMode === 'Manual / Custom' && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Selling prices and margins are manually entered directly without forced automatic calculation.
              </p>
            </div>

            {/* Automatic Margin Mode */}
            <div
              onClick={() => {
                handleUpdate('pricingMode', 'Automatic Margin');
                handleUpdate('allowManualMarginOverride', false);
              }}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                pricing.pricingMode === 'Automatic Margin'
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 ring-1 ring-blue-600 dark:ring-blue-500'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  Strict Auto Margin
                </span>
                {pricing.pricingMode === 'Automatic Margin' && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Strictly applies the configured profit margin percentage to purchase costs automatically.
              </p>
            </div>
          </div>

          {/* Toggle for Manual Override */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                <Unlock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-white block">
                  Allow Manual Price & Margin Override on Products & Billing
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Allow staff to manually adjust selling prices and item margins on medicine inventory and POS invoices.
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input
                type="checkbox"
                checked={pricing.allowManualMarginOverride ?? true}
                onChange={(e) => handleUpdate('allowManualMarginOverride', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <hr className="border-slate-100 dark:border-slate-800" />

        {/* ================= 3. Pricing Method ================= */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-800 dark:text-white">
            Pricing Calculation Method
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choose whether recommended sale prices use Markup on Cost or True Gross Margin.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => handleUpdate('pricingMethod', 'Markup on Cost')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                pricing.pricingMethod === 'Markup on Cost'
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-600 ring-1 ring-blue-600 dark:border-blue-500'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900 dark:text-white text-sm">Markup on Cost</span>
                {pricing.pricingMethod === 'Markup on Cost' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formula: Cost × (1 + Margin%)<br />
                Example: Rs 100 + {currentMargin}% = Rs {(100 * (1 + currentMargin / 100)).toFixed(2)}
              </p>
            </div>

            <div
              onClick={() => handleUpdate('pricingMethod', 'Gross Margin')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                pricing.pricingMethod === 'Gross Margin'
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-600 ring-1 ring-blue-600 dark:border-blue-500'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900 dark:text-white text-sm">True Gross Margin</span>
                {pricing.pricingMethod === 'Gross Margin' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formula: Cost / (1 - Margin%)<br />
                Example: Rs 100 / (1 - {(currentMargin / 100).toFixed(2)}) = Rs {currentMargin >= 100 ? 'N/A' : (100 / (1 - currentMargin / 100)).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <hr className="border-slate-100 dark:border-slate-800" />

        {/* ================= 4. Below-Cost Sale Action ================= */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-800 dark:text-white">
            Below-Cost Sale Enforcement
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Determine system behavior when a selling price is lower than the weighted average cost.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => handleUpdate('belowCostAction', 'Warning')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                pricing.belowCostAction === 'Warning'
                  ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 ring-1 ring-amber-500'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900 dark:text-white text-sm">Warning Only (Recommended)</span>
                {pricing.belowCostAction === 'Warning' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Display a strong warning dialog showing estimated loss per unit, but allow the user to continue if authorized.
              </p>
            </div>

            <div
              onClick={() => handleUpdate('belowCostAction', 'Block')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                pricing.belowCostAction === 'Block'
                  ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-600 ring-1 ring-rose-600'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900 dark:text-white text-sm">Strictly Block Sale</span>
                {pricing.belowCostAction === 'Block' && <CheckCircle2 className="w-4 h-4 text-rose-600" />}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prevent sale completion entirely until selling prices are corrected above cost.
              </p>
            </div>
          </div>
        </div>

        <hr className="border-slate-100 dark:border-slate-800" />

        {/* ================= 5. Cost Increase Alerts & Manual Threshold ================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-bold text-slate-800 dark:text-white block">
                Purchase Cost Fluctuation Alerts
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detect and alert when new purchase prices increase or decrease compared to history.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pricing.costIncreaseAlerts}
                onChange={(e) => handleUpdate('costIncreaseAlerts', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {pricing.costIncreaseAlerts && (
            <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Cost Increase Alert Threshold (%)
                </label>
                {isCustomThreshold && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-md">
                    Custom Threshold: {currentThreshold}%
                  </span>
                )}
              </div>

              {/* Manual Threshold Input + Presets */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-36">
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="100"
                    value={pricing.costIncreaseThreshold ?? 5}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      handleUpdate('costIncreaseThreshold', isNaN(val) ? 0 : val);
                    }}
                    className="w-full pl-3 pr-7 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold font-mono text-slate-900 dark:text-white"
                  />
                  <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-xs font-bold text-slate-500">
                    %
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {thresholdPresets.map((th) => (
                    <button
                      key={th}
                      type="button"
                      onClick={() => handleUpdate('costIncreaseThreshold', th)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        currentThreshold === th
                          ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {th}%
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Triggers notices, warnings, or strong purchase alerts when unit purchase price fluctuates beyond this threshold.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
