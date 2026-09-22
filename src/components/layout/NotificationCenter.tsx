import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, CheckCheck, Check, Trash2, RefreshCw, 
  AlertTriangle, Info, X, Volume2, VolumeX, Package, 
  CreditCard, Clock, CheckCircle2, ShieldAlert, ArrowRight
} from 'lucide-react';
import { dbMedicines, dbSuppliers, dbInvoices, dbCashierShifts, getCurrentBusinessContext } from '../../lib/db';
import { getLastLocalBackupTime } from '../../lib/licenseManager';
import { Medicine, Supplier, Invoice } from '../../types';

export type NotificationType = 'stock' | 'expiry' | 'due' | 'shift' | 'system' | 'sales';
export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface AppNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  description: string;
  time: string;
  timestamp: number;
  unread: boolean;
  link: string;
  actionLabel?: string;
  meta?: {
    medicineId?: string;
    supplierId?: string;
    invoiceId?: string;
    amount?: number;
    batchNumber?: string;
    stock?: number;
  };
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

// Sound chime generator using browser Web Audio API
export const playNotificationChime = (severity: NotificationSeverity = 'info') => {
  try {
    const isSoundEnabled = localStorage.getItem('mbi_notification_sound') !== 'false';
    if (!isSoundEnabled) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (severity === 'critical') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // Audio context may be blocked prior to user interaction
  }
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange
}) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'stock' | 'dues' | 'system'>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('mbi_notification_sound') !== 'false');

  // Toggle audio notification sound
  const handleToggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('mbi_notification_sound', nextVal ? 'true' : 'false');
    if (nextVal) {
      playNotificationChime('info');
    }
  };

  // Click outside and Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const bellBtn = (event.target as HTMLElement)?.closest('[data-notification-trigger="true"]');
        if (!bellBtn) {
          onClose();
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const getTenantNotificationKeys = () => {
    const ctx = getCurrentBusinessContext();
    const tid = ctx.tenantId || 'default';
    return {
      readKey: `mbi_read_notifications_${tid}`,
      dismissedKey: `mbi_dismissed_notifications_${tid}`
    };
  };

  // Load live notifications from database
  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const { readKey, dismissedKey } = getTenantNotificationKeys();
      let readIds = new Set<string>();
      let dismissedIds = new Set<string>();
      try {
        const storedRead = localStorage.getItem(readKey) || localStorage.getItem('mbi_read_notifications');
        if (storedRead) readIds = new Set(JSON.parse(storedRead));
        const storedDismissed = localStorage.getItem(dismissedKey) || localStorage.getItem('mbi_dismissed_notifications');
        if (storedDismissed) dismissedIds = new Set(JSON.parse(storedDismissed));
      } catch {}

      const generated: AppNotification[] = [];
      const now = Date.now();

      // Fetch real data
      const [medicines, suppliers, invoices, activeShift] = await Promise.all([
        dbMedicines.getAll().catch(() => [] as Medicine[]),
        dbSuppliers.getAll().catch(() => [] as Supplier[]),
        dbInvoices.getAll().catch(() => [] as Invoice[]),
        dbCashierShifts.getActiveShift().catch(() => null)
      ]);

      // --- 1. REORDER THRESHOLD & STOCK ALERTS ---
      const outOfStockItems = medicines.filter(m => (Number(m.quantity) || 0) <= 0);
      const lowStockItems = medicines.filter(m => {
        const qty = Number(m.quantity) || 0;
        const thresh = Number(m.lowStockThreshold || m.minStock || 10);
        return qty > 0 && qty <= thresh;
      });

      if (outOfStockItems.length > 0) {
        const id = `stock-out-${outOfStockItems.length}-${outOfStockItems[0]?.id || '0'}`;
        if (!dismissedIds.has(id)) {
          const names = outOfStockItems.slice(0, 2).map(m => m.name).join(', ');
          const extra = outOfStockItems.length > 2 ? ` +${outOfStockItems.length - 2} more` : '';
          generated.push({
            id,
            type: 'stock',
            severity: 'critical',
            title: `${outOfStockItems.length} Products Out of Stock!`,
            description: `${names}${extra} are at 0 stock. Urgent reorder required.`,
            time: 'Live Alert',
            timestamp: now,
            unread: !readIds.has(id),
            link: '/shortage-registry',
            actionLabel: 'Restock via PO'
          });
        }
      }

      if (lowStockItems.length > 0) {
        const id = `stock-low-${lowStockItems.length}-${lowStockItems[0]?.id || '0'}`;
        if (!dismissedIds.has(id)) {
          const names = lowStockItems.slice(0, 2).map(m => `${m.name} (${m.quantity} left)`).join(', ');
          const extra = lowStockItems.length > 2 ? ` +${lowStockItems.length - 2} items` : '';
          generated.push({
            id,
            type: 'stock',
            severity: 'warning',
            title: `${lowStockItems.length} Low Stock / Reorder Alerts`,
            description: `${names}${extra} are at or below minimum reorder threshold.`,
            time: 'Stock Alert',
            timestamp: now - 1000 * 60 * 10,
            unread: !readIds.has(id),
            link: '/items',
            actionLabel: 'View Items'
          });
        }
      }

      // --- 2. BATCH EXPIRY & NEAR-EXPIRY ALERTS ---
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);

      const in30Days = new Date(todayDate);
      in30Days.setDate(todayDate.getDate() + 30);

      const expiredMedicines: Medicine[] = [];
      const nearExpiryMedicines: Medicine[] = [];

      medicines.forEach(m => {
        if (!m.expiryDate) return;
        const exp = new Date(m.expiryDate);
        if (isNaN(exp.getTime())) return;
        exp.setHours(0, 0, 0, 0);

        if (exp < todayDate) {
          expiredMedicines.push(m);
        } else if (exp <= in30Days) {
          nearExpiryMedicines.push(m);
        }
      });

      if (expiredMedicines.length > 0) {
        const id = `exp-expired-${expiredMedicines.length}-${expiredMedicines[0]?.id || '0'}`;
        if (!dismissedIds.has(id)) {
          const sample = expiredMedicines.slice(0, 2).map(m => `${m.name} (Batch ${m.batchNumber || 'N/A'})`).join(', ');
          generated.push({
            id,
            type: 'expiry',
            severity: 'critical',
            title: `${expiredMedicines.length} Expired Batch Alert!`,
            description: `${sample} expired. Quarantine immediately to prevent sale.`,
            time: 'Quarantine Needed',
            timestamp: now - 1000 * 60 * 20,
            unread: !readIds.has(id),
            link: '/items?tab=expiry',
            actionLabel: 'Quarantine'
          });
        }
      }

      if (nearExpiryMedicines.length > 0) {
        const id = `exp-near-${nearExpiryMedicines.length}-${nearExpiryMedicines[0]?.id || '0'}`;
        if (!dismissedIds.has(id)) {
          const sample = nearExpiryMedicines.slice(0, 2).map(m => m.name).join(', ');
          const extra = nearExpiryMedicines.length > 2 ? ` +${nearExpiryMedicines.length - 2} more` : '';
          generated.push({
            id,
            type: 'expiry',
            severity: 'warning',
            title: `${nearExpiryMedicines.length} Expiring in <30 Days`,
            description: `${sample}${extra} near expiration. Apply discount or return.`,
            time: '<30 Days Left',
            timestamp: now - 1000 * 60 * 45,
            unread: !readIds.has(id),
            link: '/items?tab=expiry',
            actionLabel: 'Review Expiries'
          });
        }
      }

      // --- 3. SUPPLIER PAYMENT DUES ---
      const suppliersWithDues = suppliers.filter(s => (Number(s.balance) || 0) > 0);
      if (suppliersWithDues.length > 0) {
        const totalDue = suppliersWithDues.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);
        const id = `due-suppliers-${suppliersWithDues.length}-${Math.round(totalDue)}`;
        if (!dismissedIds.has(id)) {
          const topSupplier = suppliersWithDues[0];
          generated.push({
            id,
            type: 'due',
            severity: 'warning',
            title: `Supplier Dues: Rs ${Math.round(totalDue).toLocaleString()}`,
            description: `${suppliersWithDues.length} suppliers pending (e.g. ${topSupplier.name} Rs ${(topSupplier.balance || 0).toLocaleString()}).`,
            time: 'Payables Due',
            timestamp: now - 1000 * 60 * 90,
            unread: !readIds.has(id),
            link: '/parties?type=supplier',
            actionLabel: 'Pay Supplier'
          });
        }
      }

      // --- 4. CUSTOMER RECEIVABLES ---
      const creditInvoices = invoices.filter(inv => (Number(inv.balanceDue) || 0) > 0);
      if (creditInvoices.length > 0) {
        const totalReceivable = creditInvoices.reduce((sum, inv) => sum + (Number(inv.balanceDue) || 0), 0);
        const id = `due-customer-${creditInvoices.length}-${Math.round(totalReceivable)}`;
        if (!dismissedIds.has(id)) {
          const sample = creditInvoices[0];
          generated.push({
            id,
            type: 'due',
            severity: 'info',
            title: `Customer Dues: Rs ${Math.round(totalReceivable).toLocaleString()}`,
            description: `${creditInvoices.length} credit invoices pending (Latest: ${sample.customerName || 'Customer'} #${sample.invoiceNumber || 'INV'}).`,
            time: 'Receivable',
            timestamp: now - 1000 * 60 * 120,
            unread: !readIds.has(id),
            link: '/sale/invoices',
            actionLabel: 'View Invoices'
          });
        }
      }

      // --- 5. CASHIER SHIFT NOTIFICATION ---
      if (activeShift) {
        const id = `shift-active-${activeShift.id}`;
        if (!dismissedIds.has(id)) {
          generated.push({
            id,
            type: 'shift',
            severity: 'info',
            title: `Cashier Shift ${activeShift.shiftNumber} Active`,
            description: `Shift by ${activeShift.cashierName || 'Cashier'}. Expected cash: Rs ${(activeShift.expectedCash || 0).toLocaleString()}.`,
            time: 'Shift Active',
            timestamp: now - 1000 * 60 * 180,
            unread: !readIds.has(id),
            link: '/reports?report=day_book',
            actionLabel: 'Day Book'
          });
        }
      }

      // --- 6. BACKUP & SYSTEM STATUS ---
      const lastBackup = getLastLocalBackupTime();
      const lastBackupDate = lastBackup ? new Date(lastBackup).getTime() : 0;
      const hoursSinceBackup = (now - lastBackupDate) / (1000 * 60 * 60);

      if (!lastBackup || hoursSinceBackup > 24) {
        const id = 'system-backup-reminder';
        if (!dismissedIds.has(id)) {
          generated.push({
            id,
            type: 'system',
            severity: 'info',
            title: 'Backup Recommended',
            description: lastBackup 
              ? `Last local snapshot was taken ${Math.round(hoursSinceBackup)} hours ago.`
              : 'Export an offline JSON backup to safeguard records.',
            time: 'Routine Safety',
            timestamp: now - 1000 * 60 * 240,
            unread: !readIds.has(id),
            link: '/sync-share',
            actionLabel: 'Backup'
          });
        }
      }

      // Default All Clear when no pending alerts
      if (generated.length === 0) {
        const id = 'system-all-clear';
        if (!dismissedIds.has(id)) {
          generated.push({
            id,
            type: 'system',
            severity: 'success',
            title: 'All Systems Normal',
            description: 'Inventory levels, batch expiries, and accounts are up to date.',
            time: 'Just now',
            timestamp: now,
            unread: !readIds.has(id),
            link: '/dashboard',
            actionLabel: 'Dashboard'
          });
        }
      }

      // Sort: critical first, then unread, then recent
      generated.sort((a, b) => {
        if (a.severity === 'critical' && b.severity !== 'critical') return -1;
        if (b.severity === 'critical' && a.severity !== 'critical') return 1;
        if (a.unread && !b.unread) return -1;
        if (!a.unread && b.unread) return 1;
        return b.timestamp - a.timestamp;
      });

      setNotifications(generated);

      const unreadTotal = generated.filter(n => n.unread).length;
      if (onUnreadCountChange) {
        onUnreadCountChange(unreadTotal);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    const handleDataChange = () => loadNotifications();
    window.addEventListener('mbi-local-db-change', handleDataChange);
    window.addEventListener('storage', handleDataChange);
    window.addEventListener('focus', handleDataChange);

    const interval = setInterval(loadNotifications, 45000);

    return () => {
      window.removeEventListener('mbi-local-db-change', handleDataChange);
      window.removeEventListener('storage', handleDataChange);
      window.removeEventListener('focus', handleDataChange);
      clearInterval(interval);
    };
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => n.unread).length, [notifications]);

  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  const toggleItemRead = (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    const { readKey } = getTenantNotificationKeys();
    setNotifications(prev => {
      const updated = prev.map(n => n.id === notifId ? { ...n, unread: !n.unread } : n);
      try {
        const readIds = updated.filter(n => !n.unread).map(n => n.id);
        localStorage.setItem(readKey, JSON.stringify(readIds));
      } catch {}
      return updated;
    });
  };

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { readKey } = getTenantNotificationKeys();
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, unread: false }));
      try {
        const allIds = updated.map(n => n.id);
        localStorage.setItem(readKey, JSON.stringify(allIds));
      } catch {}
      return updated;
    });
  };

  const handleDismissNotification = (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    const { dismissedKey } = getTenantNotificationKeys();
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notifId);
      try {
        let dismissedIds: string[] = [];
        const stored = localStorage.getItem(dismissedKey);
        if (stored) dismissedIds = JSON.parse(stored);
        if (!dismissedIds.includes(notifId)) {
          dismissedIds.push(notifId);
          localStorage.setItem(dismissedKey, JSON.stringify(dismissedIds));
        }
      } catch {}
      return updated;
    });
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { dismissedKey } = getTenantNotificationKeys();
    const idsToDismiss = notifications.map(n => n.id);
    setNotifications([]);
    try {
      let dismissedIds: string[] = [];
      const stored = localStorage.getItem(dismissedKey);
      if (stored) dismissedIds = JSON.parse(stored);
      const combined = Array.from(new Set([...dismissedIds, ...idsToDismiss]));
      localStorage.setItem(dismissedKey, JSON.stringify(combined));
    } catch {}
  };

  const handleNotificationClick = (notif: AppNotification) => {
    const { readKey } = getTenantNotificationKeys();
    setNotifications(prev => {
      const updated = prev.map(n => n.id === notif.id ? { ...n, unread: false } : n);
      try {
        const readIds = updated.filter(n => !n.unread).map(n => n.id);
        localStorage.setItem(readKey, JSON.stringify(readIds));
      } catch {}
      return updated;
    });

    onClose();

    if (notif.link) {
      navigate(notif.link);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (activeTab === 'unread') return n.unread;
      if (activeTab === 'stock') return n.type === 'stock' || n.type === 'expiry';
      if (activeTab === 'dues') return n.type === 'due';
      if (activeTab === 'system') return n.type === 'system' || n.type === 'shift';
      return true;
    });
  }, [notifications, activeTab]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/20 z-[9998]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Compact Notification Dropdown Container */}
      <div 
        ref={containerRef}
        className="fixed left-2 right-2 top-14 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1 w-auto sm:w-[340px] max-w-[calc(100vw-1rem)] sm:max-w-[340px] bg-white dark:bg-[#0f172a] rounded-2xl sm:rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[82vh] sm:max-h-[min(380px,calc(100vh-5rem))]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Notification Center"
      >
        {/* Compact Header */}
        <div className="p-2.5 bg-slate-900 text-white flex flex-col gap-1.5 shrink-0 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Alerts & Notifications</span>
              {unreadCount > 0 ? (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-black rounded-full shadow-2xs">
                  {unreadCount}
                </span>
              ) : (
                <span className="px-1 py-0.2 bg-emerald-500/30 text-emerald-300 text-[9px] font-medium rounded-full">
                  All clear
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={handleToggleSound}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  soundEnabled ? 'text-blue-300 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-300'
                }`}
                title={soundEnabled ? 'Mute Alert Sound' : 'Enable Alert Sound'}
              >
                {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              </button>

              {/* Refresh */}
              <button
                type="button"
                onClick={() => loadNotifications()}
                className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Refresh alerts"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sub Header Quick Actions */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
            <span className="text-slate-400">
              {notifications.length} alerts • {unreadCount} unread
            </span>
            <div className="flex items-center gap-2.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-blue-300 hover:text-white font-medium transition flex items-center gap-0.5 cursor-pointer"
                >
                  <CheckCheck className="w-2.5 h-2.5" />
                  <span>Mark read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-slate-400 hover:text-rose-300 transition flex items-center gap-0.5 cursor-pointer"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Compact Tabs Bar */}
        <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-[10px] overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-2 py-0.5 rounded-md font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('unread')}
            className={`px-2 py-0.5 rounded-md font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
              activeTab === 'unread'
                ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[8px] flex items-center justify-center font-black">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`px-2 py-0.5 rounded-md font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'stock'
                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
            }`}
          >
            Stock & Expiry
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dues')}
            className={`px-2 py-0.5 rounded-md font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'dues'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
            }`}
          >
            Dues
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`px-2 py-0.5 rounded-md font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'system'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
            }`}
          >
            System
          </button>
        </div>

        {/* Scrollable Alerts Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 custom-scrollbar overscroll-contain bg-slate-50/30 dark:bg-slate-900/30 max-h-[300px]">
          {filteredNotifications.length === 0 ? (
            <div className="py-8 px-3 text-center flex flex-col items-center justify-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {activeTab === 'unread' ? 'No unread alerts' : 'No alerts in this category'}
              </p>
              <p className="text-[10px] text-slate-400">
                All inventory levels and accounts are normal.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-2 text-xs hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition cursor-pointer flex items-start gap-2 relative ${
                  notif.unread ? 'bg-white dark:bg-slate-800/40' : 'bg-transparent opacity-80'
                }`}
              >
                {/* Left Severity Icon */}
                <div className="mt-0.5 shrink-0">
                  {notif.severity === 'critical' ? (
                    <div className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </div>
                  ) : notif.severity === 'warning' ? (
                    <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                  ) : notif.severity === 'success' ? (
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Info className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className={`font-bold truncate text-[11px] ${
                      notif.unread ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {notif.title}
                    </span>
                    <span className="text-[9px] text-slate-400 shrink-0">
                      {notif.time}
                    </span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 text-[10.5px] leading-tight line-clamp-2">
                    {notif.description}
                  </p>

                  <div className="mt-1 flex items-center justify-between">
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
                      <span>{notif.actionLabel || 'View'}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => toggleItemRead(e, notif.id)}
                        className={`p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition ${
                          notif.unread ? 'text-slate-400 hover:text-blue-600' : 'text-blue-600'
                        }`}
                        title={notif.unread ? 'Mark read' : 'Mark unread'}
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDismissNotification(e, notif.id)}
                        className="p-0.5 rounded text-slate-400 hover:text-rose-600 transition"
                        title="Dismiss"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Compact Pinned Footer */}
        <div className="py-1.5 px-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] shrink-0">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => {
                onClose();
                navigate('/items');
              }}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <Package className="w-2.5 h-2.5" />
              <span>Stock</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button 
              type="button"
              onClick={() => {
                onClose();
                navigate('/parties?type=supplier');
              }}
              className="text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <CreditCard className="w-2.5 h-2.5" />
              <span>Dues</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button 
              type="button"
              onClick={() => {
                onClose();
                navigate('/reports?report=day_book');
              }}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <Clock className="w-2.5 h-2.5" />
              <span>Day Book</span>
            </button>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-200/50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};
