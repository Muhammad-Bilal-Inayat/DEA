import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, Search, Filter, X, ChevronDown, Check, 
  RotateCcw, RefreshCw, CheckCircle2, AlertCircle, 
  Database, ArrowUpDown, Tag, Users, ShieldCheck, Sparkles
} from 'lucide-react';
import { useFirebaseSyncStatus } from '../../lib/firebaseSync';
import { useNavigate } from 'react-router-dom';

export type DatePreset = 
  | 'Today' 
  | 'Yesterday' 
  | 'This Week' 
  | 'Last 7 Days' 
  | 'This Month' 
  | 'Previous Month' 
  | 'This Quarter' 
  | 'This Fiscal Year' 
  | 'All Time' 
  | 'Custom';

export interface DateRangeState {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  preset: DatePreset;
}

export interface PartyOption {
  id: string;
  name: string;
  phone?: string;
  type?: string;
  count?: number;
}

export interface StatusOption {
  id: string;
  label: string;
  color?: string;
  count?: number;
}

export interface ReportFilterBarProps {
  // Date Range Props
  dateRange: DateRangeState;
  onDateRangeChange: (newRange: DateRangeState) => void;
  showDateFilter?: boolean;

  // Party Filter Props
  selectedParty?: string;
  partyOptions?: PartyOption[];
  onPartyChange?: (partyId: string) => void;
  partyLabel?: string;
  partyPlaceholder?: string;

  // Category Filter Props
  selectedCategory?: string;
  categoryOptions?: string[];
  onCategoryChange?: (category: string) => void;
  categoryLabel?: string;

  // Status Filter Props
  selectedStatus?: string;
  statusOptions?: StatusOption[];
  onStatusChange?: (status: string) => void;
  statusLabel?: string;

  // Search Props
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;

  // Quick Action & Reset Props
  onResetFilters?: () => void;
  onResetAllFilters?: () => void;
  activeFilterCount?: number;
  
  // System Health Indicator
  showHealthIndicator?: boolean;
  showSyncIndicator?: boolean;
  onOpenHealthModal?: () => void;

  // Custom Extension Action Buttons (Export, Print, etc.)
  children?: React.ReactNode;
  
  // Styling
  className?: string;
}

