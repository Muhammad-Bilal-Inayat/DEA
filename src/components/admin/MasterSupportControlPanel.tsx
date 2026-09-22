import React, { useState, useEffect } from 'react';
import { 
  Phone, MessageSquare, Mail, Clock, FileText, 
  Save, RotateCcw, CheckCircle2, Shield, Sparkles, 
  AlertCircle, ExternalLink, Trash2, Power
} from 'lucide-react';
import { 
  MasterSupportConfig, getMasterSupportConfig, 
  saveMasterSupportConfig, resetMasterSupportConfig 
} from '../../lib/masterServerService';

interface MasterSupportControlPanelProps {
  onNotify?: (msg: string) => void;
}

export const MasterSupportControlPanel: React.FC<MasterSupportControlPanelProps> = ({ onNotify }) => {
  const [config, setConfig] = useState<MasterSupportConfig>(getMasterSupportConfig());
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setConfig(getMasterSupportConfig());
  }, []);

  const handleSave = () => {
    saveMasterSupportConfig(config);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    if (onNotify) {
      onNotify('Master Central Helpline & Support contact synced across the entire software!');
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset support helpline contact to default system settings?')) {
      const reset = resetMasterSupportConfig();
      setConfig(reset);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      if (onNotify) {
        onNotify('Support helpline reset to default settings.');
      }
    }
  };

  const handleClear = () => {
    if (window.confirm('Remove all support contact details?')) {
      const cleared: MasterSupportConfig = {
        phone: '',
        whatsappNumber: '',
        email: '',
        supportHours: '',
        supportNote: '',
        enabled: false
      };
      setConfig(cleared);
      saveMasterSupportConfig(cleared);
      if (onNotify) {
        onNotify('Support contact information cleared and disabled.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white">Central Support & Helpline Manager</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                Global Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Add, edit, or remove your central support phone, WhatsApp, and helpline. Automatically reflects in invoices, footers, and help sections across all users.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-2 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Contact</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save & Sync Globally</span>
          </button>
        </div>
      </div>

      {isSaved && (
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-700/50 rounded-xl flex items-center gap-2 text-emerald-300 text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Support helpline settings successfully broadcasted to entire software ecosystem!</span>
        </div>
      )}

      {/* Main Configuration Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Column: Phone & WhatsApp */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Contact Numbers</span>
            </h4>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-slate-400">Show Helpline</span>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Direct Phone / Call Helpline Number:
            </label>
            <input
              type="text"
              value={config.phone}
              onChange={(e) => setConfig({ ...config, phone: e.target.value })}
              placeholder="+92 300 1234567"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Displayed for direct phone calls in header, footer & invoice footers.</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Official Support WhatsApp Number (with country code):
            </label>
            <input
              type="text"
              value={config.whatsappNumber}
              onChange={(e) => setConfig({ ...config, whatsappNumber: e.target.value.replace(/[^0-9]/g, '') })}
              placeholder="923001234567"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-slate-400">Numbers only (e.g. 923001234567 for Pakistan).</span>
              {config.whatsappNumber && (
                <a
                  href={`https://wa.me/${config.whatsappNumber}?text=Hello%20Support%20Team`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <span>Test Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Support Email Address:
            </label>
            <input
              type="email"
              value={config.email}
              onChange={(e) => setConfig({ ...config, email: e.target.value })}
              placeholder="support@mbiinventra.com"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Right Column: Timing & Custom Note */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Hours & Help Instructions</span>
          </h4>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Support Availability Hours:
            </label>
            <input
              type="text"
              value={config.supportHours}
              onChange={(e) => setConfig({ ...config, supportHours: e.target.value })}
              placeholder="24/7 Priority Helpline or Mon-Sat 9AM-10PM"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Custom Support Banner Note:
            </label>
            <textarea
              rows={3}
              value={config.supportNote}
              onChange={(e) => setConfig({ ...config, supportNote: e.target.value })}
              placeholder="Enter special assistance instructions or software activation notes..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Live Preview Card */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Live Client Preview</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Helpline:</span>
                <strong className="text-white">{config.phone || 'Disabled'}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">WhatsApp:</span>
                <strong className="text-emerald-400">{config.whatsappNumber ? `+${config.whatsappNumber}` : 'Disabled'}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Hours:</span>
                <span>{config.supportHours || '24/7'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
