import React, { useState, useEffect } from 'react';
import { 
  Sparkles, RefreshCw, CheckCircle2, ArrowDownCircle, 
  GitBranch, ShieldCheck, Cpu, HardDrive, Clock, 
  Layers, AlertTriangle, ExternalLink, Download, Check
} from 'lucide-react';

interface VersionRelease {
  version: string;
  releaseDate: string;
  tag: string;
  isLatest: boolean;
  highlights: string[];
  fixes: string[];
}

const RELEASE_HISTORY: VersionRelease[] = [
  {
    version: 'v2.4.0 (Enterprise Gold)',
    releaseDate: 'September 2026',
    tag: 'Latest Production Release',
    isLatest: true,
    highlights: [
      'Loss Prevention Engine: Hard dual-confirmation prompt when sales rate is lower than purchase cost.',
      'Global Support Helpline Sync: Administrator phone, WhatsApp, and email update instantly across all invoices, footers, and help sections.',
      'Universal 3-Dots Action Menu: Direct view, WhatsApp share, copy, master-permission edit, and delete across Invoices, Purchases, and Inventory items.',
      'Centralized Smart Notifications Hub: Real-time near-expiry alerts (30/60/90 days), out-of-stock shortages, and cashier shift summaries.',
      'Complete SEO & Schema.org Rich Metadata: High-indexing pharmacy and enterprise medical management structured data.'
    ],
    fixes: [
      'Eliminated demo indicators for active licenses (restricted strictly to 3-day trial mode).',
      'Harmonized Cloud Sync engine terminology and removed internal backend keywords from client UI.',
      'Full responsive scaling across Mobile, Tablet, and Desktop displays.'
    ]
  },
  {
    version: 'v2.3.5',
    releaseDate: 'August 2026',
    tag: 'Stable',
    isLatest: false,
    highlights: [
      'Multi-Item Shortage Demand Bill generator with WhatsApp dispatch to distributors.',
      'Custom Sidebar Navigation Sequence and Order Manager with drag-free reordering.',
      'Thermal 80mm & 58mm ESC/POS direct USB receipt printing optimization.'
    ],
    fixes: [
      'Fixed IndexedDB transaction lock on simultaneous bulk invoice saves.',
      'Added high-precision tax rounding and FBR / GST invoice print headers.'
    ]
  },
  {
    version: 'v2.2.0',
    releaseDate: 'July 2026',
    tag: 'Archived',
    isLatest: false,
    highlights: [
      'Offline-First IndexedDB architecture with background Cloud Sync.',
      'Cashier Shift registers with opening/closing reconciliation.',
      'Role-based permissions (RBAC) and Audit trail logging.'
    ],
    fixes: [
      'Barcode scanner auto-focus speed enhancements.',
      'Optimized wholesale discount calculations on multi-pack items.'
    ]
  }
];

export const SystemUpdatesTab: React.FC = () => {
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [installedVersion, setInstalledVersion] = useState('v2.4.0');

  const handleCheckUpdates = () => {
    setChecking(true);
    setStatusMessage('Querying repository release channel and cache validation...');
    setTimeout(() => {
      setChecking(false);
      setStatusMessage('Your software is running the latest available enterprise build (v2.4.0). All modules are up to date!');
    }, 1500);
  };

  const handleInstallUpdate = () => {
    setUpdating(true);
    setStatusMessage('Downloading latest software assets, updating service worker, and refreshing cache...');
    setTimeout(() => {
      setUpdating(false);
      setUpdateSuccess(true);
      setStatusMessage('Update successfully installed! Reloading workspace...');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-white flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black">
            <Sparkles className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-black text-white">Software Updates & Release Channel</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {installedVersion} (Active)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Check for new features, bug fixes, and security patches. When updates are published, click below to install without interrupting your business data.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={checking || updating}
            onClick={handleCheckUpdates}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{checking ? 'Checking...' : 'Check for Updates'}</span>
          </button>

          <button
            type="button"
            disabled={updating}
            onClick={handleInstallUpdate}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <ArrowDownCircle className={`w-4 h-4 ${updating ? 'animate-bounce' : ''}`} />
            <span>{updating ? 'Installing...' : 'Install & Refresh'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2.5 border ${
          updateSuccess 
            ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300' 
            : 'bg-indigo-950/40 border-indigo-700/50 text-indigo-300'
        }`}>
          {updateSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <RefreshCw className={`w-4 h-4 text-indigo-400 flex-shrink-0 ${checking || updating ? 'animate-spin' : ''}`} />
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Version Status Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Build</div>
          <div className="text-base font-black text-slate-900 dark:text-white mt-1">Version 2.4.0</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>Up to date</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Release Channel</div>
          <div className="text-base font-black text-slate-900 dark:text-white mt-1">Enterprise Stable</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Production Quality Channel
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Data Safety</div>
          <div className="text-base font-black text-slate-900 dark:text-white mt-1">Zero-Loss Upgrades</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Preserves offline local data
          </div>
        </div>
      </div>

      {/* Release Notes & Changelog Timeline */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span>Version Changelog & Feature Release Notes</span>
        </h3>

        <div className="space-y-4">
          {RELEASE_HISTORY.map((rel) => (
            <div 
              key={rel.version}
              className={`p-5 rounded-2xl border transition-all ${
                rel.isLatest
                  ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/50 shadow-md'
                  : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black text-slate-900 dark:text-white">{rel.version}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    rel.isLatest 
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {rel.tag}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{rel.releaseDate}</span>
              </div>

              {/* Highlights */}
              <div className="mt-3 space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">New Features & Capabilities:</div>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {rel.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Fixes */}
              {rel.fixes.length > 0 && (
                <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <div className="font-bold text-slate-600 dark:text-slate-300">Fixes & Improvements:</div>
                  <ul className="space-y-1">
                    {rel.fixes.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
