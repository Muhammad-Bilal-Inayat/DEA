/**
 * MBI Inventra - Global Toast Notification System
 * Provides non-intrusive feedback for actions like 'Data Synced', 'Sale Saved', 'Sync Error'.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, AlertCircle, AlertTriangle, Info, X, 
  Cloud, RefreshCw, Database
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, options?: { title?: string; duration?: number }) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Global helper to emit toast from outside React components (e.g. sync services, database operations)
 */
export function emitToast(
  message: string, 
  type: ToastType = 'info', 
  options?: { title?: string; duration?: number }
) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('mbi-toast-event', {
      detail: { message, type, ...options },
    })
  );
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((
    message: string, 
    type: ToastType = 'info', 
    options?: { title?: string; duration?: number }
  ) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const duration = options?.duration !== undefined ? options.duration : (type === 'error' ? 5000 : 3500);

    const newToast: ToastItem = {
      id,
      type,
      title: options?.title,
      message,
      duration,
    };

    setToasts(prev => [...prev.slice(-4), newToast]); // Keep up to 5 concurrent toasts

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
  }, [dismissToast]);

  const success = useCallback((msg: string, title?: string, duration?: number) => {
    showToast(msg, 'success', { title, duration });
  }, [showToast]);

  const error = useCallback((msg: string, title?: string, duration?: number) => {
    showToast(msg, 'error', { title, duration });
  }, [showToast]);

  const warning = useCallback((msg: string, title?: string, duration?: number) => {
    showToast(msg, 'warning', { title, duration });
  }, [showToast]);

  const info = useCallback((msg: string, title?: string, duration?: number) => {
    showToast(msg, 'info', { title, duration });
  }, [showToast]);

  // Listen to window-level custom events
  useEffect(() => {
    const handleCustomToast = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.message) {
        showToast(detail.message, detail.type || 'info', {
          title: detail.title,
          duration: detail.duration,
        });
      }
    };

    window.addEventListener('mbi-toast-event', handleCustomToast);
    return () => window.removeEventListener('mbi-toast-event', handleCustomToast);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, dismissToast }}>
      {children}

      {/* Floating Toasts Viewport */}
      <div 
        aria-live="polite" 
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none"
      >
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-3 fade-in ${
                isSuccess
                  ? 'bg-slate-900/95 text-white border-emerald-500/40 shadow-emerald-950/20'
                  : isError
                  ? 'bg-red-950/95 text-white border-red-500/40 shadow-red-950/30'
                  : isWarning
                  ? 'bg-amber-950/95 text-white border-amber-500/40 shadow-amber-950/30'
                  : 'bg-slate-900/95 text-white border-blue-500/40 shadow-blue-950/20'
              }`}
            >
              {/* Icon */}
              <div className="shrink-0 mt-0.5">
                {isSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isError ? (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                ) : isWarning ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                ) : (
                  <Info className="w-4 h-4 text-blue-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-1">
                {toast.title && (
                  <h4 className="text-xs font-bold leading-tight tracking-wide text-slate-100">
                    {toast.title}
                  </h4>
                )}
                <p className="text-xs font-medium leading-relaxed text-slate-300 break-words mt-0.5">
                  {toast.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
