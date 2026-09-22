import React, { useState, useEffect } from 'react';
import { 
  X, Keyboard, Search, Sparkles, Printer, Save, Plus, 
  ArrowRight, Check, Zap, Layers, HelpCircle, ExternalLink,
  Copy, FileText, CheckCircle2, Sliders, ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface KeyboardShortcutsCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: 'sale' | 'purchase' | 'general';
}

interface ShortcutItem {
  id: string;
  category: 'Billing & POS' | 'Item Entry' | 'Save & Print' | 'Navigation' | 'Special Tools';
  keys: string[];
  action: string;
  description: string;
  example?: string;
  badge?: string;
}

const ALL_SHORTCUTS: ShortcutItem[] = [
  // Billing & POS
  {
    id: 'f1-party',
    category: 'Billing & POS',
    keys: ['F1'],
    action: 'Focus Customer / Supplier Search',
    description: 'Instantly places cursor in the customer or supplier name box. Type first 2 letters or phone number.',
    example: 'Press F1 -> Type "Adam" or "0313" -> Press Enter to select.',
    badge: 'Core Workflow'
  },
  {
    id: 'f2-rapid-item',
    category: 'Billing & POS',
    keys: ['F2'],
    action: 'Focus Rapid Medicine Search Bar',
    description: 'Jump directly to the rapid item search bar embedded in the table header to scan barcode or type medicine name.',
    example: 'Press F2 -> Type "Pana" -> Arrow Down -> Enter.',
    badge: 'Most Used'
  },
  {
    id: 'empty-enter-paid',
    category: 'Billing & POS',
    keys: ['Enter', '(on empty search)'],
    action: 'Jump to Paid / Received Amount',
    description: 'When finished adding all medicines, press Enter on the empty search box to immediately jump to the Paid/Received amount field.',
    example: 'Items finished -> Press Enter -> Cursor in Paid field -> Enter cash received.',
    badge: 'Fast Checkout'
  },
  {
    id: 'enter-on-paid-confirm',
    category: 'Billing & POS',
    keys: ['Enter', '(on Paid field)'],
    action: 'Open Save Confirmation & Commit',
    description: 'Pressing Enter on Paid Amount opens the Confirmation modal with "Confirm & Save" auto-focused. Hit Enter again to finalize in 0ms.',
    example: 'Paid: 1500 -> Press Enter -> Press Enter -> Bill Saved instantly!',
    badge: '1-Sec Save'
  },

  // Item Entry & Table
  {
    id: 'arrow-keys-nav',
    category: 'Item Entry',
    keys: ['↑', '↓'],
    action: 'Navigate Suggestions List',
    description: 'Move through medicine dropdown items, historical price matches, or batch lists.',
    example: 'Type "Augm" -> Press Down Arrow 2 times -> Hit Enter.'
  },
  {
    id: 'tab-next-field',
    category: 'Item Entry',
    keys: ['Tab', 'or', 'Enter'],
    action: 'Advance to Next Input Column',
    description: 'Move smoothly through Quantity -> Unit -> Unit Price -> Item Discount -> Add Row.',
    example: 'Qty: 2 -> Press Tab -> Price: 150 -> Press Enter to commit row.'
  },
  {
    id: 'esc-close-dropdown',
    category: 'Item Entry',
    keys: ['Esc'],
    action: 'Dismiss Dropdown / Cancel Action',
    description: 'Closes search suggestions, popups, or clears current cell focus without saving.',
    example: 'Press Esc to close customer or medicine search autocomplete.'
  },

  // Save & Print
  {
    id: 'ctrl-s-save',
    category: 'Save & Print',
    keys: ['Ctrl', 'S'],
    action: 'Quick Save Invoice / Bill',
    description: 'Directly saves the invoice/bill with background sync and zero lag.',
    example: 'Press Ctrl+S anywhere in the form to execute immediate save.',
    badge: 'Instant Save'
  },
  {
    id: 'ctrl-p-print',
    category: 'Save & Print',
    keys: ['Ctrl', 'P'],
    action: 'Save & Print Receipt',
    description: 'Saves the transaction and instantly generates print preview for 80mm thermal or A4 invoice.',
    example: 'Press Ctrl+P to dispense thermal receipt to patient immediately.'
  },
  {
    id: 'alt-n-save-new',
    category: 'Save & Print',
    keys: ['Alt', 'N'],
    action: 'Save & Start New Invoice',
    description: 'Saves current invoice and resets form to a fresh blank transaction ready for next customer in line.',
    example: 'Press Alt+N during rush hour for continuous rapid counter billing.'
  },
  {
    id: 'f8-f9-f10',
    category: 'Save & Print',
    keys: ['F8', 'F9', 'F10'],
    action: 'Function Keys Save Actions',
    description: 'F8 = Save & Print | F9 = Quick Save | F10 = Save & New.',
    example: 'Single key shortcuts for POS keyboards.'
  },

  // Navigation & Multi-Tab
  {
    id: 'ctrl-t-tab',
    category: 'Navigation',
    keys: ['Ctrl', 'T'],
    action: 'Open New Billing Tab',
    description: 'Create a new concurrent customer bill tab without losing current unsaved cart.',
    example: 'Hold Bill #1 for Customer A while serving Customer B in Tab #2.'
  },
  {
    id: 'ctrl-tab-cycle',
    category: 'Navigation',
    keys: ['Ctrl', 'Tab'],
    action: 'Switch Between Active Tabs',
    description: 'Cycle through open split-screen tabs and parking bills.',
    example: 'Press Ctrl+Tab or click tabs in header.'
  },
  {
    id: 'alt-c-calc',
    category: 'Navigation',
    keys: ['Alt', 'C'],
    action: 'Open POS Calculator',
    description: 'Launch embedded pharmacy dosage & money calculator.',
    example: 'Alt+C -> Quick math calculation -> Auto paste result.'
  },
  {
    id: 'f7-settings',
    category: 'Navigation',
    keys: ['F7'],
    action: 'Invoice Layout & Preferences Settings',
    description: 'Open invoice layout customizer to toggle HSN, Tax, Discount, Expiry and History popups.',
    example: 'Press F7 to configure columns.'
  },
  {
    id: 'f12-cheatsheet',
    category: 'Navigation',
    keys: ['F12', 'or', '?'],
    action: 'Open this Keyboard Shortcuts Cheat Sheet',
    description: 'Show this interactive shortcut guide anytime.',
    example: 'Press ? or F12 on any transaction screen.'
  },

  // Special Tools
  {
    id: 'f3-barcode',
    category: 'Special Tools',
    keys: ['F3'],
    action: 'Toggle Barcode Camera Scanner',
    description: 'Activate webcam/mobile camera for hands-free 1D/2D EAN barcode decoding.'
  },
  {
    id: 'f4-voice',
    category: 'Special Tools',
    keys: ['F4'],
    action: 'AI Voice Prescription Input',
    description: 'Dictate medicines (e.g. "Panadol 2 boxes and Flagyl 1 strip") hands-free.'
  }
];

