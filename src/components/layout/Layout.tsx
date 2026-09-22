import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { OfflineIndicator, PWAInstallButton } from '../pwa/PWAComponents';
import { 
  Menu, Search, Plus, PlusCircle, Settings, 
  Bell, RefreshCw, Phone, MessageSquare, ShieldCheck, 
  Command, Headphones, Server, Key, Home, Users, Package, 
  ArrowDownLeft, ArrowUpRight, Receipt, ShoppingCart, X, AlertTriangle, Clock,
  LayoutGrid, Sparkles, Zap, Sun, Moon, Lock, Camera, Cloud, Building2,
  FileText, RotateCcw, ShoppingBag, FileCheck, FileSpreadsheet, Truck, RotateCw, Wallet, ArrowLeftRight
} from 'lucide-react';
import { GlobalProductScannerModal } from '../common/GlobalProductScannerModal';
import { CompanyProfileModal } from '../company/CompanyProfileModal';
import { ShortcutsModal } from './ShortcutsModal';
import { HelpSupportModal } from '../help/HelpSupportModal';
import { TransactionSearch } from './TransactionSearch';
import { useAuth } from '../../contexts/AuthContext';
import { MasterAdminModal } from '../admin/MasterAdminModal';
import { LicenseActivationModal } from '../admin/LicenseActivationModal';
import { PricingModal } from '../pricing/PricingModal';
import { FeedbackModal } from '../feedback/FeedbackModal';
import { FirebaseAuthModal } from '../admin/FirebaseAuthModal';
import { ExceptionCenterModal } from '../common/ExceptionCenterModal';
import { DataImportWizardModal } from '../common/DataImportWizardModal';
import { Product360Modal } from '../common/Product360Modal';
import { Customer360Modal } from '../common/Customer360Modal';
import { CashierShiftModal } from '../pos/CashierShiftModal';
import { MobileSubMenuModal } from './MobileSubMenuModal';
import { MobileBottomNav } from './MobileBottomNav';
import { StealthReturnBar } from '../common/StealthReturnBar';
import { EmergencyLockScreen } from '../common/EmergencyLockScreen';
import { BusinessContextSwitcher } from './BusinessContextSwitcher';
import { AuditLogViewerModal } from '../admin/AuditLogViewerModal';
import { SecurityVerificationCenterModal } from '../admin/SecurityVerificationCenterModal';
import { QuickTransactionPanel } from '../common/QuickTransactionPanel';
import { NotificationCenter } from './NotificationCenter';
import { SystemAlertNotificationBar } from './SystemAlertNotificationBar';
import { TrialStatusBanner } from '../common/TrialStatusBanner';
import { TrialExpiredModal } from '../common/TrialExpiredModal';
import { getLicenseInfo, getLastLocalBackupTime, verifyLicenseWithHardware, incrementActiveMinutes } from '../../lib/licenseManager';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { PWAInstallBanner } from '../pwa/PWAInstallBanner';
import { getBrandContact } from '../../lib/siteCmsService';
import { useSettings } from '../../contexts/SettingsContext';
import { Medicine, Supplier, CashierShift } from '../../types';
import { dbCashierShifts } from '../../lib/db';
import { calculateLiveShiftMetrics } from '../../lib/cashierShiftManager';
import { checkServerMasterAuth } from '../../lib/masterServerService';
import { 
  getStoredShortcuts, 
  matchesKeyboardEvent, 
  executeShortcutAction 
} from '../../lib/shortcutsManager';
import { useTransactionDock } from '../../contexts/TransactionDockContext';
import { TransactionHostModalLayer } from './TransactionHostModalLayer';
import { TransactionTaskDock } from './TransactionTaskDock';

