import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Search, Zap, Keyboard, RotateCcw, Edit3, Check, 
  Play, Sparkles, AlertCircle, Info, ShieldCheck,
  Receipt, ArrowDownLeft, ShoppingCart, FileText, Truck,
  PackagePlus, ArrowUpRight, Package, Barcode, AlertTriangle,
  Wallet, Building2, Coins, Clock, FileWarning, ShieldAlert,
  HeartHandshake, BookOpen, TrendingUp, FileSpreadsheet,
  Menu, RefreshCw, Layers
} from 'lucide-react';
import { 
  ShortcutItem, 
  getStoredShortcuts, 
  saveShortcutKey, 
  resetAllShortcutsToDefault, 
  formatEventToKeyString, 
  executeShortcutAction 
} from '../../lib/shortcutsManager';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>(() => getStoredShortcuts());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Edit Shortcut State
  const [editingItem, setEditingItem] = useState<ShortcutItem | null>(null);
  const [recordedKey, setRecordedKey] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const keyRecorderRef = useRef<HTMLDivElement>(null);

  // Sync with storage changes
  useEffect(() => {
    const handleUpdate = () => {
      setShortcuts(getStoredShortcuts());
    };
    window.addEventListener('mbi-shortcuts-updated', handleUpdate);
    return () => window.removeEventListener('mbi-shortcuts-updated', handleUpdate);
  }, []);

  // When modal opens, refresh shortcuts list
  useEffect(() => {
    if (isOpen) {
      setShortcuts(getStoredShortcuts());
      setEditingItem(null);
      setRecordedKey('');
      setIsRecording(false);
    }
  }, [isOpen]);

  // Key Recording Listener for Custom Keybinding
  useEffect(() => {
    if (!isRecording) return;

    const handleRecordKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't record standalone Escape as a keybinding if cancelling
      if (e.key === 'Escape') {
        setIsRecording(false);
        return;
      }

      // Format pressed keys
      const formatted = formatEventToKeyString(e);
      if (formatted && formatted !== 'Ctrl' && formatted !== 'Alt' && formatted !== 'Shift' && formatted !== 'Cmd') {
        setRecordedKey(formatted);
      }
    };

    window.addEventListener('keydown', handleRecordKeyDown, true);
    return () => window.removeEventListener('keydown', handleRecordKeyDown, true);
  }, [isRecording]);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Shortcuts', count: shortcuts.length },
    { id: 'sale', label: 'Sales & Billing', count: shortcuts.filter(s => s.category === 'sale').length },
    { id: 'purchase', label: 'Purchases', count: shortcuts.filter(s => s.category === 'purchase').length },
    { id: 'inventory', label: 'Stock & Items', count: shortcuts.filter(s => s.category === 'inventory').length },
    { id: 'accounts', label: 'Cash & Accounts', count: shortcuts.filter(s => s.category === 'accounts').length },
    { id: 'pharmacy', label: 'Pharmacy Registers', count: shortcuts.filter(s => s.category === 'pharmacy').length },
    { id: 'reports', label: 'Reports', count: shortcuts.filter(s => s.category === 'reports').length },
    { id: 'system', label: 'System & Tools', count: shortcuts.filter(s => s.category === 'system').length }
  ];

  const filteredShortcuts = shortcuts.filter(s => {
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      s.name.toLowerCase().includes(q) || 
      s.description.toLowerCase().includes(q) || 
      s.currentKey.toLowerCase().includes(q) || 
      s.defaultKey.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const handleStartEdit = (item: ShortcutItem) => {
    setEditingItem(item);
    setRecordedKey(item.currentKey);
    setIsRecording(true);
  };

  const handleSaveCustomKey = () => {
    if (!editingItem || !recordedKey) return;
    saveShortcutKey(editingItem.id, recordedKey);
    setShortcuts(getStoredShortcuts());
    setSaveSuccessMsg(`Shortcut for "${editingItem.name}" updated to [ ${recordedKey} ]`);
    setEditingItem(null);
    setIsRecording(false);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleResetSingle = (item: ShortcutItem) => {
    saveShortcutKey(item.id, item.defaultKey);
    setShortcuts(getStoredShortcuts());
    setSaveSuccessMsg(`Reset "${item.name}" back to default [ ${item.defaultKey} ]`);
    if (editingItem?.id === item.id) {
      setEditingItem(null);
      setIsRecording(false);
    }
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleResetAll = () => {
    if (window.confirm('Are you sure you want to reset all keyboard shortcuts back to default factory settings?')) {
      resetAllShortcutsToDefault();
      setShortcuts(getStoredShortcuts());
      setSaveSuccessMsg('All shortcuts successfully restored to original factory defaults.');
      setEditingItem(null);
      setIsRecording(false);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  const handleExecute = (item: ShortcutItem) => {
    onClose();
    setTimeout(() => {
      executeShortcutAction(item, navigate);
    }, 100);
  };

  const renderIcon = (iconName?: string) => {
    const props = { className: 'w-4 h-4 shrink-0' };
    switch (iconName) {
      case 'Receipt': return <Receipt {...props} className="w-4 h-4 text-emerald-600" />;
      case 'ArrowDownLeft': return <ArrowDownLeft {...props} className="w-4 h-4 text-emerald-600" />;
      case 'RotateCcw': return <RotateCcw {...props} className="w-4 h-4 text-amber-600" />;
      case 'ShoppingCart': return <ShoppingCart {...props} className="w-4 h-4 text-blue-600" />;
      case 'FileText': return <FileText {...props} className="w-4 h-4 text-indigo-600" />;
      case 'Truck': return <Truck {...props} className="w-4 h-4 text-teal-600" />;
      case 'Zap': return <Zap {...props} className="w-4 h-4 text-amber-500 fill-amber-400" />;
      case 'PackagePlus': return <PackagePlus {...props} className="w-4 h-4 text-blue-600" />;
      case 'ArrowUpRight': return <ArrowUpRight {...props} className="w-4 h-4 text-red-600" />;
      case 'Package': return <Package {...props} className="w-4 h-4 text-slate-700" />;
      case 'Barcode': return <Barcode {...props} className="w-4 h-4 text-purple-600" />;
      case 'AlertTriangle': return <AlertTriangle {...props} className="w-4 h-4 text-amber-600" />;
      case 'Wallet': return <Wallet {...props} className="w-4 h-4 text-orange-600" />;
      case 'Building2': return <Building2 {...props} className="w-4 h-4 text-cyan-600" />;
      case 'Coins': return <Coins {...props} className="w-4 h-4 text-emerald-600" />;
      case 'Clock': return <Clock {...props} className="w-4 h-4 text-violet-600" />;
      case 'FileWarning': return <FileWarning {...props} className="w-4 h-4 text-rose-600" />;
      case 'ShieldAlert': return <ShieldAlert {...props} className="w-4 h-4 text-rose-700" />;
      case 'HeartHandshake': return <HeartHandshake {...props} className="w-4 h-4 text-pink-600" />;
      case 'BookOpen': return <BookOpen {...props} className="w-4 h-4 text-blue-600" />;
      case 'TrendingUp': return <TrendingUp {...props} className="w-4 h-4 text-emerald-600" />;
      case 'FileSpreadsheet': return <FileSpreadsheet {...props} className="w-4 h-4 text-indigo-600" />;
      case 'Search': return <Search {...props} className="w-4 h-4 text-blue-600" />;
      case 'Menu': return <Menu {...props} className="w-4 h-4 text-slate-600" />;
      case 'RefreshCw': return <RefreshCw {...props} className="w-4 h-4 text-teal-600" />;
      default: return <Keyboard {...props} className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] text-slate-800 animate-in zoom-in-95 duration-150 overflow-hidden">
        
        {/* Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-base tracking-tight">Keyboard Shortcuts Hub</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/30 text-blue-300 border border-blue-400/30">
                  Fully Editable & Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Press any combination to open views instantly or customize keybindings to match your workflow
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetAll}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-600 transition-colors cursor-pointer"
              title="Reset all customized shortcuts to factory defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
            <button 
              onClick={onClose} 
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Notification Bar if any shortcut updated */}
        {saveSuccessMsg && (
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Search and Category Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shortcuts (e.g. Sale, Invoice, F2, Barcode, Daybook, Alt+S)..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs"
                autoFocus
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Action Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 shadow-2xs shrink-0">
              <span className="font-semibold text-slate-500">Open this modal anytime:</span>
              <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-800 text-[11px]">
                Ctrl + Enter
              </kbd>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === cat.id ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body / Shortcut List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 bg-[#f8fafc]">
          {/* Active Editing / Key Recorder Banner */}
          {editingItem && (
            <div 
              ref={keyRecorderRef}
              className="p-4 bg-blue-50 border-2 border-blue-500 rounded-2xl shadow-md space-y-3 animate-in slide-in-from-top-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-950 font-black text-sm">
                  <Edit3 className="w-4 h-4 text-blue-600" />
                  <span>Customize Key Combination for: <span className="underline decoration-blue-400">{editingItem.name}</span></span>
                </div>
                <button
                  onClick={() => { setEditingItem(null); setIsRecording(false); }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-blue-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-white p-4 rounded-xl border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left space-y-0.5">
                  <p className="text-xs text-slate-500 font-semibold">
                    {isRecording ? '🎧 Listening to your keyboard... Press your new key combination now!' : 'Key captured:'}
                  </p>
                  <div className="flex items-center gap-2">
                    <kbd className="inline-block px-4 py-2 bg-slate-900 text-amber-400 rounded-xl font-mono text-base font-black shadow-inner tracking-wide border border-slate-700 animate-pulse">
                      {recordedKey || 'Press any Key (e.g. F3, Alt+W, Ctrl+J)...'}
                    </kbd>
                    {recordedKey !== editingItem.defaultKey && (
                      <span className="text-[11px] text-slate-500 font-medium">
                        (Default: {editingItem.defaultKey})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setRecordedKey(editingItem.defaultKey)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="Restore default key"
                  >
                    Reset to Default
                  </button>
                  <button
                    onClick={handleSaveCustomKey}
                    disabled={!recordedKey}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Keybinding</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {filteredShortcuts.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-white rounded-2xl border border-slate-200 p-8">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">No shortcuts found matching "{searchQuery}"</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                className="px-4 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredShortcuts.map((item) => {
                const isCustom = item.currentKey !== item.defaultKey;
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl border transition-all p-3 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs hover:border-blue-300 group ${
                      editingItem?.id === item.id ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/30' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 shrink-0 group-hover:bg-blue-50 transition-colors">
                        {renderIcon(item.iconName)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-xs truncate">
                            {item.name}
                          </h4>
                          {isCustom && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-black rounded border border-amber-300">
                              Custom
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Right side: Key badge & Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Current Key Combination Badge */}
                      <kbd 
                        onClick={() => handleStartEdit(item)}
                        className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs border shadow-2xs cursor-pointer select-none transition-all flex items-center gap-1 ${
                          isCustom 
                            ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100' 
                            : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200 hover:border-blue-400'
                        }`}
                        title="Click to edit shortcut key combination"
                      >
                        <span>{item.currentKey}</span>
                        <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </kbd>

                      {/* Quick Execute Button */}
                      <button
                        onClick={() => handleExecute(item)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 text-slate-600 hover:text-white border border-slate-200 transition-colors cursor-pointer"
                        title={`Open ${item.name} now`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-500">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Click any key combination to edit. All shortcuts are saved locally and persist across browser sessions.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleResetAll}
              className="sm:hidden px-3 py-1.5 text-slate-600 hover:text-slate-900 font-semibold"
            >
              Reset All
            </button>
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
            >
              Close Hub (Esc)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
