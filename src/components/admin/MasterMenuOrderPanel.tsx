import React, { useState, useEffect } from 'react';
import { 
  ArrowUp, ArrowDown, CheckCircle2, RotateCcw, Save, 
  Menu, Eye, EyeOff, LayoutGrid, Sparkles, Shield, AlertCircle
} from 'lucide-react';
import { 
  MenuItemConfig, getSidebarMenuConfig, saveSidebarMenuConfig, 
  resetSidebarMenuConfig, DEFAULT_SIDEBAR_MENUS 
} from '../../lib/masterServerService';

interface MasterMenuOrderPanelProps {
  onNotify?: (msg: string) => void;
}

export const MasterMenuOrderPanel: React.FC<MasterMenuOrderPanelProps> = ({ onNotify }) => {
  const [menus, setMenus] = useState<MenuItemConfig[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setMenus(getSidebarMenuConfig());
  }, []);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...menus];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setMenus(updated);
    setHasChanges(true);
  };

  const handleMoveDown = (index: number) => {
    if (index === menus.length - 1) return;
    const updated = [...menus];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setMenus(updated);
    setHasChanges(true);
  };

  const handleToggleEnabled = (id: string) => {
    const updated = menus.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m);
    setMenus(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSidebarMenuConfig(menus);
    setHasChanges(false);
    if (onNotify) {
      onNotify('Sidebar navigation order & visibility saved to server!');
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset sidebar menu sequence to factory default order?')) {
      const reset = resetSidebarMenuConfig();
      setMenus(reset);
      setHasChanges(false);
      if (onNotify) {
        onNotify('Sidebar navigation reset to default order.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Central Sidebar Menu Sequence & Hierarchy</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                  Server Controlled
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Re-order sidebar menus Up / Down or toggle visibility. Changes immediately apply to client navigation layouts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
              hasChanges
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 animate-pulse'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Save Sequence Order</span>
          </button>
        </div>
      </div>

      {/* Menu Sequence List */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/80">
        {menus.map((item, index) => (
          <div 
            key={item.id} 
            className="p-3.5 sm:p-4 hover:bg-slate-900/60 flex items-center justify-between gap-4 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              {/* Position Number */}
              <div className="w-7 h-7 rounded-lg bg-slate-800 text-indigo-400 font-mono font-black text-xs flex items-center justify-center border border-slate-700">
                #{index + 1}
              </div>

              {/* Menu Details */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{item.label}</span>
                  {item.urduLabel && (
                    <span className="text-xs text-indigo-300 font-normal">({item.urduLabel})</span>
                  )}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {item.path}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Module Key: <strong className="text-slate-300">{item.moduleKey}</strong>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Up Button */}
              <button
                type="button"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer border border-slate-700"
                title="Move Up"
              >
                <ArrowUp className="w-4 h-4" />
              </button>

              {/* Down Button */}
              <button
                type="button"
                onClick={() => handleMoveDown(index)}
                disabled={index === menus.length - 1}
                className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer border border-slate-700"
                title="Move Down"
              >
                <ArrowDown className="w-4 h-4" />
              </button>

              {/* Enabled / Disabled Toggle */}
              <button
                type="button"
                onClick={() => handleToggleEnabled(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                  item.enabled
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/50'
                    : 'bg-rose-950/40 text-rose-300 border-rose-700/50 hover:bg-rose-900/50'
                }`}
              >
                {item.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{item.enabled ? 'Visible' : 'Hidden'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