export const Layout: React.FC = () => {
  const { currentUser, activeRole, activeUser, business, tenant, tenantId, switchTenant, canPerform, canAccess, showTrialExpiredModal, setShowTrialExpiredModal } = useAuth();
  const { settings, isDarkMode, toggleTheme, userPreferences, updateUserPreferences } = useSettings();
  const { openTransaction } = useTransactionDock();
  const navigate = useNavigate();
  const location = useLocation();
  const isServerRoute = location.pathname.startsWith('/server');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isSidebarCollapsed = userPreferences?.sidebarCollapsed ?? (localStorage.getItem('mbi_sidebar_collapsed') === 'true');

  const setIsSidebarCollapsed = (val: boolean) => {
    updateUserPreferences({ sidebarCollapsed: val });
  };

  const toggleSidebarCollapsed = () => {
    const next = !isSidebarCollapsed;
    updateUserPreferences({ sidebarCollapsed: next });
  };

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isMasterAdminOpen, setIsMasterAdminOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isFirebaseAuthOpen, setIsFirebaseAuthOpen] = useState(false);
  const [isExceptionCenterOpen, setIsExceptionCenterOpen] = useState(false);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [isCashierShiftOpen, setIsCashierShiftOpen] = useState(false);
  const [isAuditLogModalOpen, setIsAuditLogModalOpen] = useState(false);
  const [isQuickTransactionOpen, setIsQuickTransactionOpen] = useState(false);
  const [isGlobalScannerOpen, setIsGlobalScannerOpen] = useState(false);
  const [activeCashierShift, setActiveCashierShift] = useState<CashierShift | null>(null);
  const [selected360Product, setSelected360Product] = useState<Medicine | null>(null);
  const [selected360Party, setSelected360Party] = useState<Supplier | null>(null);
  const [contact, setContact] = useState(getBrandContact);

  useEffect(() => {
    const handleCmsUpdate = () => {
      setContact(getBrandContact());
    };
    window.addEventListener('mbi-site-cms-updated', handleCmsUpdate);
    return () => {
      window.removeEventListener('mbi-site-cms-updated', handleCmsUpdate);
    };
  }, []);
  const [isMobileQuickMenuOpen, setIsMobileQuickMenuOpen] = useState(false);
  const [isMobileSubMenuOpen, setIsMobileSubMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [licenseInfo, setLicenseInfo] = useState(() => getLicenseInfo());
  const [lastBackup, setLastBackup] = useState(() => getLastLocalBackupTime());

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isSecurityVerificationOpen, setIsSecurityVerificationOpen] = useState(false);

  // Load active cashier shift
  const loadActiveShift = async () => {
    try {
      const active = await dbCashierShifts.getActiveShift();
      if (active) {
        const live = await calculateLiveShiftMetrics(active);
        setActiveCashierShift(live);
      } else {
        setActiveCashierShift(null);
      }
    } catch (e) {
      console.error('Failed to load active cashier shift:', e);
    }
  };

  useEffect(() => {
    loadActiveShift();
    const interval = setInterval(loadActiveShift, 10000);
    return () => clearInterval(interval);
  }, []);

  const canSale = canAccess('sale') && settings.modules?.sales !== false;
  const canPurchase = canAccess('purchase') && settings.modules?.purchases !== false;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Hardware binding verification & live session time tracking
  useEffect(() => {
    // Run hardware binding check on startup
    verifyLicenseWithHardware().then(res => {
      if (res && !res.isValid && res.status === 'Hardware_Locked') {
        localStorage.setItem('mbi_emergency_lock_active', JSON.stringify({
          isLocked: true,
          reason: res.message || 'Hardware binding mismatch. Device not authorized.',
          timestamp: new Date().toISOString(),
          installationId: 'HW-MISMATCH'
        }));
        window.dispatchEvent(new CustomEvent('mbi-emergency-lock-triggered', {
          detail: { installationId: 'HW-MISMATCH', reason: res.message, mode: 'emergency_lock' }
        }));
      }
    }).catch(err => {
      console.warn('Hardware verification notice:', err);
    });

    // Track 1-minute live active pulse and session duration
    const interval = setInterval(() => {
      incrementActiveMinutes(1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Listen for custom open modal events across the entire application
  useEffect(() => {
    const handleOpenPricing = () => setIsPricingModalOpen(true);
    const handleOpenFeedback = () => setIsFeedbackModalOpen(true);
    const handleOpenCashierShift = () => setIsCashierShiftOpen(true);
    const handleOpenExceptionCenter = () => setIsExceptionCenterOpen(true);
    const handleOpenImportWizard = () => setIsImportWizardOpen(true);
    const handleOpenCompanyProfile = () => setIsCompanyModalOpen(true);
    const handleOpenShortcuts = () => setIsShortcutsModalOpen(true);
    const handleOpenHelp = () => setIsHelpModalOpen(true);
    const handleOpenFirebaseAuth = () => setIsFirebaseAuthOpen(true);
    const handleOpenLicense = () => setIsLicenseModalOpen(true);
    const handleOpenMasterAdmin = () => {
      checkServerMasterAuth().then((isAuth) => {
        if (isAuth) {
          setIsMasterAdminOpen(true);
        }
      }).catch(() => {});
    };
    const handleOpenQuickTransaction = () => setIsQuickTransactionOpen(prev => !prev);
    const handleOpenGlobalScanner = () => setIsGlobalScannerOpen(true);
    const handleToggleSidebar = () => toggleSidebarCollapsed();
    const handleTriggerSync = () => {
      window.location.reload();
    };

    window.addEventListener('open-pricing-modal', handleOpenPricing);
    window.addEventListener('open-feedback-modal', handleOpenFeedback);
    window.addEventListener('open-cashier-shift', handleOpenCashierShift);
    window.addEventListener('open-exception-center', handleOpenExceptionCenter);
    window.addEventListener('open-import-wizard', handleOpenImportWizard);
    window.addEventListener('open-company-profile', handleOpenCompanyProfile);
    window.addEventListener('open-shortcuts-modal', handleOpenShortcuts);
    window.addEventListener('open-help-modal', handleOpenHelp);
    window.addEventListener('open-firebase-auth', handleOpenFirebaseAuth);
    window.addEventListener('open-license-modal', handleOpenLicense);
    window.addEventListener('open-master-admin', handleOpenMasterAdmin);
    window.addEventListener('open-quick-transaction-panel', handleOpenQuickTransaction);
    window.addEventListener('open-global-scanner', handleOpenGlobalScanner);
    window.addEventListener('toggle-sidebar-collapse', handleToggleSidebar);
    window.addEventListener('trigger-cloud-sync', handleTriggerSync);

    const handleOpenSale = (e: Event) => {
      const customEvent = e as CustomEvent;
      openTransaction('Sale', customEvent.detail?.initialData);
    };
    const handleOpenPurchase = (e: Event) => {
      const customEvent = e as CustomEvent;
      openTransaction('Purchase', customEvent.detail?.initialData);
    };
    const handleOpenGenericTx = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.type) {
        openTransaction(customEvent.detail.type, customEvent.detail.initialData);
      }
    };

    window.addEventListener('open-sale-modal', handleOpenSale);
    window.addEventListener('open-purchase-modal', handleOpenPurchase);
    window.addEventListener('open-transaction-modal', handleOpenGenericTx);

    return () => {
      window.removeEventListener('open-pricing-modal', handleOpenPricing);
      window.removeEventListener('open-feedback-modal', handleOpenFeedback);
      window.removeEventListener('open-cashier-shift', handleOpenCashierShift);
      window.removeEventListener('open-exception-center', handleOpenExceptionCenter);
      window.removeEventListener('open-import-wizard', handleOpenImportWizard);
      window.removeEventListener('open-company-profile', handleOpenCompanyProfile);
      window.removeEventListener('open-shortcuts-modal', handleOpenShortcuts);
      window.removeEventListener('open-help-modal', handleOpenHelp);
      window.removeEventListener('open-firebase-auth', handleOpenFirebaseAuth);
      window.removeEventListener('open-license-modal', handleOpenLicense);
      window.removeEventListener('open-master-admin', handleOpenMasterAdmin);
      window.removeEventListener('open-quick-transaction-panel', handleOpenQuickTransaction);
      window.removeEventListener('open-global-scanner', handleOpenGlobalScanner);
      window.removeEventListener('toggle-sidebar-collapse', handleToggleSidebar);
      window.removeEventListener('trigger-cloud-sync', handleTriggerSync);
      window.removeEventListener('open-sale-modal', handleOpenSale);
      window.removeEventListener('open-purchase-modal', handleOpenPurchase);
      window.removeEventListener('open-transaction-modal', handleOpenGenericTx);
    };
  }, []);

  // Global Dynamic Keyboard Shortcuts Engine (Editable & Live)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e || !e.key) return;

      // Close open modals on Escape
      if (e.key === 'Escape') {
        setIsNotificationsOpen(false);
        setIsShortcutsModalOpen(false);
        setIsCompanyModalOpen(false);
        setIsHelpModalOpen(false);
        return;
      }

      // If user is actively typing inside an input or textarea, only allow global control keys
      const target = e.target as HTMLElement | null;
      const isInputFocused = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );

      // F1 or Ctrl+Enter to toggle Shortcuts Hub anytime
      if (e.key === 'F1' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
        e.preventDefault();
        setIsShortcutsModalOpen(prev => !prev);
        return;
      }

      // Alt+L or Ctrl+Shift+L to toggle Audit Log Vault for Primary Admin
      if ((e.altKey && (e.key === 'l' || e.key === 'L')) || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l'))) {
        e.preventDefault();
        setIsAuditLogModalOpen(prev => !prev);
        return;
      }

      // If on server route, suppress retail store quick action shortcuts (like Alt+S for sale, Alt+P for purchase)
      if (isServerRoute && e.altKey && (e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P')) {
        return;
      }

      // Check against user's active/customized shortcuts (including Quick Private Transaction)
      const currentShortcuts = getStoredShortcuts();
      const matched = currentShortcuts.find(item => matchesKeyboardEvent(e, item.currentKey));

      if (matched) {
        e.preventDefault();
        executeShortcutAction(matched, navigate);
        return;
      }

      // If in input field, don't trigger single letter shortcuts unless combined with Alt/Ctrl
      if (isInputFocused && !e.altKey && !e.ctrlKey && !e.metaKey && !(typeof e.key === 'string' && e.key.startsWith('F'))) {
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const handleOpenAuditModal = () => setIsAuditLogModalOpen(true);
    window.addEventListener('open-audit-log-modal', handleOpenAuditModal);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-audit-log-modal', handleOpenAuditModal);
    };
  }, [navigate]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f8fafc] text-slate-800 font-sans relative">
      {/* Master Server Emergency Remote Lock Screen */}
      <EmergencyLockScreen />

      {/* PWA Smart Install Banner */}
      <PWAInstallBanner />
      
      {/* Top Application Bar (Vyapar / MBI Inventra style - Desktop) */}
      <div className="hidden md:flex h-8 bg-slate-900 border-b border-slate-800 items-center justify-between px-3 sm:px-4 text-[11px] text-slate-300 select-none z-30 overflow-x-auto scrollbar-none shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button 
            onClick={() => setIsCompanyModalOpen(true)}
            className="hover:text-white font-semibold flex items-center gap-1.5 transition-colors px-2 py-0.5 rounded-md hover:bg-slate-800 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            <span>Company</span>
          </button>
          
          <button 
            onClick={() => setIsHelpModalOpen(true)}
            className="hover:text-blue-300 font-semibold flex items-center gap-1.5 text-blue-400 cursor-pointer transition-colors px-2 py-0.5 rounded-md hover:bg-slate-800"
          >
            <Headphones className="w-3 h-3 text-blue-400" />
            <span>Help Desk</span>
          </button>
          <button 
            onClick={() => setIsShortcutsModalOpen(true)} 
            className="flex hover:text-white font-semibold items-center gap-1.5 cursor-pointer transition-colors px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700/80 hover:border-slate-600 text-slate-200"
            title="Open Keyboard Shortcuts Hub (Ctrl + Enter or F1)"
          >
            <Command className="w-3 h-3 text-blue-400" />
            <span>Shortcuts</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.2 bg-slate-950 text-blue-300 font-mono text-[9px] font-bold rounded border border-slate-700">Ctrl+Enter</kbd>
          </button>
          <button onClick={() => window.location.reload()} className="hover:text-white p-1 text-slate-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer" title="Refresh Application">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* Center: Visual Tenant Context & Security Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <div 
            onClick={() => setIsCompanyModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer transition-all shadow-2xs group"
            title={`Active Pharmacy Store: ${business?.name || tenant?.name || 'My Pharmacy Store'} | Tenant ID: ${tenantId || 'Default'} (Strictly Isolated Data)`}
          >
            <Building2 className="w-3 h-3 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-[11px] text-white max-w-[140px] truncate">
              {business?.name || tenant?.name || 'My Pharmacy Store'}
            </span>
            <span className="text-slate-500 font-mono text-[9px]">|</span>
            <span className="text-[9.5px] font-mono text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              <span>{tenantId ? tenantId.slice(0, 10) : 'Isolated'}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Firebase Cloud Status Button */}
          <button
            onClick={() => setIsFirebaseAuthOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-colors shadow-2xs"
            title="Firebase Cloud Database & Sync"
          >
            <Cloud className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="font-bold text-[10.5px] max-w-[70px] sm:max-w-none truncate">
              {currentUser?.email ? currentUser.email.split('@')[0] : 'Cloud Login'}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          </button>

          {/* Active Role Indicator in top bar */}
          <div 
            onClick={() => navigate('/sync-share')}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/70 hover:bg-blue-900/80 border border-blue-800/80 text-blue-300 cursor-pointer transition-colors"
            title="Click to manage Users & Roles in Sync & Share"
          >
            <ShieldCheck className="w-3 h-3 text-blue-400 shrink-0" />
            <span className="font-bold text-[10px] truncate max-w-[95px]">
              {activeUser ? `${activeUser.name} (${activeRole})` : `Role: ${activeRole}`}
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-2 pl-1 text-[10.5px]">
            <span className="font-semibold text-slate-400">Hotline:</span>
            <a href={contact.callUrl(contact.phone1)} className="text-blue-300 hover:text-blue-200 font-semibold flex items-center gap-1 transition-colors">
              <Phone className="w-2.5 h-2.5" /> {contact.displayPhone1}
            </a>
            <span className="text-slate-600">|</span>
            <a href={contact.whatsappUrl('Hello MBI Inventra Support!')} target="_blank" rel="noopener noreferrer" className="text-emerald-300 hover:text-emerald-200 font-semibold flex items-center gap-1 transition-colors">
              <MessageSquare className="w-2.5 h-2.5" /> {contact.displayPhone2}
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
        
        <div className="flex flex-col flex-1 min-w-0 bg-[#f8fafc] dark:bg-[#0b0f19]">
          {/* Top App Header */}
          {isServerRoute ? (
            <header className="flex items-center justify-between h-[54px] sm:h-[58px] px-2 sm:px-4 border-b border-slate-800 bg-slate-900 text-white z-40 gap-2 overflow-visible relative w-full">
              <div className="flex items-center gap-2 sm:gap-3">
                <button 
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      setIsSidebarOpen(prev => !prev);
                    } else {
                      toggleSidebarCollapsed();
                    }
                  }}
                  className="p-1.5 sm:p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                  title="Toggle Server Sidebar Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xs">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs sm:text-sm text-white">Server Command Hub</span>
                      <span className="hidden sm:inline-flex px-2 py-0.2 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Port 3000 Active
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 hidden sm:block">Unified Multi-User & Synchronization Hub</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Global Theme Toggle */}
                <button
                  type="button"
                  title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  onClick={toggleTheme}
                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
                </button>

                {/* User & Context Switcher */}
                <div className="border-r border-slate-800 pr-1.5">
                  <BusinessContextSwitcher onOpenAuditLogs={() => setIsAuditLogModalOpen(true)} />
                </div>

                {/* Return to Store POS */}
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                  title="Return to Pharmacy Retail Dashboard"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Return to Store</span>
                </button>
              </div>
            </header>
          ) : (
            <header className="flex items-center justify-between h-[54px] sm:h-[58px] px-2 sm:px-3 lg:px-4 border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#131d33]/95 backdrop-blur-md shadow-2xs z-40 gap-2 sm:gap-3 overflow-visible relative w-full">
              {/* Search & Menu */}
              <div className="flex items-center flex-1 min-w-0 max-w-2xl mr-2 sm:mr-3">
                <button 
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      setIsSidebarOpen(prev => !prev);
                    } else {
                      toggleSidebarCollapsed();
                    }
                  }}
                  className="p-1.5 sm:p-2 -ml-0.5 mr-1 sm:mr-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white focus:outline-none rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                  title={isSidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
                  aria-label="Toggle Sidebar"
                >
                  <Menu className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                </button>
                
                {/* Live Dynamic Transaction Search */}
                <div className="flex-1 min-w-0">
                  <TransactionSearch />
                </div>
              </div>
              
              {/* Action Buttons & Context Switcher */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* Primary Quick Actions */}
                <div className="hidden lg:flex items-center gap-1.5">
                  {canSale && (
                    <button 
                      onClick={() => openTransaction('Sale')} 
                      className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all duration-150 whitespace-nowrap cursor-pointer transform active:scale-95"
                      title="Add Sale Invoice (Alt+S)"
                    >
                      <PlusCircle className="w-3.5 h-3.5 fill-white text-rose-600 shrink-0" />
                      <span>+ Sale</span>
                    </button>
                  )}
                  {canPurchase && (
                    <button 
                      onClick={() => openTransaction('Purchase')} 
                      className="hidden xl:flex items-center gap-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all duration-150 whitespace-nowrap cursor-pointer transform active:scale-95"
                      title="Add Purchase Bill (Alt+P)"
                    >
                      <PlusCircle className="w-3.5 h-3.5 fill-white text-blue-600 shrink-0" />
                      <span>+ Purchase</span>
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-1 sm:gap-1.5 text-slate-500 dark:text-slate-400 shrink-0">
                  {/* Cashier Shift Management Button (Feature #11) */}
                  {userPreferences?.showShiftButtonInHeader !== false && settings.featureFlags?.cashierShiftClosing !== false && (
                    <button
                      onClick={() => setIsCashierShiftOpen(true)}
                      className={`hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                        activeCashierShift
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                      title={activeCashierShift ? `Active Shift: ${activeCashierShift.shiftNumber} (Expected: Rs ${activeCashierShift.expectedCash.toLocaleString()})` : 'Start or Reconcile Cashier Shift'}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden 2xl:inline">
                        {activeCashierShift ? `Shift: Rs ${activeCashierShift.expectedCash.toLocaleString()}` : 'Shift Closed'}
                      </span>
                      <span className="2xl:hidden text-[10.5px] font-bold">
                        {activeCashierShift ? 'Shift' : 'Shift'}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeCashierShift ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    </button>
                  )}

                  {/* Exception Center Radar (Feature #13) */}
                  {settings.featureFlags?.exceptionCenter !== false && (
                    <button
                      title="Exception Center (Operational Radar)"
                      onClick={() => setIsExceptionCenterOpen(true)}
                      className="p-1.5 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-md transition-colors relative cursor-pointer hidden 2xl:flex"
                    >
                      <AlertTriangle className="w-[18px] h-[18px] text-amber-500" />
                    </button>
                  )}

                  {/* Data Import Wizard (Feature #4) */}
                  {settings.featureFlags?.dataImportWizard !== false && (
                    <button
                      title="Universal Data Import Wizard (Excel / CSV)"
                      onClick={() => setIsImportWizardOpen(true)}
                      className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer hidden 2xl:flex"
                    >
                      <Package className="w-[18px] h-[18px] text-slate-600" />
                    </button>
                  )}

                  <button 
                    title="Help & Support (03364585863 / 03281302636)" 
                    onClick={() => setIsHelpModalOpen(true)} 
                    className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer hidden 2xl:flex"
                  >
                    <Headphones className="w-[18px] h-[18px] text-blue-600" />
                  </button>
                  
                  {/* Interactive Notification Popover & Full Center */}
                  <div className="relative">
                    <button 
                      type="button"
                      title="Notifications & Alerts" 
                      data-notification-trigger="true"
                      onClick={() => setIsNotificationsOpen(prev => !prev)} 
                      className={`p-1.5 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors relative cursor-pointer ${
                        isNotificationsOpen ? 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400' : ''
                      }`}
                      aria-label="Open Notifications"
                    >
                      <Bell className="w-[18px] h-[18px]" />
                      {unreadNotificationsCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                          {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                        </span>
                      )}
                    </button>

                    <NotificationCenter 
                      isOpen={isNotificationsOpen}
                      onClose={() => setIsNotificationsOpen(false)}
                      onUnreadCountChange={setUnreadNotificationsCount}
                    />
                  </div>

                  {/* 100% Offline Status Indicator */}
                  <OfflineIndicator />

                  {/* PWA Install Button in Header */}
                  <div className="hidden lg:block">
                    <PWAInstallButton 
                      label="Install App"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer" 
                    />
                  </div>

                  {/* Global Theme Toggle (Day / Night Shift Mode) */}
                  <button
                    type="button"
                    title={isDarkMode ? "Switch to Light Day Mode" : "Switch to Dark Night Shift"}
                    onClick={toggleTheme}
                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
                    aria-label="Toggle Day / Night Mode"
                  >
                    {isDarkMode ? (
                      <Sun className="w-4.5 h-4.5 text-amber-400 animate-in fade-in" />
                    ) : (
                      <Moon className="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400 animate-in fade-in" />
                    )}
                  </button>

                  {canAccess('settings') && (
                    <button title="Settings" onClick={() => navigate('/settings')} className="hidden xl:flex p-1.5 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer">
                      <Settings className="w-[18px] h-[18px]" />
                    </button>
                  )}

                  {/* Business Context Switcher (Multi-Tenancy & Role / Account switching) */}
                  <div className="border-l border-slate-200 dark:border-slate-800 pl-1 sm:pl-1.5 ml-0.5 shrink-0 min-w-0">
                    <BusinessContextSwitcher onOpenAuditLogs={() => setIsAuditLogModalOpen(true)} />
                  </div>
                </div>
              </div>
            </header>
          )}

          {/* System Near-Expiry & Reorder-Threshold Notification Bar */}
          {!isServerRoute && <SystemAlertNotificationBar />}

          {/* 3-Day BASIC Free Trial Status Banner */}
          {!isServerRoute && (
            <TrialStatusBanner 
              onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
              onOpenPricingModal={() => setIsPricingModalOpen(true)}
            />
          )}

          <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 bg-[#f8fafc] dark:bg-[#0b0f19] pb-20 md:pb-6 transition-colors duration-150">
            <div className="mx-auto max-w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      {!isServerRoute && (
        <MobileBottomNav 
          onOpenMobileMenu={() => setIsMobileSubMenuOpen(true)}
        />
      )}

      <CompanyProfileModal 
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
      />

      <ShortcutsModal 
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <HelpSupportModal 
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      <MasterAdminModal
        isOpen={isMasterAdminOpen}
        onClose={() => setIsMasterAdminOpen(false)}
      />

      <LicenseActivationModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        onStatusChange={() => setLicenseInfo(getLicenseInfo())}
      />

      <PricingModal 
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
      />

      <FeedbackModal 
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />

      <FirebaseAuthModal 
        isOpen={isFirebaseAuthOpen}
        onClose={() => setIsFirebaseAuthOpen(false)}
      />

      <ExceptionCenterModal
        isOpen={isExceptionCenterOpen}
        onClose={() => setIsExceptionCenterOpen(false)}
        onOpenProduct360={(prod) => setSelected360Product(prod)}
        onOpenCustomer360={(party) => setSelected360Party(party)}
      />

      <DataImportWizardModal
        isOpen={isImportWizardOpen}
        onClose={() => setIsImportWizardOpen(false)}
      />

      <Product360Modal
        product={selected360Product}
        isOpen={!!selected360Product}
        onClose={() => setSelected360Product(null)}
      />

      <Customer360Modal
        party={selected360Party}
        isOpen={!!selected360Party}
        onClose={() => setSelected360Party(null)}
      />

      <CashierShiftModal
        isOpen={isCashierShiftOpen}
        onClose={() => setIsCashierShiftOpen(false)}
        onShiftStatusChange={(s) => setActiveCashierShift(s)}
      />

      {/* Primary Admin Protected Audit Log Vault */}
      <AuditLogViewerModal
        isOpen={isAuditLogModalOpen}
        onClose={() => setIsAuditLogModalOpen(false)}
      />

      {/* Quick Private Transaction Panel (Alt + P) */}
      <QuickTransactionPanel
        isOpen={isQuickTransactionOpen}
        onClose={() => setIsQuickTransactionOpen(false)}
      />

      {/* Mobile Sub-Menu & Quick Tools Sheet */}
      <MobileSubMenuModal 
        isOpen={isMobileSubMenuOpen}
        onClose={() => setIsMobileSubMenuOpen(false)}
        currentUser={currentUser}
        activeUser={activeUser}
        activeRole={activeRole}
        activeCashierShift={activeCashierShift}
        onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        onOpenFirebaseAuth={() => setIsFirebaseAuthOpen(true)}
        onOpenCashierShift={() => setIsCashierShiftOpen(true)}
        onOpenExceptionCenter={() => setIsExceptionCenterOpen(true)}
        onOpenImportWizard={() => setIsImportWizardOpen(true)}
        onOpenPricingModal={() => setIsPricingModalOpen(true)}
        onOpenFeedbackModal={() => setIsFeedbackModalOpen(true)}
        onOpenMasterAdmin={() => setIsMasterAdminOpen(true)}
        onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Trial Expired Full Modal */}
      <TrialExpiredModal
        isOpen={showTrialExpiredModal}
        onClose={() => setShowTrialExpiredModal(false)}
        onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
      />

      {/* Global Product Camera Scanner Modal */}
      <GlobalProductScannerModal
        isOpen={isGlobalScannerOpen}
        onClose={() => setIsGlobalScannerOpen(false)}
        onOpenProduct360={(med) => setSelected360Product(med)}
      />

      {/* Security, Isolation & Sync Verification Center */}
      <SecurityVerificationCenterModal
        isOpen={isSecurityVerificationOpen}
        onClose={() => setIsSecurityVerificationOpen(false)}
      />

      {/* Global Multi-Transaction Window Layer & Minimized Dock Bar */}
      <TransactionHostModalLayer />
      <TransactionTaskDock />

      <OfflineIndicator />
    </div>
  );
};
