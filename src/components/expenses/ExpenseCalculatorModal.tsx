import React, { useState } from 'react';
import { X, Delete, Equal } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApplyValue?: (val: number) => void;
}

export const ExpenseCalculatorModal: React.FC<Props> = ({ isOpen, onClose, onApplyValue }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  if (!isOpen) return null;

  const handleNum = (n: string) => {
    if (display === '0' || display === 'Error') {
      setDisplay(n);
    } else {
      setDisplay(display + n);
    }
  };

  const handleOp = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleCalculate = () => {
    try {
      const full = (equation + display).replace(/×/g, '*').replace(/÷/g, '/');
      // eslint-disable-next-line no-eval
      const result = Function('"use strict";return (' + full + ')')();
      const formatted = Number.isFinite(result) ? parseFloat(result.toFixed(2)).toString() : 'Error';
      setDisplay(formatted);
      setEquation('');
    } catch {
      setDisplay('Error');
    }
  };

  const handleApply = () => {
    const num = parseFloat(display);
    if (!isNaN(num) && onApplyValue) {
      onApplyValue(num);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-72 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-sm tracking-wide">Quick Calculator</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 bg-slate-950 text-right">
          <div className="text-xs text-slate-400 min-h-[16px] font-mono">{equation}</div>
          <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight truncate mt-1">{display}</div>
        </div>

        <div className="p-3 grid grid-cols-4 gap-2 bg-slate-50 text-slate-800 text-sm font-bold">
          <button onClick={handleClear} className="p-2.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-xl transition-colors">C</button>
          <button onClick={handleBackspace} className="p-2.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl flex items-center justify-center transition-colors">
            <Delete className="w-4 h-4" />
          </button>
          <button onClick={() => handleOp('÷')} className="p-2.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-xl transition-colors">÷</button>
          <button onClick={() => handleOp('×')} className="p-2.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-xl transition-colors">×</button>

          <button onClick={() => handleNum('7')} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl shadow-xs transition-colors">7</button>
          <button onClick={() => handleNum('8')} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl shadow-xs transition-colors">8</button>
          <button onClick={() => handleNum('9')} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl shadow-xs transition-colors">9</button>
          <button onClick={() => handleOp('-')} className="p-2.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-xl transition-colors">-</button>

          <button onClick={() => handleNum('4')} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl shadow-xs transition-colors">4</button>
          <button onClick={() => handleNum('5')} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl shadow-xs transition-colors">5</button>
          <button onClick={() => handleNum('6')} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl shadow-xs transition-colors">6</button>
          <button onClick={() => handleOp('+')} className="p-2.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-xl transition-colors">+</button>

          <button onClick={() => handleNum('1')} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl shadow-xs transition-colors">1</button>
          <button onClick={() => handleNum('2')} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl shadow-xs transition-colors">2</button>
          <button onClick={() => handleNum('3')} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl shadow-xs transition-colors">3</button>
          <button onClick={handleCalculate} className="row-span-2 p-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl flex items-center justify-center font-black shadow-sm transition-colors">
            <Equal className="w-5 h-5" />
          </button>

          <button onClick={() => handleNum('0')} className="col-span-2 p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl shadow-xs transition-colors">0</button>
          <button onClick={() => handleNum('.')} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl shadow-xs transition-colors">.</button>
        </div>

        {onApplyValue && (
          <div className="p-3 bg-slate-100 border-t border-slate-200 flex gap-2">
            <button
              onClick={handleApply}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
            >
              Insert Value (Rs {display})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
