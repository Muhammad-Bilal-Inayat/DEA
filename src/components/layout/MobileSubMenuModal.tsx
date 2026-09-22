import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Building2, Headphones, Command, RefreshCw, 
  ShieldCheck, Clock, AlertTriangle, Package, Settings, 
  FileSpreadsheet, Key, Server, MessageSquare, Phone, 
  Sparkles, Layers, DollarSign, Wallet, Users, ChevronRight,
  LogOut, CheckCircle2, Cloud, Sun, Moon, Bell
} from 'lucide-react';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { useSettings } from '../../contexts/SettingsContext';
import { CashierShift } from '../../types';

interface MobileSubMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  activeUser: any;
  activeRole: string;
  activeCashierShift: CashierShift | null;
  onOpenCompanyModal: () => void;
  onOpenHelpModal: () => void;
  onOpenShortcutsModal: () => void;
  onOpenFirebaseAuth: () => void;
  onOpenCashierShift: () => void;
  onOpenExceptionCenter: () => void;
  onOpenImportWizard: () => void;
  onOpenPricingModal: () => void;
  onOpenFeedbackModal: () => void;
  onOpenMasterAdmin: () => void;
  onOpenLicenseModal: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
}

export const MobileSubMenuModal: React.FC<MobileSubMenuModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeUser,
  activeRole,
  activeCashierShift,
  onOpenCompanyModal,
  onOpenHelpModal,
  onOpenShortcutsModal,
  onOpenFirebaseAuth,
  onOpenCashierShift,
  onOpenExceptionCenter,
  onOpenImportWizard,
  onOpenPricingModal,
  onOpenFeedbackModal,
  onOpenMasterAdmin,
  onOpenLicenseModal,
  onOpenNotifications,
  unreadNotificationsCount = 0
}) => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useSettings();

  if (!isOpen) return null;

  const handleAction = (action: () => void) => {
    onClose();
    setTimeout(action, 120);
  };

  const handleNavigate = (path: string) => {
    onClose();
    setTimeout(() => navigate(path), 120);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div 
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">System Tools & Sub-Menu</h3>
              <p className="text-[11px] text-slate-400">Quick access to all management tools</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Submenu Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          
          {/* User & Cloud Database Status Card */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-sm">
                  {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{activeUser?.name || currentUser?.email?.split('@')[0] || 'User'}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                      {activeRole}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {currentUser?.email || 'Local Offline User'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleAction(onOpenFirebaseAuth)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Cloud className="w-3.5 h-3.5 text-blue-600" />
                <span>Cloud Auth</span>
              </button>
            </div>

            {/* Shift summary */}
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-end text-xs">

              <button
                onClick={() => handleAction(onOpenCashierShift)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                  activeCashierShift
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>{activeCashierShift ? 'Shift Active' : 'Start Shift'}</span>
              </button>
            </div>

            {/* Night Shift / Day Mode Switch */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Display Theme</span>
              <button
                type="button"
                onClick={toggleTheme}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  isDarkMode
                    ? 'bg-indigo-950 text-indigo-200 border-indigo-700'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {isDarkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>🌙 Night Shift (Tap for Day)</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>☀️ Day Mode (Tap for Night)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1 mb-2 block">
              Core Operations
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleAction(onOpenCompanyModal)}
                className="p-3 bg-white hover:bg-blue-50/50 rounded-xl border border-slate-200 text-left transition-all shadow-2xs hover:border-blue-300 flex items-center gap-2.5 cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Company</div>
                  <div className="text-[10px] text-slate-500">Logo, Tax & Print</div>
                </div>
              </button>

              <button
                onClick={() => handleAction(onOpenShortcutsModal)}
                className="p-3 bg-white hover:bg-blue-50/50 rounded-xl border border-slate-200 text-left transition-all shadow-2xs hover:border-blue-300 flex items-center gap-2.5 cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Command className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Shortcuts</div>
                  <div className="text-[10px] text-slate-500">Fast Keybindings</div>
                </div>
              </button>

              <button
                onClick={() => handleAction(onOpenExceptionCenter)}
                className="p-3 bg-white hover:bg-amber-50/50 rounded-xl border border-slate-200 text-left transition-all shadow-2xs hover:border-amber-300 flex items-center gap-2.5 cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Exception Radar</div>
                  <div className="text-[10px] text-slate-500">Negative Stock & Errors</div>
                </div>
              </button>

              <button
                onClick={() => handleAction(onOpenImportWizard)}
                className="p-3 bg-white hover:bg-emerald-50/50 rounded-xl border border-slate-200 text-left transition-all shadow-2xs hover:border-emerald-300 flex items-center gap-2.5 cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Data Import</div>
                  <div className="text-[10px] text-slate-500">Excel / CSV Wizard</div>
                </div>
              </button>
            </div>
          </div>

          {/* Master Management & Settings */}
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1 mb-2 block">
              Administration & Settings
            </span>
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
              {onOpenNotifications && (
                <button
                  onClick={() => handleAction(onOpenNotifications)}
                  className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 relative">
                      <Bell className="w-4 h-4" />
                      {unreadNotificationsCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Notifications & Alerts</span>
                        {unreadNotificationsCount > 0 && (
                          <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-black rounded-full">
                            {unreadNotificationsCount}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">Live Inventory & Payment Dues</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}

              <button
                onClick={() => handleNavigate('/sync-share')}
                className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Staff & Roles</div>
                    <div className="text-[10px] text-slate-500">Manage Cashiers & Permissions</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => handleNavigate('/settings')}
                className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">System Settings</div>
                    <div className="text-[10px] text-slate-500">GST/Tax, Invoicing & Backup</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Support & Contact Card */}
          <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                <Headphones className="w-4 h-4 text-blue-600" />
                <span>MBI Support & Assistance</span>
              </div>
              <button
                onClick={() => handleAction(onOpenHelpModal)}
                className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                User Guide
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <a
                href="tel:03364585863"
                className="flex items-center gap-1.5 p-2 bg-white rounded-xl border border-blue-100 font-bold text-slate-700 hover:text-blue-600 shadow-2xs"
              >
                <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">03364585863</span>
              </a>

              <a
                href="https://wa.me/923281302636"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 p-2 bg-white rounded-xl border border-emerald-100 font-bold text-slate-700 hover:text-emerald-600 shadow-2xs"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">03281302636</span>
              </a>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 font-bold py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh App</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
