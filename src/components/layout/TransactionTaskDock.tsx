import React from 'react';
import { 
  FileText, ShoppingBag, RotateCcw, RotateCw, FileSpreadsheet, 
  Truck, Maximize2, X, ChevronUp, Layers, CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useTransactionDock, TransactionDraftWindow } from '../../contexts/TransactionDockContext';
import { formatCurrency } from '../../lib/utils';

export const TransactionTaskDock: React.FC = () => {
  const { drafts, restoreTransaction, closeTransaction } = useTransactionDock();

  // Only show dock if there is at least one minimized draft
  const minimizedDrafts = drafts.filter(d => d.isMinimized);

  if (minimizedDrafts.length === 0) {
    return null;
  }

  const getCategoryTheme = (category: TransactionDraftWindow['category']) => {
    switch (category) {
      case 'Sale':
        return {
          icon: FileText,
          bg: 'bg-blue-900/90 text-blue-100 border-blue-500/50 hover:bg-blue-800',
          badge: 'bg-blue-500 text-white',
          accent: 'text-blue-400'
        };
      case 'Purchase':
        return {
          icon: ShoppingBag,
          bg: 'bg-indigo-900/90 text-indigo-100 border-indigo-500/50 hover:bg-indigo-800',
          badge: 'bg-indigo-500 text-white',
          accent: 'text-indigo-400'
        };
      case 'Sale Return':
        return {
          icon: RotateCcw,
          bg: 'bg-rose-900/90 text-rose-100 border-rose-500/50 hover:bg-rose-800',
          badge: 'bg-rose-500 text-white',
          accent: 'text-rose-400'
        };
      case 'Purchase Return':
        return {
          icon: RotateCw,
          bg: 'bg-amber-900/90 text-amber-100 border-amber-500/50 hover:bg-amber-800',
          badge: 'bg-amber-500 text-white',
          accent: 'text-amber-400'
        };
      case 'Estimate':
        return {
          icon: FileSpreadsheet,
          bg: 'bg-emerald-900/90 text-emerald-100 border-emerald-500/50 hover:bg-emerald-800',
          badge: 'bg-emerald-500 text-white',
          accent: 'text-emerald-400'
        };
      case 'Sale Order':
      case 'Delivery Challan':
      case 'Purchase Order':
      default:
        return {
          icon: Truck,
          bg: 'bg-purple-900/90 text-purple-100 border-purple-500/50 hover:bg-purple-800',
          badge: 'bg-purple-500 text-white',
          accent: 'text-purple-400'
        };
    }
  };

  return (
    <div 
      id="mbi-transaction-task-dock"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 max-w-[95vw] sm:max-w-4xl flex items-center gap-2 p-1.5 bg-slate-950/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
      style={{ boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 20px rgba(59, 130, 246, 0.15)' }}
    >
      {/* Dock Header Badge */}
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-slate-400 border-r border-slate-800 text-[11px] font-bold">
        <div className="relative">
          <Layers className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
        </div>
        <span className="text-slate-300">Active Tasks</span>
        <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-blue-400 font-mono text-[10px]">
          {minimizedDrafts.length}
        </span>
      </div>

      {/* Minimized Task Chips */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 px-1 max-w-full">
        {minimizedDrafts.map((draft) => {
          const theme = getCategoryTheme(draft.category);
          const Icon = theme.icon;
          const displayParty = draft.partyName.trim() || 'Unassigned Party';

          return (
            <div
              key={draft.id}
              className={`group flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl border transition-all cursor-pointer shadow-md select-none shrink-0 ${theme.bg}`}
              onClick={() => restoreTransaction(draft.id)}
              title={`Click to resume ${draft.category} (${displayParty})`}
            >
              {/* Category & Status Indicator */}
              <div className="flex items-center gap-1.5">
                <span className={`p-1 rounded-lg ${theme.badge} shadow-xs`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5 leading-tight">
                    <span className="font-extrabold text-xs tracking-tight text-white">
                      {draft.category}
                    </span>
                    {draft.amount > 0 && (
                      <span className="font-mono text-[11px] font-bold text-emerald-300">
                        {formatCurrency(draft.amount)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] opacity-80 leading-tight">
                    <span className="truncate max-w-[110px] text-slate-200">
                      {displayParty}
                    </span>
                    {draft.itemCount > 0 && (
                      <span className="text-slate-300">
                        • {draft.itemCount} {draft.itemCount === 1 ? 'item' : 'items'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 ml-1 border-l border-white/15 pl-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    restoreTransaction(draft.id);
                  }}
                  className="p-1 hover:bg-white/20 text-white rounded-md transition-colors"
                  title="Restore Window"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTransaction(draft.id);
                  }}
                  className="p-1 hover:bg-rose-600/80 text-white/70 hover:text-white rounded-md transition-colors"
                  title="Discard / Close Draft"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