export function getDateRangeFromPreset(preset: DatePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const todayStr = format(now);

  switch (preset) {
    case 'Today':
      return { startDate: todayStr, endDate: todayStr };

    case 'Yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = format(y);
      return { startDate: yStr, endDate: yStr };
    }

    case 'This Week': {
      const day = now.getDay(); // 0 = Sunday
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      const mon = new Date(now);
      mon.setDate(diff);
      return { startDate: format(mon), endDate: todayStr };
    }

    case 'Last 7 Days': {
      const l7 = new Date(now);
      l7.setDate(l7.getDate() - 6);
      return { startDate: format(l7), endDate: todayStr };
    }

    case 'This Month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: format(firstDay), endDate: todayStr };
    }

    case 'Previous Month': {
      const firstDayPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: format(firstDayPrev), endDate: format(lastDayPrev) };
    }

    case 'This Quarter': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const qStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
      return { startDate: format(qStart), endDate: todayStr };
    }

    case 'This Fiscal Year': {
      // Fiscal year usually starts July 1st (e.g., in PK/common) or Jan 1st
      const startMonth = now.getMonth() >= 6 ? 6 : 6;
      const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      const fyStart = new Date(startYear, startMonth, 1);
      return { startDate: format(fyStart), endDate: todayStr };
    }

    case 'All Time':
      return { startDate: '2020-01-01', endDate: todayStr };

    case 'Custom':
    default:
      return { startDate: todayStr, endDate: todayStr };
  }
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  dateRange,
  onDateRangeChange,
  showDateFilter = true,
  selectedParty,
  partyOptions,
  onPartyChange,
  partyLabel = 'Party / Customer',
  partyPlaceholder = 'All Parties',
  selectedCategory,
  categoryOptions,
  onCategoryChange,
  categoryLabel = 'Category',
  selectedStatus,
  statusOptions,
  onStatusChange,
  statusLabel = 'Status',
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records, Doc #, party...',
  onResetFilters,
  onResetAllFilters,
  activeFilterCount,
  showHealthIndicator = true,
  showSyncIndicator,
  onOpenHealthModal,
  children,
  className = ''
}) => {
  const handleReset = onResetFilters || onResetAllFilters;
  const isHealthVisible = showSyncIndicator !== undefined ? showSyncIndicator : showHealthIndicator;
  const navigate = useNavigate();
  const syncStatus = useFirebaseSyncStatus();
  
  // Dropdown open states
  const [openDropdown, setOpenDropdown] = useState<'date' | 'party' | 'category' | 'status' | null>(null);
  const [partySearchText, setPartySearchText] = useState('');
  const [categorySearchText, setCategorySearchText] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut to focus search input if not inside another input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e || !e.key) return;
      if ((e.ctrlKey && e.key.toLowerCase() === 'f') || (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
        if (onSearchChange && searchInputRef.current) {
          e.preventDefault();
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearchChange]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetSelect = (preset: DatePreset) => {
    if (preset === 'Custom') {
      onDateRangeChange({
        ...dateRange,
        preset: 'Custom'
      });
    } else {
      const dates = getDateRangeFromPreset(preset);
      onDateRangeChange({
        startDate: dates.startDate,
        endDate: dates.endDate,
        preset
      });
    }
    setOpenDropdown(null);
  };

  const filteredParties = (partyOptions || []).filter(p => 
    p.name.toLowerCase().includes(partySearchText.toLowerCase()) ||
    (p.phone && p.phone.includes(partySearchText))
  );

  const filteredCategories = (categoryOptions || []).filter(c => 
    c.toLowerCase().includes(categorySearchText.toLowerCase())
  );

  const presets: DatePreset[] = [
    'Today',
    'Yesterday',
    'This Week',
    'Last 7 Days',
    'This Month',
    'Previous Month',
    'This Quarter',
    'This Fiscal Year',
    'All Time',
    'Custom'
  ];

  const currentPartyName = partyOptions?.find(p => p.id === selectedParty)?.name || 'All Parties';
  const currentStatusLabel = statusOptions?.find(s => s.id === selectedStatus)?.label || 'All Statuses';

  // Calculate dynamic active filter count if not provided
  const computedActiveFilterCount = activeFilterCount !== undefined 
    ? activeFilterCount 
    : [
        dateRange.preset !== 'This Month' && dateRange.preset !== 'All Time',
        selectedParty && selectedParty !== 'ALL',
        selectedCategory && selectedCategory !== 'ALL',
        selectedStatus && selectedStatus !== 'ALL',
        Boolean(searchQuery && searchQuery.trim().length > 0)
      ].filter(Boolean).length;

  return (
    <div ref={dropdownRef} className={`bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 shadow-2xs transition-all ${className}`}>
      {/* Main Filter Bar Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        
        {/* Controls: Search + Sliding Filter Buttons */}
        <div className="flex flex-col md:flex-row md:items-center gap-2 flex-1 min-w-0">
          
          {/* 1. Sliding Filter Chips Ribbon on Mobile (Left to Right / Right to Left) */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-nowrap py-1 md:py-0 w-full md:w-auto shrink-0 snap-x">
            
            {/* Date Range Dropdown */}
            {showDateFilter && (
              <div className="relative shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                    openDropdown === 'date' || (dateRange.preset !== 'This Month' && dateRange.preset !== 'All Time')
                      ? 'bg-blue-50/70 border-blue-300 text-blue-800'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate max-w-[150px] sm:max-w-[170px]">
                    {dateRange.preset === 'Custom' 
                      ? `${dateRange.startDate} → ${dateRange.endDate}` 
                      : dateRange.preset}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>

                {/* Date Presets Popover */}
                {openDropdown === 'date' && (
                  <div className="fixed inset-x-3 sm:inset-x-auto sm:absolute top-24 sm:top-full sm:left-0 mt-1.5 z-50 w-auto sm:w-72 max-h-[80vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 animate-in fade-in slide-in-from-top-1 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2 font-bold text-slate-800">
                      <span className="flex items-center gap-1.5 text-blue-600">
                        <Calendar className="w-4 h-4" /> Date Filter Presets
                      </span>
                      <button 
                        onClick={() => setOpenDropdown(null)} 
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1 mb-3">
                      {presets.map((preset) => {
                        const isSelected = dateRange.preset === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handlePresetSelect(preset)}
                            className={`text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-between ${
                              isSelected
                              ? 'bg-blue-600 text-white shadow-2xs font-bold'
                              : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                        >
                          <span>{preset}</span>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Date Pickers */}
                  <div className="pt-2.5 border-t border-slate-100 space-y-2">
                    <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                      <span>Custom Range:</span>
                      {dateRange.preset === 'Custom' && (
                        <span className="text-emerald-600 text-[10px] font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Active</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Start Date</label>
                        <input
                          type="date"
                          value={dateRange.startDate}
                          onChange={(e) => {
                            onDateRangeChange({
                              startDate: e.target.value,
                              endDate: dateRange.endDate,
                              preset: 'Custom'
                            });
                          }}
                          className="w-full text-xs font-mono font-medium px-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-slate-500 block mb-0.5">End Date</label>
                        <input
                          type="date"
                          value={dateRange.endDate}
                          onChange={(e) => {
                            onDateRangeChange({
                              startDate: dateRange.startDate,
                              endDate: e.target.value,
                              preset: 'Custom'
                            });
                          }}
                          className="w-full text-xs font-mono font-medium px-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Party Selector Dropdown with Search */}
          {partyOptions && onPartyChange && (
            <div className="relative shrink-0 snap-start">
              <button
                type="button"
                onClick={() => {
                  setOpenDropdown(openDropdown === 'party' ? null : 'party');
                  setPartySearchText('');
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                  openDropdown === 'party' || (selectedParty && selectedParty !== 'ALL')
                    ? 'bg-blue-50/70 border-blue-300 text-blue-800'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate max-w-[140px]">
                  {selectedParty && selectedParty !== 'ALL' ? currentPartyName : partyPlaceholder}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {openDropdown === 'party' && (
                <div className="fixed inset-x-3 sm:inset-x-auto sm:absolute top-24 sm:top-full sm:left-0 mt-1.5 z-50 w-auto sm:w-72 max-h-[80vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 animate-in fade-in slide-in-from-top-1 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" /> {partyLabel}
                    </span>
                    <button 
                      onClick={() => setOpenDropdown(null)} 
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Search inside party list */}
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search party by name/phone..."
                      value={partySearchText}
                      onChange={(e) => setPartySearchText(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                      autoFocus
                    />
                  </div>

                  {/* Party Options List */}
                  <div className="max-h-56 overflow-y-auto space-y-1 scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => {
                        onPartyChange('ALL');
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        !selectedParty || selectedParty === 'ALL'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>All Parties</span>
                      {(!selectedParty || selectedParty === 'ALL') && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {filteredParties.map((p) => {
                      const isSelected = selectedParty === p.id || selectedParty === p.name;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            onPartyChange(p.id);
                            setOpenDropdown(null);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white font-bold'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="truncate">
                            <span className="font-bold">{p.name}</span>
                            {p.phone && <span className={`ml-2 text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400 font-mono'}`}>{p.phone}</span>}
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                        </button>
                      );
                    })}

                    {filteredParties.length === 0 && (
                      <div className="text-center py-4 text-slate-400 text-xs">
                        No parties found matching "{partySearchText}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Category Filter Dropdown */}
          {categoryOptions && onCategoryChange && (
            <div className="relative shrink-0 snap-start">
              <button
                type="button"
                onClick={() => {
                  setOpenDropdown(openDropdown === 'category' ? null : 'category');
                  setCategorySearchText('');
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                  openDropdown === 'category' || (selectedCategory && selectedCategory !== 'ALL')
                    ? 'bg-blue-50/70 border-blue-300 text-blue-800'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate max-w-[120px]">
                  {selectedCategory && selectedCategory !== 'ALL' ? selectedCategory : 'All Categories'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {openDropdown === 'category' && (
                <div className="fixed inset-x-3 sm:inset-x-auto sm:absolute top-24 sm:top-full sm:left-0 mt-1.5 z-50 w-auto sm:w-64 max-h-[80vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 animate-in fade-in slide-in-from-top-1 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-blue-600" /> {categoryLabel}
                    </span>
                    <button 
                      onClick={() => setOpenDropdown(null)} 
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Search inside categories if more than 5 */}
                  {categoryOptions.length > 5 && (
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search categories..."
                        value={categorySearchText}
                        onChange={(e) => setCategorySearchText(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                  )}

                  <div className="max-h-56 overflow-y-auto space-y-1 scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => {
                        onCategoryChange('ALL');
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        !selectedCategory || selectedCategory === 'ALL'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>All Categories</span>
                      {(!selectedCategory || selectedCategory === 'ALL') && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {filteredCategories.map((cat) => {
                      const isSelected = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            onCategoryChange(cat);
                            setOpenDropdown(null);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white font-bold'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>{cat}</span>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Status Filter Dropdown */}
          {statusOptions && onStatusChange && (
            <div className="relative shrink-0 snap-start">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                  openDropdown === 'status' || (selectedStatus && selectedStatus !== 'ALL')
                    ? 'bg-blue-50/70 border-blue-300 text-blue-800'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate max-w-[120px]">
                  {selectedStatus && selectedStatus !== 'ALL' ? currentStatusLabel : 'All Statuses'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {openDropdown === 'status' && (
                <div className="fixed inset-x-3 sm:inset-x-auto sm:absolute top-24 sm:top-full sm:left-0 mt-1.5 z-50 w-auto sm:w-56 max-h-[80vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 animate-in fade-in slide-in-from-top-1 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" /> {statusLabel}
                    </span>
                    <button 
                      onClick={() => setOpenDropdown(null)} 
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        onStatusChange('ALL');
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        !selectedStatus || selectedStatus === 'ALL'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>All Statuses</span>
                      {(!selectedStatus || selectedStatus === 'ALL') && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {statusOptions.map((st) => {
                      const isSelected = selectedStatus === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            onStatusChange(st.id);
                            setOpenDropdown(null);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white font-bold'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            {st.color && (
                              <span className={`w-2 h-2 rounded-full ${st.color}`} />
                            )}
                            {st.label}
                          </span>
                          {st.count !== undefined && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {st.count}
                            </span>
                          )}
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

            {/* Reset All Filters Button */}
            {handleReset && computedActiveFilterCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0 snap-start whitespace-nowrap"
                title="Reset all filters to default"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* 5. Live Search Input Field with Flexbox / flex-grow */}
          {onSearchChange && (
            <div className="relative flex-grow w-full md:w-auto min-w-[200px] sm:min-w-[280px] max-w-xl group">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                searchQuery ? 'text-blue-500' : 'text-slate-400 group-focus-within:text-blue-500'
              }`} />
              <input
                ref={searchInputRef}
                type="text"
                tabIndex={0}
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    if (searchQuery) {
                      e.preventDefault();
                      onSearchChange('');
                    } else {
                      searchInputRef.current?.blur();
                    }
                  }
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-8.5 pr-8 py-2 text-xs rounded-xl border border-slate-200/90 bg-slate-50/90 hover:bg-slate-100/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 placeholder:text-slate-400 transition-all shadow-2xs"
              />
              {searchQuery && searchQuery.length > 0 ? (
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => {
                    onSearchChange('');
                    searchInputRef.current?.focus();
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Clear search (Esc)"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden lg:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9.5px] font-bold text-slate-400 bg-slate-200/50 rounded border border-slate-300/60 pointer-events-none select-none">
                  /
                </kbd>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Health & Sync Indicator + Custom Action Buttons */}
        <div className="flex items-center gap-2">
          
          {/* Database & Cloud Sync Health Indicator */}
          {isHealthVisible && (
            <button
              type="button"
              onClick={() => {
                if (onOpenHealthModal) {
                  onOpenHealthModal();
                } else {
                  navigate('/settings?tab=SYSTEM+HEALTH+%26+SYNC');
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-xl border transition-all cursor-pointer shadow-2xs ${
                syncStatus.state === 'synced'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : syncStatus.state === 'syncing'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : syncStatus.state === 'unsynced'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
              }`}
              title={`Database Status: ${syncStatus.state.toUpperCase()} • Click to view System Health & Sync`}
            >
              <span className={`w-2 h-2 rounded-full ${
                syncStatus.state === 'synced' ? 'bg-emerald-500 animate-pulse' :
                syncStatus.state === 'syncing' ? 'bg-blue-500 animate-spin' :
                syncStatus.state === 'unsynced' ? 'bg-amber-500' : 'bg-slate-400'
              }`} />
              <span className="hidden sm:inline">
                {syncStatus.state === 'synced' && 'Cloud Synced'}
                {syncStatus.state === 'syncing' && 'Syncing...'}
                {syncStatus.state === 'unsynced' && `${syncStatus.pendingCount} Pending Sync`}
                {syncStatus.state === 'offline' && 'Offline Cached'}
                {syncStatus.state === 'error' && 'Sync Notice'}
              </span>
            </button>
          )}

          {/* Children Actions (Export, Print, Share, etc.) */}
          {children}
        </div>
      </div>

      {/* Active Filter Chips Bar (Shown whenever non-default filters are active) */}
      {computedActiveFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100 text-[11px]">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" /> Active:
          </span>

          {dateRange.preset !== 'This Month' && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg font-bold">
              Date: {dateRange.preset === 'Custom' ? `${dateRange.startDate} → ${dateRange.endDate}` : dateRange.preset}
              <button 
                onClick={() => handlePresetSelect('This Month')} 
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                ×
              </button>
            </span>
          )}

          {selectedParty && selectedParty !== 'ALL' && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg font-bold">
              Party: {currentPartyName}
              <button 
                onClick={() => onPartyChange?.('ALL')} 
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                ×
              </button>
            </span>
          )}

          {selectedCategory && selectedCategory !== 'ALL' && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg font-bold">
              Category: {selectedCategory}
              <button 
                onClick={() => onCategoryChange?.('ALL')} 
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                ×
              </button>
            </span>
          )}

          {selectedStatus && selectedStatus !== 'ALL' && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg font-bold">
              Status: {currentStatusLabel}
              <button 
                onClick={() => onStatusChange?.('ALL')} 
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                ×
              </button>
            </span>
          )}

          {searchQuery && searchQuery.trim().length > 0 && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg font-bold">
              Search: "{searchQuery}"
              <button 
                onClick={() => onSearchChange?.('')} 
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
