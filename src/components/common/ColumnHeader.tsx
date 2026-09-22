import React, { useRef, useEffect } from 'react';
import { Filter, Search, X, Check, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface ColumnFilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface ColumnHeaderProps {
  label: string;
  sortKey?: string;
  currentSortField?: string;
  currentSortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  filterKey?: string;
  activeFilterValue?: string;
  filterOptions?: ColumnFilterOption[];
  onSelectFilter?: (val: string) => void;
  openPopoverKey?: string | null;
  setOpenPopoverKey?: (key: string | null) => void;
  filterSearch?: string;
  setFilterSearch?: (val: string) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
  isSearchable?: boolean;
}

export const ColumnHeader: React.FC<ColumnHeaderProps> = ({
  label,
  sortKey,
  currentSortField,
  currentSortOrder = 'desc',
  onSort,
  filterKey,
  activeFilterValue = 'ALL',
  filterOptions,
  onSelectFilter,
  openPopoverKey,
  setOpenPopoverKey,
  filterSearch = '',
  setFilterSearch,
  align = 'left',
  className = '',
  isSearchable = true,
}) => {
  const isPopoverOpen = openPopoverKey === filterKey && Boolean(filterKey);
  const isFilterActive = Boolean(activeFilterValue && activeFilterValue !== 'ALL' && activeFilterValue !== '');
  const isSorted = currentSortField === sortKey && Boolean(sortKey);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!isPopoverOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenPopoverKey?.(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isPopoverOpen, setOpenPopoverKey]);

  const filteredOptions = (filterOptions || []).filter(opt => {
    if (!filterSearch.trim()) return true;
    return (
      opt.label.toLowerCase().includes(filterSearch.toLowerCase().trim()) ||
      opt.value.toLowerCase().includes(filterSearch.toLowerCase().trim())
    );
  });

  return (
    <th
      className={`py-2.5 px-3 text-slate-700 font-bold uppercase tracking-wider text-[11px] select-none relative ${className}`}
    >
      <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        {/* Sortable Header text */}
        {sortKey && onSort ? (
          <button
            type="button"
            onClick={() => onSort(sortKey)}
            className="flex items-center gap-1 hover:text-blue-600 transition-colors font-bold text-left cursor-pointer group"
            title={`Click to sort by ${label}`}
          >
            <span>{label}</span>
            <span className="text-[10px] inline-flex items-center">
              {isSorted ? (
                currentSortOrder === 'asc' ? (
                  <ArrowUp className="w-3 h-3 text-blue-600 stroke-[2.5]" />
                ) : (
                  <ArrowDown className="w-3 h-3 text-blue-600 stroke-[2.5]" />
                )
              ) : (
                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 opacity-60 group-hover:opacity-100" />
              )}
            </span>
          </button>
        ) : (
          <span className="font-bold">{label}</span>
        )}

        {/* Filter Trigger Button */}
        {filterKey && filterOptions && filterOptions.length > 0 && (
          <div className="relative inline-block text-left" ref={popoverRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isPopoverOpen) {
                  setOpenPopoverKey?.(null);
                } else {
                  setFilterSearch?.('');
                  setOpenPopoverKey?.(filterKey);
                }
              }}
              className={`p-1 rounded-md cursor-pointer transition-all flex items-center justify-center ${
                isFilterActive
                  ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-500'
                  : 'text-slate-400 hover:text-blue-600 hover:bg-slate-200/80'
              }`}
              title={`Filter by ${label} (${isFilterActive ? activeFilterValue : 'All'})`}
            >
              <Filter className="w-3 h-3" />
            </button>

            {/* Filter Dropdown Popover */}
            {isPopoverOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-2.5 space-y-2 text-xs normal-case tracking-normal animate-in fade-in zoom-in-95 duration-100 ${
                  align === 'right' ? 'right-0' : 'left-0'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1">
                  <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                    <Filter className="w-3 h-3 text-blue-600" /> Filter {label}
                  </span>
                  {isFilterActive && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectFilter?.('ALL');
                        setOpenPopoverKey?.(null);
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>

                {/* Optional Search in Filter List */}
                {isSearchable && filterOptions.length > 5 && (
                  <div className="relative">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      placeholder={`Search ${label.toLowerCase()}...`}
                      value={filterSearch}
                      onChange={(e) => setFilterSearch?.(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-2 py-1 text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    {filterSearch && (
                      <button
                        type="button"
                        onClick={() => setFilterSearch?.('')}
                        className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Options List */}
                <div className="max-h-48 overflow-y-auto space-y-0.5 divide-y divide-slate-50">
                  {filteredOptions.length === 0 ? (
                    <div className="py-3 text-center text-slate-400 text-[11px]">No matches found</div>
                  ) : (
                    filteredOptions.map((opt) => {
                      const isSelected = activeFilterValue === opt.value || (!activeFilterValue && opt.value === 'ALL');
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onSelectFilter?.(opt.value);
                            setOpenPopoverKey?.(null);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-xs ${
                            isSelected
                              ? 'bg-blue-50 text-blue-700 font-bold'
                              : 'text-slate-700 hover:bg-slate-100 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {isSelected && <Check className="w-3 h-3 text-blue-600 shrink-0" />}
                            <span className="truncate">{opt.label}</span>
                          </div>
                          {opt.count !== undefined && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 shrink-0 ${
                                isSelected ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {opt.count}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </th>
  );
};
