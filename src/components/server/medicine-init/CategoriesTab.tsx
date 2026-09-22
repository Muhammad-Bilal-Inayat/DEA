import React, { useState, useMemo } from 'react';
import { Layers, Send, ArrowRight, Search, Building2, Users, CheckCircle2, Sparkles } from 'lucide-react';
import { getCentralCategoriesSummary } from '../../../lib/centralMedicineDatabaseService';

interface CategoriesTabProps {
  categories: string[];
  tenants: any[];
  onAssignCategory: (category: string) => void;
  onShiftCategory: (category: string) => void;
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({
  categories,
  tenants,
  onAssignCategory,
  onShiftCategory
}) => {
  const [search, setSearch] = useState('');
  const summaries = useMemo(() => getCentralCategoriesSummary(), [categories]);

  const filtered = useMemo(() => {
    if (!search.trim()) return summaries;
    const q = search.toLowerCase().trim();
    return summaries.filter(s => s.category.toLowerCase().includes(q));
  }, [summaries, search]);

  const totalCatalogItems = summaries.reduce((acc, s) => acc + s.totalItems, 0);

  return (
    <div className="space-y-4">
      {/* Overview and Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search category name..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div>
            Total Categories: <strong className="text-white">{summaries.length}</strong>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div>
            Total Catalog Items: <strong className="text-sky-400">{totalCatalogItems}</strong>
          </div>
        </div>
      </div>

      {/* Category Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(cat => {
          const assignPercent = cat.totalItems > 0 ? Math.round((cat.assignedItems / cat.totalItems) * 100) : 0;

          return (
            <div
              key={cat.category}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white line-clamp-1">{cat.category}</h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        {cat.companiesCount} brand/company variations
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {cat.totalItems} items
                  </span>
                </div>

                {/* Progress Bar for assigned items */}
                <div className="my-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Customer Distribution</span>
                    <span className="font-mono text-slate-300">{cat.assignedItems} assigned ({assignPercent}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${assignPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                <button
                  onClick={() => onAssignCategory(cat.category)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  Assign All ({cat.totalItems})
                </button>

                <button
                  onClick={() => onShiftCategory(cat.category)}
                  className="flex items-center justify-center gap-1 py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                  title="Shift all items in this category to another category"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Shift
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
