import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  RefreshCw, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Eye, 
  ShieldCheck, 
  Sparkles,
  Layers,
  Globe
} from 'lucide-react';

interface LiveAppPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRoute?: string;
}

export const LiveAppPreviewModal: React.FC<LiveAppPreviewModalProps> = ({
  isOpen,
  onClose,
  initialRoute = '/'
}) => {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [currentRoute, setCurrentRoute] = useState(initialRoute);
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);

  if (!isOpen) return null;

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey(Date.now());
  };

  const getContainerWidth = () => {
    switch (deviceMode) {
      case 'mobile':
        return 'w-[390px] h-[780px] rounded-[40px] border-[10px] border-slate-900 shadow-2xl';
      case 'tablet':
        return 'w-[768px] h-[850px] rounded-[28px] border-[8px] border-slate-900 shadow-2xl';
      case 'desktop':
      default:
        return 'w-full h-[85vh] rounded-2xl border border-slate-800 shadow-2xl';
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      {/* Top Controls Toolbar */}
      <div className="w-full max-w-7xl bg-slate-900/95 border border-slate-800 rounded-2xl px-4 py-3 text-white shadow-xl flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Live Application & CMS Preview</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active Server View
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Preview real-time changes instantly with multi-device responsive simulation
            </p>
          </div>
        </div>

        {/* Route Selector & Viewport Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Route Dropdown */}
          <select
            value={currentRoute}
            onChange={(e) => {
              setCurrentRoute(e.target.value);
              setIsLoading(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="/">Landing & Store Front (/)</option>
            <option value="/pos">POS Cashier Counter (/pos)</option>
            <option value="/dashboard">Analytics Dashboard (/dashboard)</option>
            <option value="/inventory">Inventory & Stock (/inventory)</option>
            <option value="/parties">Parties & Suppliers (/parties)</option>
            <option value="/reports">Reports & Sales (/reports)</option>
            <option value="/expenses">Expenses Manager (/expenses)</option>
          </select>

          {/* Viewport Toggles */}
          <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700 flex items-center gap-1">
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                deviceMode === 'desktop'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Desktop View"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Desktop</span>
            </button>
            <button
              onClick={() => setDeviceMode('tablet')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                deviceMode === 'tablet'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Tablet View"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Tablet</span>
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                deviceMode === 'mobile'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mobile View"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Mobile</span>
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
            title="Reload Preview Frame"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <a
            href={currentRoute}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            title="Open Live Preview in New Tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">New Tab</span>
          </a>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/50 hover:text-rose-300 text-slate-400 border border-slate-700 transition-all cursor-pointer"
            title="Close Preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 w-full max-w-7xl flex items-center justify-center overflow-auto p-1">
        <div className={`relative transition-all duration-300 bg-white overflow-hidden ${getContainerWidth()}`}>
          {isLoading && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-10 text-white gap-2 text-xs font-bold">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
              <span>Rendering Live Application Preview...</span>
            </div>
          )}
          <iframe
            key={iframeKey}
            src={currentRoute}
            title="Live Application Preview"
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
          />
        </div>
      </div>
    </div>
  );
};
