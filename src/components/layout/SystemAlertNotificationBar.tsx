import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, ShieldAlert, Clock, ChevronDown, ChevronUp, 
  X, ArrowRight, Package, RefreshCw, AlertCircle, ShoppingCart
} from 'lucide-react';
import { dbMedicines } from '../../lib/db';
import { Medicine } from '../../types';

interface SystemAlertSummary {
  outOfStock: Medicine[];
  lowStock: Medicine[];
  expired: Medicine[];
  nearExpiry: Medicine[];
}

export const SystemAlertNotificationBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [alerts, setAlerts] = useState<SystemAlertSummary>({
    outOfStock: [],
    lowStock: [],
    expired: [],
    nearExpiry: []
  });
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Strictly hide notification bar from public-facing or trial setup interfaces
  const isPublicOrSetupRoute = useMemo(() => {
    const path = location.pathname.toLowerCase();
    return (
      path.startsWith('/store') ||
      path === '/login' ||
      path === '/register' ||
      path === '/setup' ||
      path === '/master'
    );
  }, [location.pathname]);

  // Load and calculate near-expiry and reorder-threshold alerts
  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      const medicines = await dbMedicines.getAll().catch(() => [] as Medicine[]);
      
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const in30Days = new Date(now);
      in30Days.setDate(now.getDate() + 30);

      const outOfStock: Medicine[] = [];
      const lowStock: Medicine[] = [];
      const expired: Medicine[] = [];
      const nearExpiry: Medicine[] = [];

      medicines.forEach((med) => {
        const qty = Number(med.quantity) || 0;
        const threshold = Number(med.lowStockThreshold || med.minStock || 10);

        // 1. Stock Threshold Checks
        if (qty <= 0) {
          outOfStock.push(med);
        } else if (qty <= threshold) {
          lowStock.push(med);
        }

        // 2. Expiry Checks
        if (med.expiryDate) {
          const expDate = new Date(med.expiryDate);
          if (!isNaN(expDate.getTime())) {
            expDate.setHours(0, 0, 0, 0);
            if (expDate < now) {
              expired.push(med);
            } else if (expDate <= in30Days) {
              nearExpiry.push(med);
            }
          }
        }
      });

      setAlerts({
        outOfStock,
        lowStock,
        expired,
        nearExpiry
      });
    } catch (err) {
      console.error('Failed to load system alert bar data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isPublicOrSetupRoute) return;

    loadAlerts();

    const handleDataChange = () => loadAlerts();
    window.addEventListener('mbi-local-db-change', handleDataChange);
    window.addEventListener('storage', handleDataChange);
    window.addEventListener('focus', handleDataChange);

    const interval = setInterval(loadAlerts, 40000);

    return () => {
      window.removeEventListener('mbi-local-db-change', handleDataChange);
      window.removeEventListener('storage', handleDataChange);
      window.removeEventListener('focus', handleDataChange);
      clearInterval(interval);
    };
  }, [isPublicOrSetupRoute]);

  const totalStockAlerts = alerts.outOfStock.length + alerts.lowStock.length;
  const totalExpiryAlerts = alerts.expired.length + alerts.nearExpiry.length;
  const totalAlerts = totalStockAlerts + totalExpiryAlerts;

  // Don't render on public store or setup, when dismissed, or when 0 alerts
  if (isPublicOrSetupRoute || isDismissed || totalAlerts === 0) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 dark:from-amber-950/40 dark:via-rose-950/40 dark:to-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/60 text-slate-800 dark:text-slate-200 text-xs transition-all shadow-2xs relative z-10">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-3 py-0.5">
        <div className="flex items-center justify-between gap-1.5 min-h-[26px]">
          {/* Left: Compact Ticker */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 shrink-0 px-1.5 py-0.2 rounded bg-amber-500/20 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 font-bold text-[9.5px] uppercase tracking-wider">
              {alerts.outOfStock.length > 0 || alerts.expired.length > 0 ? (
                <ShieldAlert className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400 animate-pulse" />
              ) : (
                <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
              )}
              <span className="hidden xs:inline">Alerts</span>
            </div>

            <div className="flex items-center gap-1 text-[10px] font-semibold shrink-0 flex-wrap">
              {alerts.outOfStock.length > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold text-[9.5px] flex items-center gap-1 shrink-0">
                  <span>{alerts.outOfStock.length} Out of Stock</span>
                </span>
              )}

              {alerts.lowStock.length > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 dark:bg-amber-500/30 text-amber-800 dark:text-amber-200 font-bold text-[9.5px] flex items-center gap-1 shrink-0">
                  <span>{alerts.lowStock.length} Low Stock</span>
                </span>
              )}

              {alerts.expired.length > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-rose-500/20 dark:bg-rose-500/30 text-rose-700 dark:text-rose-300 font-bold text-[9.5px] flex items-center gap-1 shrink-0">
                  <span>{alerts.expired.length} Expired</span>
                </span>
              )}

              {alerts.nearExpiry.length > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-orange-500/20 dark:bg-orange-500/30 text-orange-800 dark:text-orange-200 font-bold text-[9.5px] hidden sm:flex items-center gap-1 shrink-0">
                  <span>{alerts.nearExpiry.length} Near Expiry (&lt;30d)</span>
                </span>
              )}
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-1 shrink-0">
            {totalStockAlerts > 0 && (
              <button
                type="button"
                onClick={() => navigate('/shortage-registry')}
                className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9.5px] shadow-2xs transition-colors cursor-pointer"
                title="View shortage registry and restock"
              >
                <ShoppingCart className="w-2.5 h-2.5" />
                <span>Restock</span>
              </button>
            )}

            {totalExpiryAlerts > 0 && (
              <button
                type="button"
                onClick={() => navigate('/items?tab=expiry')}
                className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[9.5px] shadow-2xs transition-colors cursor-pointer"
                title="Review expiring batches"
              >
                <Clock className="w-2.5 h-2.5" />
                <span>Expiry</span>
              </button>
            )}

            {/* Expand / Collapse Details Drawer */}
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              className="px-1 py-0.2 rounded text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-0.5 text-[9.5px] font-semibold cursor-pointer"
              title={isExpanded ? 'Collapse Alert Breakdown' : 'Expand Alert Details'}
            >
              <span className="hidden sm:inline">{isExpanded ? 'Hide' : 'Details'}</span>
              {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>

            {/* Dismiss Bar */}
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
              title="Dismiss Alert Bar"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Expandable Breakdown Drawer */}
        {isExpanded && (
          <div className="mt-1.5 pt-1.5 border-t border-amber-200/80 dark:border-amber-900/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Out of Stock Box */}
            <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-900/50 shadow-2xs">
              <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 font-bold mb-1">
                <span className="flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Out of Stock</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950/80 rounded-full font-black">
                  {alerts.outOfStock.length}
                </span>
              </div>
              <div className="text-[11px] space-y-0.5 max-h-20 overflow-y-auto custom-scrollbar">
                {alerts.outOfStock.length === 0 ? (
                  <p className="text-slate-400 italic">No zero-stock items</p>
                ) : (
                  alerts.outOfStock.slice(0, 5).map(m => (
                    <div key={m.id} className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                      <span className="truncate pr-1 font-medium">{m.name}</span>
                      <span className="text-rose-600 font-bold shrink-0">0 left</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Low Stock / Below Reorder Threshold Box */}
            <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900/50 shadow-2xs">
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold mb-1">
                <span className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />
                  <span>Low Stock (Reorder)</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/80 rounded-full font-black">
                  {alerts.lowStock.length}
                </span>
              </div>
              <div className="text-[11px] space-y-0.5 max-h-20 overflow-y-auto custom-scrollbar">
                {alerts.lowStock.length === 0 ? (
                  <p className="text-slate-400 italic">No items below threshold</p>
                ) : (
                  alerts.lowStock.slice(0, 5).map(m => (
                    <div key={m.id} className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                      <span className="truncate pr-1 font-medium">{m.name}</span>
                      <span className="text-amber-600 font-bold shrink-0">{m.quantity} / min {m.lowStockThreshold || 10}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Expired Batches Box */}
            <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-900/50 shadow-2xs">
              <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 font-bold mb-1">
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Expired Batches</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950/80 rounded-full font-black">
                  {alerts.expired.length}
                </span>
              </div>
              <div className="text-[11px] space-y-0.5 max-h-20 overflow-y-auto custom-scrollbar">
                {alerts.expired.length === 0 ? (
                  <p className="text-slate-400 italic">No expired batches</p>
                ) : (
                  alerts.expired.slice(0, 5).map(m => (
                    <div key={m.id} className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                      <span className="truncate pr-1 font-medium">{m.name}</span>
                      <span className="text-rose-600 font-bold shrink-0">{m.expiryDate}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Expiring Soon (<30 Days) Box */}
            <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900/50 shadow-2xs">
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold mb-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Expiring in &lt;30 Days</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/80 rounded-full font-black">
                  {alerts.nearExpiry.length}
                </span>
              </div>
              <div className="text-[11px] space-y-0.5 max-h-20 overflow-y-auto custom-scrollbar">
                {alerts.nearExpiry.length === 0 ? (
                  <p className="text-slate-400 italic">No batches near expiry</p>
                ) : (
                  alerts.nearExpiry.slice(0, 5).map(m => (
                    <div key={m.id} className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                      <span className="truncate pr-1 font-medium">{m.name}</span>
                      <span className="text-amber-600 font-bold shrink-0">{m.expiryDate}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
