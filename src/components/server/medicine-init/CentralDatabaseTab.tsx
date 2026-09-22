import React, { useState, useMemo } from 'react';
import { CentralMedicine } from '../../../types';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Send,
  Layers,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  Users,
  Sparkles,
  Download
} from 'lucide-react';

interface CentralDatabaseTabProps {
  medicines: CentralMedicine[];
  categories: string[];
  tenants: any[];
  onAddNew: () => void;
  onEdit: (med: CentralMedicine) => void;
  onDelete: (med: CentralMedicine) => void;
  onQuickAssign: (medIds: string[]) => void;
  onShiftCategory: (medIds: string[]) => void;
  onExportFiltered: (category?: string) => void;
}

export const CentralDatabaseTab: React.FC<CentralDatabaseTabProps> = ({
  medicines,
  categories,
  tenants,
  onAddNew,
  onEdit,
  onDelete,
  onQuickAssign,
  onShiftCategory,
  onExportFiltered
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSource, setSelectedSource] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filtered dataset
  const filtered = useMemo(() => {
    return medicines.filter(item => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (selectedSource !== 'ALL' && item.source !== selectedSource) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = item.name?.toLowerCase().includes(q);
        const matchBrand = item.brandName?.toLowerCase().includes(q);
        const matchCompany = item.company?.toLowerCase().includes(q);
        const matchGeneric = item.genericName?.toLowerCase().includes(q);
        const matchCategory = item.category?.toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchCompany && !matchGeneric && !matchCategory) return false;
      }
      return true;
    });
  }, [medicines, selectedCategory, selectedSource, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const isAllSelected = paginatedItems.length > 0 && paginatedItems.every(i => selectedIds.includes(i.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const pageIdSet = new Set(paginatedItems.map(i => i.id));
      setSelectedIds(prev => prev.filter(id => !pageIdSet.has(id)));
    } else {
      const newIds = new Set([...selectedIds, ...paginatedItems.map(i => i.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Medicine Name, Brand, Company, Generic Formula..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={e => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 max-w-[200px]"
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={selectedSource}
              onChange={e => {
                setSelectedSource(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Sources</option>
              <option value="SYSTEM_PRESET">System Preset</option>
              <option value="EXCEL_IMPORT">Excel Import</option>
              <option value="CSV_IMPORT">CSV Import</option>
              <option value="CUSTOMER_SYNC">Customer Synced</option>
              <option value="MASTER_MANUAL">Master Manual</option>
            </select>

            <button
              onClick={onAddNew}
              className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-sky-600/30 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Medicine
            </button>

            <button
              onClick={() => onExportFiltered(selectedCategory)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
              title="Export visible list to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              Export
            </button>
          </div>
        </div>

        {/* Selected Batch Action Bar */}
        {selectedIds.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs bg-sky-950/20 px-3 py-2 rounded-lg border border-sky-900/40">
            <div className="flex items-center gap-2 text-sky-300 font-medium">
              <span className="bg-sky-500 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[11px]">
                {selectedIds.length}
              </span>
              <span>medicines selected</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onQuickAssign(selectedIds)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-medium transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                Give / Assign to Customer
              </button>

              <button
                onClick={() => onShiftCategory(selectedIds)}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-medium transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                Shift Category
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table of Central Medicines */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <button onClick={toggleSelectAll} className="p-0.5 text-slate-400 hover:text-white">
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-sky-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Item / Medicine Name</th>
                <th className="py-3 px-4">Brand / Company</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-3 text-center">Source</th>
                <th className="py-3 px-3 text-center">Customer Access</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <p className="text-sm">No medicine records match your search query.</p>
                    <p className="text-xs mt-1 text-slate-600">Try adjusting your filters or import items from Excel/CSV.</p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map(item => {
                  const isSelected = selectedIds.includes(item.id);
                  const assignedCount = item.assignedTenantIds?.length || 0;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-sky-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleSelectOne(item.id)}
                          className="p-0.5 text-slate-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-sky-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{item.name}</div>
                        {item.genericName && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {item.genericName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-200 font-medium">
                          {item.brandName || item.company || '—'}
                        </div>
                        {item.company && item.brandName && item.company !== item.brandName && (
                          <div className="text-[11px] text-slate-500">{item.company}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.source === 'SYSTEM_PRESET' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Preset
                          </span>
                        ) : item.source === 'CUSTOMER_SYNC' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            <Sparkles className="w-2.5 h-2.5" />
                            Client Sync
                          </span>
                        ) : item.source === 'EXCEL_IMPORT' || item.source === 'CSV_IMPORT' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Imported
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {assignedCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            <Users className="w-3 h-3" />
                            {assignedCount} Tenant{assignedCount > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onQuickAssign([item.id])}
                            title="Assign to Customer"
                            className="p-1.5 text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-800 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEdit(item)}
                            title="Edit Medicine"
                            className="p-1.5 text-slate-400 hover:text-sky-400 rounded hover:bg-slate-800 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(item)}
                            title="Delete Medicine"
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing <strong className="text-slate-200">{filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-slate-200">{Math.min(currentPage * pageSize, filtered.length)}</strong> of{' '}
            <strong className="text-slate-200">{filtered.length}</strong> total records
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium text-slate-200">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