export const KeyboardShortcutsCheatSheetModal: React.FC<KeyboardShortcutsCheatSheetModalProps> = ({
  isOpen,
  onClose,
  context = 'general'
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedShortcut, setCopiedShortcut] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = ['ALL', 'Billing & POS', 'Item Entry', 'Save & Print', 'Navigation', 'Special Tools'];

  const filteredShortcuts = ALL_SHORTCUTS.filter(item => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch = 
      item.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keys.join(' ').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.example && item.example.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleCopyAll = () => {
    const text = ALL_SHORTCUTS.map(s => `[${s.keys.join(' + ')}] : ${s.action} - ${s.description}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedShortcut('all');
    setTimeout(() => setCopiedShortcut(null), 2500);
  };

  return (
    <div 
      id="keyboard-shortcuts-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-slate-800">
        
        {/* Header */}
        <header className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Keyboard Shortcuts Cheat Sheet</h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-400/30">
                  Speed POS Mode
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Operate Sales, Billing & Purchases without touching the mouse
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAll}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-600 transition-colors cursor-pointer"
              title="Copy all shortcuts as plain text"
            >
              {copiedShortcut === 'all' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Cheat Sheet</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 10-Second Pure Keyboard Workflow Banner */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-emerald-50/50 border-b border-blue-100 p-3.5 px-5 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs font-black text-blue-900 mb-1.5 uppercase tracking-wide">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>10-Second Pure Keyboard Checkout Flow</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white/80 p-2 rounded-lg border border-blue-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-blue-600 block mb-0.5">STEP 1: SELECT PARTY</span>
              <p className="text-slate-700 text-[11px] font-medium leading-tight">
                Press <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold">F1</kbd> → type name/phone → <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold">Enter</kbd>
              </p>
            </div>

            <div className="bg-white/80 p-2 rounded-lg border border-blue-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-blue-600 block mb-0.5">STEP 2: ADD MEDICINE</span>
              <p className="text-slate-700 text-[11px] font-medium leading-tight">
                In search box → type name → <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold">↓</kbd> → <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold">Enter</kbd> → Qty → <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold">Enter</kbd>
              </p>
            </div>

            <div className="bg-white/80 p-2 rounded-lg border border-blue-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-blue-600 block mb-0.5">STEP 3: FINISH ITEMS</span>
              <p className="text-slate-700 text-[11px] font-medium leading-tight">
                On empty search box → press <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold">Enter</kbd> to jump to Paid Amount
              </p>
            </div>

            <div className="bg-white/80 p-2 rounded-lg border border-emerald-300 shadow-2xs bg-emerald-50/50">
              <span className="text-[10px] font-bold text-emerald-700 block mb-0.5">STEP 4: INSTANT COMMIT</span>
              <p className="text-slate-800 text-[11px] font-bold leading-tight">
                Type cash → press <kbd className="px-1 py-0.5 bg-emerald-100 border border-emerald-300 rounded text-[10px] font-bold">Enter</kbd> → <kbd className="px-1 py-0.5 bg-emerald-100 border border-emerald-300 rounded text-[10px] font-bold">Enter</kbd> to Save in 0ms
              </p>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search shortcut (e.g. Save, F2, Print)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Shortcuts List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredShortcuts.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Keyboard className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold">No shortcuts match "{searchQuery}"</p>
              <p className="text-xs text-slate-400 mt-1">Try searching for "F1", "Save", "Print", or "Enter"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredShortcuts.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.keys.map((key, kIdx) => (
                          <React.Fragment key={kIdx}>
                            {key === 'or' ? (
                              <span className="text-[11px] text-slate-400 font-medium px-0.5">or</span>
                            ) : key.startsWith('(') ? (
                              <span className="text-[10px] text-slate-500 font-semibold italic">{key}</span>
                            ) : (
                              <kbd className="px-2 py-1 bg-slate-100 group-hover:bg-blue-50 border border-slate-300 group-hover:border-blue-300 rounded-md text-xs font-black text-slate-800 shadow-2xs tracking-wide">
                                {key}
                              </kbd>
                            )}
                          </React.Fragment>
                        ))}
                      </div>

                      {item.badge && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.badge.includes('1-Sec') || item.badge.includes('Instant')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 mt-1">{item.action}</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{item.description}</p>
                  </div>

                  {item.example && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] text-slate-500">
                      <span className="font-bold text-slate-400">Ex:</span>
                      <span className="italic text-slate-600">{item.example}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Background Server Syncing is active — Billing never waits for network.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/settings?tab=DOCUMENTATION');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Full Software Documentation</span>
              <ExternalLink className="w-3 h-3 text-blue-500" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              Close
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
};
