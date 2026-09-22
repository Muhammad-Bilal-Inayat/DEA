import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Delete, CornerDownLeft, Sparkles, Percent, 
  RotateCcw, History, Calculator as CalcIcon, 
  Layers, Zap, Cpu, Check
} from 'lucide-react';

export type CalculatorType = 'simple' | 'medium' | 'advanced' | 'modern';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertValue?: (val: number) => void;
}

const STORAGE_KEY = 'mbi_calculator_type_pref_v1';

export const CalculatorModal: React.FC<CalculatorModalProps> = ({
  isOpen,
  onClose,
  onInsertValue
}) => {
  // Calculator Type state (default: 'simple')
  const [calcType, setCalcType] = useState<CalculatorType>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'simple' || saved === 'medium' || saved === 'advanced' || saved === 'modern') {
        return saved;
      }
    } catch {}
    return 'simple';
  });

  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [memory, setMemory] = useState<number>(0);
  const [grandTotal, setGrandTotal] = useState<number>(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isRad, setIsRad] = useState(true);

  // Focus container for keyboard support
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      try {
        localStorage.setItem(STORAGE_KEY, calcType);
      } catch {}
    }
  }, [calcType, isOpen]);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e || !e.key) return;
      // Ignore if user is typing inside an external input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        handleDigit('.');
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        e.preventDefault();
        handleOperator(e.key);
      } else if (e.key === '%') {
        e.preventDefault();
        handlePercentage();
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleCalculate();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, display, equation]);

  if (!isOpen) return null;

  // SAFE CALCULATION ENGINE (Guards against white screen / crashes)
  const safeEvaluate = (expr: string): number => {
    try {
      if (!expr || typeof expr !== 'string') return 0;
      // Sanitize expression
      let clean = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/π/g, Math.PI.toString())
        .replace(/e/g, Math.E.toString());

      // Only allow safe math tokens
      clean = clean.replace(/[^0-9+\-*/().^eE\s]/g, '');
      if (!clean.trim()) return 0;

      // Handle power operator ^
      clean = clean.replace(/(\d+(\.\d+)?)\^(\d+(\.\d+)?)/g, 'Math.pow($1,$3)');

      // eslint-disable-next-line no-eval
      const res = Function(`'use strict'; return (${clean})`)();
      if (!Number.isFinite(res)) {
        throw new Error('Invalid calculation');
      }
      return res;
    } catch {
      return NaN;
    }
  };

  const handleDigit = (digit: string) => {
    if (display === 'Error' || display === "Can't divide by 0") {
      setDisplay(digit === '.' ? '0.' : digit);
      return;
    }
    if (display === '0' && digit !== '.') {
      setDisplay(digit);
    } else if (digit === '.' && display.includes('.')) {
      return;
    } else {
      setDisplay(display + digit);
    }
  };

  const handleOperator = (op: string) => {
    if (display === 'Error') {
      setDisplay('0');
      return;
    }
    const symbol = op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : '+';
    setEquation(`${display} ${symbol} `);
    setDisplay('0');
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
  };

  const handleClearEntry = () => {
    setDisplay('0');
  };

  const handleDelete = () => {
    if (display === 'Error' || display.length <= 1) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const handleToggleSign = () => {
    const num = parseFloat(display);
    if (!isNaN(num)) {
      setDisplay((num * -1).toString());
    }
  };

  // Percentage Handler: Supports both inline relative percentage (e.g. 1000 - 10% = 900) and standalone percentage (50% = 0.5)
  const handlePercentage = () => {
    const current = parseFloat(display);
    if (isNaN(current)) return;

    if (equation) {
      // Find base number in equation (e.g. "500 + ")
      const match = equation.match(/([0-9.]+)\s*([+\-×÷])\s*$/);
      if (match) {
        const base = parseFloat(match[1]);
        const op = match[2];
        if (!isNaN(base)) {
          let percentValue = (base * current) / 100;
          if (op === '×' || op === '÷') {
            percentValue = current / 100;
          }
          setDisplay(parseFloat(percentValue.toFixed(6)).toString());
          return;
        }
      }
    }

    // Standalone percentage: divide by 100
    const standalone = current / 100;
    setDisplay(parseFloat(standalone.toFixed(6)).toString());
  };

  const handleCalculate = () => {
    if (!equation && display !== 'Error') return;
    try {
      const fullExpr = equation + display;
      const res = safeEvaluate(fullExpr);

      if (isNaN(res) || !Number.isFinite(res)) {
        setDisplay('Error');
        return;
      }

      const formatted = parseFloat(res.toFixed(6)).toString();
      setHistory(prev => [`${fullExpr} = ${formatted}`, ...prev.slice(0, 19)]);
      setGrandTotal(prev => prev + res);
      setDisplay(formatted);
      setEquation('');
    } catch {
      setDisplay('Error');
    }
  };

  // Quick Commercial Tax / Margin Helpers
  const handleApplyTax = (percent: number) => {
    const val = parseFloat(display);
    if (isNaN(val)) return;
    const taxAmt = (val * percent) / 100;
    const total = val + taxAmt;
    const formatted = parseFloat(total.toFixed(4)).toString();
    setHistory(prev => [`${val} + ${percent}% TAX = ${formatted}`, ...prev.slice(0, 19)]);
    setDisplay(formatted);
  };

  const handleDeductTax = (percent: number) => {
    const val = parseFloat(display);
    if (isNaN(val)) return;
    // Reverse Tax: Base = Amount / (1 + Rate/100)
    const base = val / (1 + percent / 100);
    const formatted = parseFloat(base.toFixed(4)).toString();
    setHistory(prev => [`${val} - ${percent}% Tax Deduct = ${formatted}`, ...prev.slice(0, 19)]);
    setDisplay(formatted);
  };

  const handleApplyDiscount = (percent: number) => {
    const val = parseFloat(display);
    if (isNaN(val)) return;
    const discount = (val * percent) / 100;
    const total = val - discount;
    const formatted = parseFloat(total.toFixed(4)).toString();
    setHistory(prev => [`${val} - ${percent}% Disc = ${formatted}`, ...prev.slice(0, 19)]);
    setDisplay(formatted);
  };

  // Scientific Single-Operand Functions
  const handleScientificFunc = (func: string) => {
    const num = parseFloat(display);
    if (isNaN(num)) return;

    let result = 0;
    let label = `${func}(${num})`;

    switch (func) {
      case 'sqr':
        result = Math.pow(num, 2);
        label = `sqr(${num})`;
        break;
      case 'sqrt':
        if (num < 0) {
          setDisplay('Error');
          return;
        }
        result = Math.sqrt(num);
        label = `√(${num})`;
        break;
      case 'recip':
        if (num === 0) {
          setDisplay("Can't divide by 0");
          return;
        }
        result = 1 / num;
        label = `1/(${num})`;
        break;
      case 'sin':
        result = Math.sin(isRad ? num : (num * Math.PI) / 180);
        break;
      case 'cos':
        result = Math.cos(isRad ? num : (num * Math.PI) / 180);
        break;
      case 'tan':
        result = Math.tan(isRad ? num : (num * Math.PI) / 180);
        break;
      case 'log':
        if (num <= 0) {
          setDisplay('Error');
          return;
        }
        result = Math.log10(num);
        break;
      case 'ln':
        if (num <= 0) {
          setDisplay('Error');
          return;
        }
        result = Math.log(num);
        break;
      case 'fact':
        if (num < 0 || num > 170 || !Number.isInteger(num)) {
          setDisplay('Error');
          return;
        }
        result = 1;
        for (let i = 2; i <= num; i++) result *= i;
        label = `${num}!`;
        break;
      default:
        return;
    }

    const formatted = parseFloat(result.toFixed(6)).toString();
    setHistory(prev => [`${label} = ${formatted}`, ...prev.slice(0, 19)]);
    setDisplay(formatted);
  };

  const handleInsert = () => {
    const num = parseFloat(display);
    if (!isNaN(num) && onInsertValue) {
      onInsertValue(num);
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        ref={containerRef}
        className={`rounded-2xl shadow-2xl border transition-all duration-200 overflow-hidden flex flex-col ${
          calcType === 'modern'
            ? 'bg-slate-950 border-slate-800 text-white w-full max-w-[360px] shadow-blue-950/40'
            : calcType === 'advanced'
            ? 'bg-white border-slate-200 text-slate-900 w-full max-w-[420px]'
            : calcType === 'medium'
            ? 'bg-white border-slate-200 text-slate-900 w-full max-w-[360px]'
            : 'bg-white border-slate-200 text-slate-900 w-full max-w-[320px]'
        }`}
      >
        
        {/* TOP BAR / TITLE */}
        <div className={`flex items-center justify-between px-3.5 py-2.5 ${
          calcType === 'modern' ? 'bg-slate-900/90 border-b border-slate-800' : 'bg-slate-900 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <CalcIcon className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-xs tracking-wide">
              {calcType === 'simple' && 'Standard Calculator'}
              {calcType === 'medium' && 'Commercial & Tax Calculator'}
              {calcType === 'advanced' && 'Scientific Pro Calculator'}
              {calcType === 'modern' && 'Modern Glass Calculator'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {history.length > 0 && (
              <button
                onClick={() => setShowHistoryModal(!showHistoryModal)}
                title="Calculation History"
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <History className="w-3.5 h-3.5" />
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CALCULATOR TYPE SELECTOR MENU */}
        <div className={`grid grid-cols-4 p-1.5 gap-1 border-b text-[11px] font-bold ${
          calcType === 'modern' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setCalcType('simple')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
              calcType === 'simple'
                ? 'bg-blue-600 text-white shadow-xs'
                : calcType === 'modern'
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <span>Simple</span>
          </button>

          <button
            type="button"
            onClick={() => setCalcType('medium')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
              calcType === 'medium'
                ? 'bg-blue-600 text-white shadow-xs'
                : calcType === 'modern'
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <span>Medium</span>
          </button>

          <button
            type="button"
            onClick={() => setCalcType('advanced')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
              calcType === 'advanced'
                ? 'bg-blue-600 text-white shadow-xs'
                : calcType === 'modern'
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <span>Advanced</span>
          </button>

          <button
            type="button"
            onClick={() => setCalcType('modern')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
              calcType === 'modern'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Modern</span>
          </button>
        </div>

        {/* HISTORY TAPE OVERLAY (IF TOGGLED) */}
        {showHistoryModal && (
          <div className={`p-3 border-b max-h-36 overflow-y-auto space-y-1 text-xs font-mono ${
            calcType === 'modern' ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-amber-50 text-slate-800 border-amber-200'
          }`}>
            <div className="flex items-center justify-between text-[10px] font-sans font-bold uppercase tracking-wider text-slate-500 mb-1">
              <span>Calculation Tape ({history.length})</span>
              <button 
                onClick={() => setHistory([])} 
                className="text-rose-600 hover:underline"
              >
                Clear
              </button>
            </div>
            {history.map((h, i) => (
              <div 
                key={i} 
                onClick={() => {
                  const parts = h.split(' = ');
                  if (parts[1]) setDisplay(parts[1]);
                }}
                className="py-1 px-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex justify-between items-center"
              >
                <span>{h}</span>
              </div>
            ))}
          </div>
        )}

        {/* DISPLAY SCREEN */}
        <div className={`p-3.5 text-right border-b transition-colors ${
          calcType === 'modern'
            ? 'bg-slate-900/80 border-slate-800'
            : 'bg-slate-50 border-slate-200'
        }`}>
          {/* Equation Row */}
          <div className={`text-xs font-mono min-h-[16px] truncate ${
            calcType === 'modern' ? 'text-cyan-400/80' : 'text-slate-400'
          }`}>
            {equation || (history[0] ? history[0] : '\u00A0')}
          </div>

          {/* Value Display */}
          <div className={`text-2xl font-black font-mono tracking-tight truncate mt-0.5 ${
            calcType === 'modern' ? 'text-white' : 'text-slate-900'
          }`}>
            {display}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODE 1: SIMPLE CALCULATOR (DEFAULT)                                       */}
        {/* ========================================================================= */}
        {calcType === 'simple' && (
          <div className="p-3 grid grid-cols-4 gap-2 bg-white">
            <button
              onClick={handleClear}
              className="p-3 rounded-xl bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 transition-colors text-sm active:scale-95"
            >
              C
            </button>
            <button
              onClick={handleDelete}
              className="p-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors flex items-center justify-center active:scale-95"
            >
              <Delete className="w-4 h-4" />
            </button>
            <button
              onClick={handlePercentage}
              className="p-3 rounded-xl bg-blue-50 text-blue-700 font-black hover:bg-blue-100 transition-colors text-sm active:scale-95"
            >
              %
            </button>
            <button
              onClick={() => handleOperator('/')}
              className="p-3 rounded-xl bg-slate-100 text-blue-600 font-black hover:bg-blue-50 transition-colors text-sm active:scale-95"
            >
              ÷
            </button>

            {['7', '8', '9'].map(d => (
              <button
                key={d}
                onClick={() => handleDigit(d)}
                className="p-3 rounded-xl bg-slate-50 text-slate-800 font-bold hover:bg-slate-100 transition-colors text-sm active:scale-95"
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => handleOperator('*')}
              className="p-3 rounded-xl bg-slate-100 text-blue-600 font-black hover:bg-blue-50 transition-colors text-sm active:scale-95"
            >
              ×
            </button>

            {['4', '5', '6'].map(d => (
              <button
                key={d}
                onClick={() => handleDigit(d)}
                className="p-3 rounded-xl bg-slate-50 text-slate-800 font-bold hover:bg-slate-100 transition-colors text-sm active:scale-95"
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => handleOperator('-')}
              className="p-3 rounded-xl bg-slate-100 text-blue-600 font-black hover:bg-blue-50 transition-colors text-sm active:scale-95"
            >
              −
            </button>

            {['1', '2', '3'].map(d => (
              <button
                key={d}
                onClick={() => handleDigit(d)}
                className="p-3 rounded-xl bg-slate-50 text-slate-800 font-bold hover:bg-slate-100 transition-colors text-sm active:scale-95"
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => handleOperator('+')}
              className="p-3 rounded-xl bg-slate-100 text-blue-600 font-black hover:bg-blue-50 transition-colors text-sm active:scale-95"
            >
              +
            </button>

            <button
              onClick={handleToggleSign}
              className="p-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors text-xs active:scale-95"
            >
              ±
            </button>
            <button
              onClick={() => handleDigit('0')}
              className="p-3 rounded-xl bg-slate-50 text-slate-800 font-bold hover:bg-slate-100 transition-colors text-sm active:scale-95"
            >
              0
            </button>
            <button
              onClick={() => handleDigit('.')}
              className="p-3 rounded-xl bg-slate-50 text-slate-800 font-bold hover:bg-slate-100 transition-colors text-sm active:scale-95"
            >
              .
            </button>
            <button
              onClick={handleCalculate}
              className="p-3 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-colors flex items-center justify-center shadow-sm active:scale-95"
            >
              =
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: MEDIUM / COMMERCIAL & TAX CALCULATOR                              */}
        {/* ========================================================================= */}
        {calcType === 'medium' && (
          <div className="p-3 space-y-2 bg-white">
            {/* Quick Tax & Margin Presets */}
            <div className="grid grid-cols-5 gap-1 text-[10px] font-bold">
              <button
                onClick={() => handleApplyTax(5)}
                className="py-1 px-0.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
              >
                +5% Tax
              </button>
              <button
                onClick={() => handleApplyTax(10)}
                className="py-1 px-0.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
              >
                +10% Tax
              </button>
              <button
                onClick={() => handleApplyTax(18)}
                className="py-1 px-0.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-black"
              >
                +18% GST
              </button>
              <button
                onClick={() => handleApplyDiscount(5)}
                className="py-1 px-0.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
              >
                -5% Disc
              </button>
              <button
                onClick={() => handleApplyDiscount(10)}
                className="py-1 px-0.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
              >
                -10% Disc
              </button>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={handleClear}
                className="p-2.5 rounded-xl bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 text-xs"
              >
                C
              </button>
              <button
                onClick={handleClearEntry}
                className="p-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 text-xs"
              >
                CE
              </button>
              <button
                onClick={handlePercentage}
                className="p-2.5 rounded-xl bg-amber-50 text-amber-800 font-black hover:bg-amber-100 text-sm border border-amber-200"
              >
                %
              </button>
              <button
                onClick={handleDelete}
                className="p-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center"
              >
                <Delete className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleDeductTax(18)}
                className="p-2 rounded-xl bg-purple-50 text-purple-700 font-bold hover:bg-purple-100 text-[10px] border border-purple-200"
              >
                -18% Base
              </button>
              <button
                onClick={() => {
                  setDisplay(grandTotal.toString());
                }}
                className="p-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 text-[10px] border border-indigo-200"
              >
                GT ({parseFloat(grandTotal.toFixed(2))})
              </button>
              <button
                onClick={() => handleOperator('/')}
                className="p-2.5 rounded-xl bg-slate-100 text-blue-600 font-black hover:bg-blue-50 text-sm"
              >
                ÷
              </button>
              <button
                onClick={() => handleOperator('*')}
                className="p-2.5 rounded-xl bg-slate-100 text-blue-600 font-black hover:bg-blue-50 text-sm"
              >
                ×
              </button>

              {['7', '8', '9'].map(d => (
                <button
                  key={d}
                  onClick={() => handleDigit(d)}
                  className="p-2.5 rounded-xl bg-slate-50 text-slate-800 font-bold hover:bg-slate-100 text-sm"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => handleOperator('-')}
                className="p-2.5 rounded-xl bg-slate-100 text-blue-600 font-black hover:bg-blue-50 text-sm"
              >
                −
              </button>

              {['4', '5', '6'].map(d => (
                <button
                  key={d}
                  onClick={() => handleDigit(d)}
                  className="p-2.5 rounded-xl bg-slate-50 text-slate-800 font-bold hover:bg-slate-100 text-sm"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => handleOperator('+')}
                className="p-2.5 rounded-xl bg-slate-100 text-blue-600 font-black hover:bg-blue-50 text-sm"
              >
                +
              </button>

              {['1', '2', '3'].map(d => (
                <button
                  key={d}
                  onClick={() => handleDigit(d)}
                  className="p-2.5 rounded-xl bg-slate-50 text-slate-800 font-bold hover:bg-slate-100 text-sm"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={handleCalculate}
                className="row-span-2 p-2.5 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700 flex items-center justify-center shadow-sm text-base"
              >
                =
              </button>

              <button
                onClick={handleToggleSign}
                className="p-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 text-xs"
              >
                ±
              </button>
              <button
                onClick={() => handleDigit('0')}
                className="p-2.5 rounded-xl bg-slate-50 text-slate-800 font-bold hover:bg-slate-100 text-sm"
              >
                0
              </button>
              <button
                onClick={() => handleDigit('.')}
                className="p-2.5 rounded-xl bg-slate-50 text-slate-800 font-bold hover:bg-slate-100 text-sm"
              >
                .
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 3: ADVANCED / SCIENTIFIC CALCULATOR                                  */}
        {/* ========================================================================= */}
        {calcType === 'advanced' && (
          <div className="p-3 space-y-2 bg-white">
            {/* Memory & Rad/Deg Controls */}
            <div className="grid grid-cols-6 gap-1 text-[10px] font-bold">
              <button
                onClick={() => setIsRad(!isRad)}
                className="py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                {isRad ? 'RAD' : 'DEG'}
              </button>
              <button
                onClick={() => setMemory(0)}
                className="py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                MC
              </button>
              <button
                onClick={() => setDisplay(memory.toString())}
                className="py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                MR
              </button>
              <button
                onClick={() => setMemory(prev => prev + (parseFloat(display) || 0))}
                className="py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                M+
              </button>
              <button
                onClick={() => setMemory(prev => prev - (parseFloat(display) || 0))}
                className="py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                M-
              </button>
              <button
                onClick={() => setMemory(parseFloat(display) || 0)}
                className="py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                MS
              </button>
            </div>

            {/* Scientific Function Keypad */}
            <div className="grid grid-cols-5 gap-1.5 text-xs">
              <button onClick={() => handleScientificFunc('sqr')} className="p-2 rounded-lg bg-slate-100 font-medium hover:bg-slate-200">x²</button>
              <button onClick={() => handleScientificFunc('sqrt')} className="p-2 rounded-lg bg-slate-100 font-medium hover:bg-slate-200">√x</button>
              <button onClick={() => handleScientificFunc('recip')} className="p-2 rounded-lg bg-slate-100 font-medium hover:bg-slate-200">1/x</button>
              <button onClick={handlePercentage} className="p-2 rounded-lg bg-amber-50 text-amber-800 font-bold hover:bg-amber-100 border border-amber-200">%</button>
              <button onClick={handleClear} className="p-2 rounded-lg bg-rose-50 text-rose-600 font-bold hover:bg-rose-100">C</button>

              <button onClick={() => handleScientificFunc('sin')} className="p-2 rounded-lg bg-slate-100 font-medium hover:bg-slate-200">sin</button>
              <button onClick={() => handleScientificFunc('cos')} className="p-2 rounded-lg bg-slate-100 font-medium hover:bg-slate-200">cos</button>
              <button onClick={() => handleScientificFunc('tan')} className="p-2 rounded-lg bg-slate-100 font-medium hover:bg-slate-200">tan</button>
              <button onClick={() => setDisplay(Math.PI.toFixed(6))} className="p-2 rounded-lg bg-slate-100 font-mono hover:bg-slate-200">π</button>
              <button onClick={handleDelete} className="p-2 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200"><Delete className="w-3.5 h-3.5" /></button>

              <button onClick={() => handleScientificFunc('log')} className="p-2 rounded-lg bg-slate-100 font-medium hover:bg-slate-200">log</button>
              <button onClick={() => handleScientificFunc('ln')} className="p-2 rounded-lg bg-slate-100 font-medium hover:bg-slate-200">ln</button>
              <button onClick={() => handleScientificFunc('fact')} className="p-2 rounded-lg bg-slate-100 font-medium hover:bg-slate-200">n!</button>
              <button onClick={() => handleOperator('/')} className="p-2 rounded-lg bg-slate-100 text-blue-600 font-bold hover:bg-blue-50">÷</button>
              <button onClick={() => handleOperator('*')} className="p-2 rounded-lg bg-slate-100 text-blue-600 font-bold hover:bg-blue-50">×</button>

              {['7', '8', '9'].map(d => (
                <button key={d} onClick={() => handleDigit(d)} className="p-2 rounded-lg bg-slate-50 font-bold hover:bg-slate-100">{d}</button>
              ))}
              <button onClick={() => handleOperator('-')} className="p-2 rounded-lg bg-slate-100 text-blue-600 font-bold hover:bg-blue-50">−</button>
              <button onClick={() => handleOperator('+')} className="p-2 rounded-lg bg-slate-100 text-blue-600 font-bold hover:bg-blue-50">+</button>

              {['4', '5', '6'].map(d => (
                <button key={d} onClick={() => handleDigit(d)} className="p-2 rounded-lg bg-slate-50 font-bold hover:bg-slate-100">{d}</button>
              ))}
              <button onClick={() => handleDigit('(')} className="p-2 rounded-lg bg-slate-100 font-medium hover:bg-slate-200">(</button>
              <button onClick={() => handleDigit(')')} className="p-2 rounded-lg bg-slate-100 font-medium hover:bg-slate-200">)</button>

              {['1', '2', '3'].map(d => (
                <button key={d} onClick={() => handleDigit(d)} className="p-2 rounded-lg bg-slate-50 font-bold hover:bg-slate-100">{d}</button>
              ))}
              <button onClick={handleToggleSign} className="p-2 rounded-lg bg-slate-100 font-medium hover:bg-slate-200">±</button>
              <button onClick={handleCalculate} className="row-span-2 p-2 rounded-lg bg-blue-600 text-white font-black hover:bg-blue-700 flex items-center justify-center text-sm shadow-sm">=</button>

              <button onClick={() => handleDigit('0')} className="col-span-2 p-2 rounded-lg bg-slate-50 font-bold hover:bg-slate-100">0</button>
              <button onClick={() => handleDigit('.')} className="p-2 rounded-lg bg-slate-50 font-bold hover:bg-slate-100">.</button>
              <button onClick={() => setDisplay(Math.E.toFixed(6))} className="p-2 rounded-lg bg-slate-100 font-mono hover:bg-slate-200">e</button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 4: MODERN / DARK GLASS CALCULATOR                                    */}
        {/* ========================================================================= */}
        {calcType === 'modern' && (
          <div className="p-3.5 space-y-2.5 bg-slate-950">
            {/* Quick Discount & Tax Pills */}
            <div className="grid grid-cols-4 gap-1.5 text-[11px] font-bold">
              <button
                onClick={() => handleApplyDiscount(5)}
                className="py-1 px-1 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              >
                -5%
              </button>
              <button
                onClick={() => handleApplyDiscount(10)}
                className="py-1 px-1 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              >
                -10%
              </button>
              <button
                onClick={() => handleApplyDiscount(15)}
                className="py-1 px-1 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              >
                -15%
              </button>
              <button
                onClick={() => handleApplyTax(18)}
                className="py-1 px-1 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 hover:bg-emerald-500/10 transition-colors font-mono"
              >
                +18% GST
              </button>
            </div>

            {/* Dark Glass Keypad */}
            <div className="grid grid-cols-4 gap-2 text-sm">
              <button
                onClick={handleClear}
                className="p-3 rounded-2xl bg-rose-500/15 text-rose-400 font-bold hover:bg-rose-500/25 border border-rose-500/30 transition-all active:scale-95"
              >
                C
              </button>
              <button
                onClick={handleDelete}
                className="p-3 rounded-2xl bg-slate-900 text-slate-300 font-bold hover:bg-slate-800 border border-slate-800 flex items-center justify-center transition-all active:scale-95"
              >
                <Delete className="w-4 h-4" />
              </button>
              <button
                onClick={handlePercentage}
                className="p-3 rounded-2xl bg-cyan-500/15 text-cyan-300 font-black hover:bg-cyan-500/25 border border-cyan-500/30 transition-all active:scale-95"
              >
                %
              </button>
              <button
                onClick={() => handleOperator('/')}
                className="p-3 rounded-2xl bg-blue-600/20 text-blue-400 font-black hover:bg-blue-600/30 border border-blue-500/30 transition-all active:scale-95"
              >
                ÷
              </button>

              {['7', '8', '9'].map(d => (
                <button
                  key={d}
                  onClick={() => handleDigit(d)}
                  className="p-3 rounded-2xl bg-slate-900/90 text-white font-bold hover:bg-slate-800 border border-slate-800/80 transition-all active:scale-95"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => handleOperator('*')}
                className="p-3 rounded-2xl bg-blue-600/20 text-blue-400 font-black hover:bg-blue-600/30 border border-blue-500/30 transition-all active:scale-95"
              >
                ×
              </button>

              {['4', '5', '6'].map(d => (
                <button
                  key={d}
                  onClick={() => handleDigit(d)}
                  className="p-3 rounded-2xl bg-slate-900/90 text-white font-bold hover:bg-slate-800 border border-slate-800/80 transition-all active:scale-95"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => handleOperator('-')}
                className="p-3 rounded-2xl bg-blue-600/20 text-blue-400 font-black hover:bg-blue-600/30 border border-blue-500/30 transition-all active:scale-95"
              >
                −
              </button>

              {['1', '2', '3'].map(d => (
                <button
                  key={d}
                  onClick={() => handleDigit(d)}
                  className="p-3 rounded-2xl bg-slate-900/90 text-white font-bold hover:bg-slate-800 border border-slate-800/80 transition-all active:scale-95"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => handleOperator('+')}
                className="p-3 rounded-2xl bg-blue-600/20 text-blue-400 font-black hover:bg-blue-600/30 border border-blue-500/30 transition-all active:scale-95"
              >
                +
              </button>

              <button
                onClick={handleToggleSign}
                className="p-3 rounded-2xl bg-slate-900 text-slate-300 font-bold hover:bg-slate-800 border border-slate-800 text-xs transition-all active:scale-95"
              >
                ±
              </button>
              <button
                onClick={() => handleDigit('0')}
                className="p-3 rounded-2xl bg-slate-900/90 text-white font-bold hover:bg-slate-800 border border-slate-800/80 transition-all active:scale-95"
              >
                0
              </button>
              <button
                onClick={() => handleDigit('.')}
                className="p-3 rounded-2xl bg-slate-900/90 text-white font-bold hover:bg-slate-800 border border-slate-800/80 transition-all active:scale-95"
              >
                .
              </button>
              <button
                onClick={handleCalculate}
                className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center justify-center text-base"
              >
                =
              </button>
            </div>
          </div>
        )}

        {/* FOOTER / INSERT BUTTON */}
        {onInsertValue && (
          <div className={`p-3 border-t ${
            calcType === 'modern' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <button
              onClick={handleInsert}
              className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-98 ${
                calcType === 'modern'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-slate-950 font-black'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
              <span>Insert {display} into Invoice</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
