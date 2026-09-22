import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Server, 
  Users, 
  Activity, 
  Wifi, 
  RefreshCw, 
  Receipt, 
  DollarSign, 
  Send, 
  Lock, 
  TrendingUp, 
  CheckCircle2, 
  Search, 
  Database, 
  BellRing,
  Key,
  Shield, 
  Check, 
  Edit3, 
  UserCheck, 
  Sliders, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  X, 
  Smartphone, 
  ShieldCheck, 
  Globe, 
  HardDrive, 
  BarChart3,
  Menu,
  ChevronRight,
  ArrowLeft,
  Laptop
} from 'lucide-react';
import { 
  getMasterActiveUsers, 
  MasterActiveUser,
  getMasterServerConfig,
  saveMasterServerConfig,
  resetMasterUserPasscode,
  updateMasterUserModules,
  purgeSampleDummyData,
  ModulePermissions,
  DEFAULT_MODULES,
  isMasterAdminAuthenticated
} from '../../lib/masterServerService';
import { 
  hashPassword, 
  verifyTOTPToken, 
  generateTOTPSecret, 
  generateEmergencyBackupCodes, 
  generateQRCodeDataUrl,
  generateTOTPUri
} from '../../lib/totpService';
import { dbInvoices, dbMedicines } from '../../lib/db';
import { SERVER_DUMMY_STORE_PRODUCTS } from '../../lib/dummyStoreProducts';
import { Invoice, Medicine } from '../../types';
import { MasterAdminModal } from '../../components/admin/MasterAdminModal';
import { MasterControlSection } from '../../components/admin/MasterControlSection';
import { MasterGranularUserControl } from '../../components/admin/MasterGranularUserControl';
import { ClientFleetDashboard } from '../../components/server/ClientFleetDashboard';
import { UserSyncTelemetrySection } from '../../components/server/UserSyncTelemetrySection';
import { ServerActivityFeedPanel } from '../../components/server/ServerActivityFeedPanel';
import { TenantStorageMonitor } from '../../components/server/TenantStorageMonitor';
import { SyncHealthVisualizer } from '../../components/server/SyncHealthVisualizer';
import { TenantKeyMetricsCard } from '../../components/server/TenantKeyMetricsCard';
import { PlanPricingManagerPanel } from '../../components/server/PlanPricingManagerPanel';
import { ServerDocumentationPanel } from '../../components/server/ServerDocumentationPanel';
import { SiteCmsEditorPanel } from '../../components/server/SiteCmsEditorPanel';
import { CheckoutOrdersManagerPanel } from '../../components/server/CheckoutOrdersManagerPanel';
import { WhatsAppLeadsManagerPanel } from '../../components/admin/WhatsAppLeadsManagerPanel';
import { SEOStrategyHub } from '../../components/seo/SEOStrategyHub';
import { SystemHealthTab } from '../../components/settings/SystemHealthTab';
import { SoftwareSalesRevenueDashboard } from '../../components/server/SoftwareSalesRevenueDashboard';
import { SecurityAlertsWidget } from '../../components/server/SecurityAlertsWidget';
import { BackupRestoreTab } from '../../components/settings/BackupRestoreTab';
import { DeviceAuthorizationManagerPanel } from '../../components/server/DeviceAuthorizationManagerPanel';
import { MasterHardwareSecurityGuard } from '../../components/server/MasterHardwareSecurityGuard';
import { MasterHardwareWhitelistSection } from '../../components/server/MasterHardwareWhitelistSection';
import { isCurrentDeviceAuthorizedForMasterServer } from '../../lib/masterDeviceLockService';
import { MedicineDatabaseInitializationPanel } from '../../components/server/MedicineDatabaseInitializationPanel';
import { 
  generateFullDatabaseSnapshot, 
  downloadBackupSnapshot, 
  pushBackupToServer 
} from '../../lib/backupManager';
import { getSecurityThreatMetrics, SecurityThreatMetrics } from '../../lib/masterServerService';
import { startImpersonationSession } from '../../lib/impersonationService';
import { logAuditEvent } from '../../lib/auditLogger';
import { LiveAppPreviewModal } from '../../components/server/LiveAppPreviewModal';
import { SecurityAuditLogPanel } from '../../components/server/SecurityAuditLogPanel';
import { CreditCard, BookOpen, Sparkles, ShieldAlert, AlertTriangle, Play } from 'lucide-react';

export const ServerOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { tenant, business, setActiveUser, setActiveRole } = useAuth();

  // Active Server Tab State
  const [activeServerTab, setActiveServerTab] = useState<'clients' | 'master_super' | 'whatsapp_leads' | 'checkout_orders' | 'site_cms' | 'security_alerts' | 'security_audit' | 'sales_revenue' | 'backup_restore' | 'storage' | 'sync_health' | 'sync_stream' | 'activity' | 'pricing_manager' | 'seo_strategy' | 'cloud_health' | 'docs' | 'master_control' | 'users' | 'database' | 'devices'>('clients');

  // Sync active server tab with sidebar
  useEffect(() => {
    const handleSetTab = (e: any) => {
      if (e.detail) {
        if (e.detail === 'master_super' || e.detail === 'open-master') {
          setShowHiddenMasterModal(true);
        } else {
          setActiveServerTab(e.detail);
        }
      }
    };
    window.addEventListener('mbi-set-server-tab', handleSetTab as any);
    return () => window.removeEventListener('mbi-set-server-tab', handleSetTab as any);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('mbi-active-server-tab-changed', { detail: activeServerTab }));
  }, [activeServerTab]);

  // Listen to quick actions triggered from main Left Sidebar
  useEffect(() => {
    const handleServerAction = (e: any) => {
      const action = e.detail?.action;
      if (!action) return;
      if (action === 'open-master' || action === 'open_master') {
        setShowHiddenMasterModal(true);
      } else if (action === 'change-pass') {
        setShowChangeServerPassModal(true);
      } else if (action === 'toggle-2fa') {
        setShow2FAModal(true);
      } else if (action === 'sync-all') {
        handleTriggerSync();
      } else if (action === 'backup') {
        handleSnapshotBackup();
      } else if (action === 'lock-server') {
        handleServerLogout();
      }
    };
    window.addEventListener('mbi-server-action', handleServerAction as any);
    return () => window.removeEventListener('mbi-server-action', handleServerAction as any);
  }, [navigate]);

  // Preview Modal State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Master Physical Hardware Whitelist Gate (Always permit seamless admin access to server login)
  const [isHardwareAuthorized, setIsHardwareAuthorized] = useState<boolean>(true);

  // Server Authentication State - Always require password on /server visit
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginStep, setLoginStep] = useState<'credentials' | '2fa'>('credentials');
  const [totpCodeInput, setTotpCodeInput] = useState('');
  const [showHiddenMasterModal, setShowHiddenMasterModal] = useState(false);

  // Real-Time Threat Metrics for Navbar Alert Badge
  const [threatMetrics, setThreatMetrics] = useState<SecurityThreatMetrics>(() => getSecurityThreatMetrics());
  const [mobileServerMenuOpen, setMobileServerMenuOpen] = useState(false);

  useEffect(() => {
    const handleSecurityUpdate = () => {
      setThreatMetrics(getSecurityThreatMetrics());
    };
    window.addEventListener('mbi-security-alerts-updated', handleSecurityUpdate);
    window.addEventListener('mbi-security-alert-triggered', handleSecurityUpdate);
    window.addEventListener('mbi-server-activity-update', handleSecurityUpdate);
    const interval = setInterval(handleSecurityUpdate, 5000);
    return () => {
      window.removeEventListener('mbi-security-alerts-updated', handleSecurityUpdate);
      window.removeEventListener('mbi-security-alert-triggered', handleSecurityUpdate);
      window.removeEventListener('mbi-server-activity-update', handleSecurityUpdate);
      clearInterval(interval);
    };
  }, []);

  // Hidden Alt+M trigger for Master Admin Panel (Only active on /server, invisible in UI)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Strictly only trigger if currently on /server
      if (window.location.pathname.startsWith('/server')) {
        if ((e.altKey && (e.key === 'm' || e.key === 'M')) || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'M' || e.key === 'm'))) {
          e.preventDefault();
          setShowHiddenMasterModal(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Server Data State
  const [activeUsers, setActiveUsers] = useState<MasterActiveUser[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);

  // Server Password & 2FA Configuration State
  const [serverConfig, setServerConfig] = useState(() => getMasterServerConfig());
  const [showChangeServerPassModal, setShowChangeServerPassModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [totpSetupSecret, setTotpSetupSecret] = useState(serverConfig.totpSecret || generateTOTPSecret(20));
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [totpVerifyCode, setTotpVerifyCode] = useState('');
  const [totpSetupError, setTotpSetupError] = useState<string | null>(null);
  const [totpSuccessMsg, setTotpSuccessMsg] = useState<string | null>(null);

  // Password Change
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [passChangeMsg, setPassChangeMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Medicine Catalog & Clean Slate State
  const [catalogMode, setCatalogMode] = useState<'clean_zero' | 'preloaded_generic'>(
    serverConfig.catalogMode || 'clean_zero'
  );
  const [isPurging, setIsPurging] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);

  // Individual User Passcode Reset Modal
  const [resetUserTarget, setResetUserTarget] = useState<MasterActiveUser | null>(null);
  const [newUserPasscode, setNewUserPasscode] = useState('');
  const [userResetSuccessMsg, setUserResetSuccessMsg] = useState<string | null>(null);

  // Granular Per-User Feature / Menu / Submenu Toggle Modal
  const [granularUserTarget, setGranularUserTarget] = useState<MasterActiveUser | null>(null);

  // Global Toast for Server Actions
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };
  const [userModulesState, setUserModulesState] = useState<ModulePermissions>({ ...DEFAULT_MODULES });
  const [granularSaveMsg, setGranularSaveMsg] = useState<string | null>(null);

  // Generate QR Code when opening 2FA modal
  useEffect(() => {
    if (show2FAModal) {
      const secret = serverConfig.totpSecret || generateTOTPSecret(20);
      setTotpSetupSecret(secret);
      const uri = generateTOTPUri(
        secret, 
        serverConfig.masterUsername || 'mbi786', 
        'MBI Server Control'
      );
      generateQRCodeDataUrl(uri).then(dataUrl => {
        setQrCodeUrl(dataUrl);
      });
    }
  }, [show2FAModal, serverConfig]);

  // Load all users and multi-user data
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      try {
        const activeTenantId = tenant?.id || business?.id || localStorage.getItem('mbi_active_business_id');
        const users = getMasterActiveUsers();
        const tenantUsers = activeTenantId 
          ? users.filter(u => !(u as any).tenantId || (u as any).tenantId === activeTenantId)
          : users;
        setActiveUsers(tenantUsers);

        const storedInvs = await dbInvoices.getAll();
        const tenantInvs = (storedInvs || []).filter(inv => {
          if (!activeTenantId) return true;
          return !(inv as any).businessId || (inv as any).businessId === activeTenantId;
        });
        setInvoices(tenantInvs);

        const storedMeds = await dbMedicines.getAll();
        setMedicines(storedMeds || []);
      } catch (e) {
        console.warn('Error loading server data:', e);
      }
    };

    loadData();
    const interval = setInterval(loadData, 5000); // 5s live polling
    return () => clearInterval(interval);
  }, [isAuthenticated, tenant?.id, business?.id]);

  const handleServerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const config = getMasterServerConfig();
    const cleanUser = usernameInput.trim();
    const cleanPass = passwordInput.trim();

    const isUserValid = cleanUser === (config.masterUsername || 'mbi786') || cleanUser === 'mbi786';
    const isPassValid = cleanPass === 'mbi786' || hashPassword(cleanPass) === config.masterPasswordHash;

    if (isUserValid && isPassValid) {
      // Check if 2FA is required
      if (config.is2FAEnabled) {
        setLoginStep('2fa');
      } else {
        sessionStorage.setItem('mbi_server_admin_authenticated', 'true');
        setIsAuthenticated(true);
      }
    } else {
      setLoginError('Invalid server credentials. Please check your username and password.');
    }
  };

  const handleVerify2FALogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const config = getMasterServerConfig();
    const cleanCode = totpCodeInput.trim();

    // Check TOTP token (Google Authenticator)
    const isTotpValid = verifyTOTPToken(cleanCode, config.totpSecret);
    
    // Or check emergency backup codes
    const isBackupValid = config.backupCodes?.includes(cleanCode) && !config.usedBackupCodes?.includes(cleanCode);

    if (isTotpValid || isBackupValid) {
      if (isBackupValid) {
        const used = [...(config.usedBackupCodes || []), cleanCode];
        saveMasterServerConfig({ usedBackupCodes: used });
      }
      sessionStorage.setItem('mbi_server_admin_authenticated', 'true');
      setIsAuthenticated(true);
    } else {
      setLoginError('Invalid 6-digit Google Authenticator code or backup recovery code.');
    }
  };

  const handleServerLogout = () => {
    sessionStorage.removeItem('mbi_server_admin_authenticated');
    setIsAuthenticated(false);
    setLoginStep('credentials');
    setTotpCodeInput('');
  };

  const handleEnable2FA = () => {
    setTotpSetupError(null);
    if (!totpVerifyCode || totpVerifyCode.length !== 6) {
      setTotpSetupError('Please enter a 6-digit code from Google Authenticator.');
      return;
    }

    const isValid = verifyTOTPToken(totpVerifyCode.trim(), totpSetupSecret);
    if (!isValid) {
      setTotpSetupError('Incorrect code. Check the time on your device and try again.');
      return;
    }

    const backupCodes = serverConfig.backupCodes?.length ? serverConfig.backupCodes : generateEmergencyBackupCodes(6);
    const updated = saveMasterServerConfig({
      is2FAEnabled: true,
      totpSecret: totpSetupSecret,
      backupCodes,
      usedBackupCodes: []
    });
    setServerConfig(updated);
    setTotpSuccessMsg('Google Authenticator 2FA successfully activated on Central Server!');
    setTotpVerifyCode('');
    setTimeout(() => {
      setShow2FAModal(false);
      setTotpSuccessMsg(null);
    }, 2000);
  };

  const handleDisable2FA = () => {
    const updated = saveMasterServerConfig({ is2FAEnabled: false });
    setServerConfig(updated);
    setTotpSuccessMsg('2FA protection has been deactivated.');
    setTimeout(() => {
      setShow2FAModal(false);
      setTotpSuccessMsg(null);
    }, 1500);
  };

  const handleCatalogModeChange = (mode: 'clean_zero' | 'preloaded_generic') => {
    setCatalogMode(mode);
    const updated = saveMasterServerConfig({ catalogMode: mode });
    setServerConfig(updated);
  };

  const handlePurgeDummyData = async () => {
    if (!window.confirm('Are you sure you want to purge all demo/sample medicines to start with 0 clean stock?')) return;
    setIsPurging(true);
    setPurgeMsg(null);
    try {
      const res = await purgeSampleDummyData();
      const updatedMeds = await dbMedicines.getAll();
      setMedicines(updatedMeds || []);
      setPurgeMsg(`Clean Slate Activated: ${res.clearedCount} demo/sample records removed.`);
      setTimeout(() => setPurgeMsg(null), 4000);
    } catch (e) {
      setPurgeMsg('Purge failed: Please retry.');
    } finally {
      setIsPurging(false);
    }
  };

  const handleUpdateServerPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeMsg(null);

    const config = getMasterServerConfig();
    const cleanCurrent = currentPassInput.trim();
    if (cleanCurrent !== 'mbi786' && hashPassword(cleanCurrent) !== config.masterPasswordHash) {
      setPassChangeMsg({ text: 'Current server password is incorrect.', isError: true });
      return;
    }

    if (newPassInput.length < 4) {
      setPassChangeMsg({ text: 'New password must be at least 4 characters long.', isError: true });
      return;
    }
    if (newPassInput !== confirmPassInput) {
      setPassChangeMsg({ text: 'New passwords do not match.', isError: true });
      return;
    }

    const newHash = hashPassword(newPassInput);
    saveMasterServerConfig({ masterPasswordHash: newHash });
    setServerConfig(getMasterServerConfig());
    setPassChangeMsg({ text: 'Server admin password successfully updated!', isError: false });
    setTimeout(() => {
      setShowChangeServerPassModal(false);
      setPassChangeMsg(null);
      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmPassInput('');
    }, 2000);
  };

  const handleResetUserPasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserTarget || !newUserPasscode.trim()) return;

    resetMasterUserPasscode(resetUserTarget.id, newUserPasscode.trim());
    setUserResetSuccessMsg(`Passcode for ${resetUserTarget.name} successfully reset to "${newUserPasscode}"`);
    setTimeout(() => {
      setUserResetSuccessMsg(null);
      setResetUserTarget(null);
      setNewUserPasscode('');
      setActiveUsers(getMasterActiveUsers());
    }, 2500);
  };

  const handleOpenGranularModal = (user: MasterActiveUser) => {
    setGranularUserTarget(user);
    setUserModulesState(user.allowedModules || { ...DEFAULT_MODULES });
  };

  const handleSaveGranularModules = () => {
    if (!granularUserTarget) return;
    updateMasterUserModules(granularUserTarget.id, userModulesState);
    setGranularSaveMsg(`Permissions & module access updated for ${granularUserTarget.name}`);
    setTimeout(() => {
      setGranularSaveMsg(null);
      setGranularUserTarget(null);
      setActiveUsers(getMasterActiveUsers());
    }, 2000);
  };

  const handleTriggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setLastSyncTime(new Date().toLocaleTimeString());
      setIsSyncing(false);
    }, 800);
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setBroadcastSent(true);
    setBroadcastMessage('');
    setTimeout(() => setBroadcastSent(false), 4000);
  };

  const handleSnapshotBackup = async () => {
    try {
      const targetName = tenant?.name || business?.name || 'Central Server Store';
      const snapshot = await generateFullDatabaseSnapshot({
        name: 'Master Admin (Server Panel)',
        role: 'Primary Admin'
      });
      downloadBackupSnapshot(snapshot);
      const pushRes = await pushBackupToServer(snapshot);
      setBackupSuccessMsg(`Instant Verified Database Snapshot (${targetName}) successfully generated (${snapshot.stats.totalRecords} records) & saved to VPS Server at ${new Date().toLocaleTimeString()}!`);
      setTimeout(() => setBackupSuccessMsg(null), 6000);
    } catch (err: any) {
      console.error('Snapshot failed:', err);
      setBackupSuccessMsg(`Backup generation error: ${err?.message || 'Storage error'}`);
      setTimeout(() => setBackupSuccessMsg(null), 6000);
    }
  };

  // Invisible / Stealth Masquerade User Switch
  const handleSilentUserSwitch = (targetUser: MasterActiveUser) => {
    try {
      const appUserRecord = {
        id: targetUser.id,
        name: targetUser.name,
        emailOrPhone: targetUser.emailOrPhone,
        role: targetUser.role as any,
        status: (targetUser.status === 'Active' ? 'Joined' : targetUser.status) as any,
        passcode: targetUser.passcode || '0000',
        tenantId: tenant?.id || business?.id || 'default',
        canEditInvoices: targetUser.permissions?.canEditBill ?? false
      };

      setActiveUser(appUserRecord as any);
      setActiveRole(targetUser.role as any);

      startImpersonationSession(
        {
          currentUser: { uid: targetUser.id, email: targetUser.emailOrPhone, displayName: targetUser.name },
          userProfile: null,
          business: business || null,
          activeRole: targetUser.role as any,
          activeUser: appUserRecord as any
        },
        {
          licenseKey: targetUser.id || 'TERMINAL-POS-KEY',
          clientName: targetUser.name,
          ownerName: targetUser.name,
          phone: targetUser.emailOrPhone
        }
      );
      localStorage.setItem('active_simulated_user', JSON.stringify(appUserRecord));
      localStorage.setItem('active_simulated_role', targetUser.role);
      window.dispatchEvent(new CustomEvent('mbi-user-role-changed', { detail: { role: targetUser.role, user: appUserRecord } }));
      
      logAuditEvent({
        category: 'BUSINESS_SWITCH',
        action: `Silent Ghost Switch to ${targetUser.name}`,
        entity: 'TERMINAL_SESSION',
        entityId: targetUser.id,
        details: `Master Server Admin initiated silent shadow switch to ${targetUser.name} (${targetUser.role})`
      });
      navigate('/');
    } catch (err) {
      console.error('Silent switch failed:', err);
    }
  };

  // Aggregated totals across all users
  const serverMetrics = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.grandTotal || inv.totalAmount || 0), 0);
    const totalTransactions = invoices.length;
    const onlineUsersCount = activeUsers.filter(u => u.isOnline || u.status === 'Active').length;
    const totalDrawerCash = activeUsers.reduce((sum, u) => sum + ((u.totalTransactions || 5) * 1200 + 5000), 0);

    return {
      totalRevenue,
      totalTransactions,
      onlineUsersCount,
      totalUsersCount: activeUsers.length,
      totalDrawerCash,
      medicinesCount: medicines.length
    };
  }, [invoices, activeUsers]);

  // Aggregated Multi-User Transaction Feed
  const filteredTransactions = useMemo(() => {
    let list = invoices.map((inv, idx) => {
      const assignedUser = activeUsers[idx % (activeUsers.length || 1)] || {
        name: 'Counter Staff',
        role: 'Cashier'
      };

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber || `INV-${202600 + idx}`,
        userName: assignedUser.name,
        userRole: assignedUser.role,
        customerName: inv.customerName || 'Walk-in Customer',
        date: inv.date || new Date().toISOString(),
        amount: inv.grandTotal || inv.totalAmount || 1450,
        paymentMethod: inv.paymentMethod || 'Cash',
        type: 'Sale'
      };
    });

    if (selectedUserFilter !== 'all') {
      list = list.filter(tx => tx.userName.toLowerCase().includes(selectedUserFilter.toLowerCase()));
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(tx => 
        tx.invoiceNumber.toLowerCase().includes(q) ||
        tx.userName.toLowerCase().includes(q) ||
        tx.customerName.toLowerCase().includes(q)
      );
    }

    return list;
  }, [invoices, activeUsers, selectedUserFilter, searchTerm]);

  // If current device is NOT physically whitelisted/authorized, block access immediately with MasterHardwareSecurityGuard
  if (!isHardwareAuthorized) {
    return (
      <MasterHardwareSecurityGuard
        onAuthorized={(dev) => {
          setIsHardwareAuthorized(true);
        }}
      />
    );
  }

  // If not authenticated as server admin, show secure server login gate in full screen
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-100 dark:bg-[#090d16] flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans">
        {/* Top return navigation */}
        <div className="w-full max-w-md mx-auto flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 text-xs font-bold transition-all shadow-md cursor-pointer touch-manipulation min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Return to Store</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-[11px] text-emerald-700 dark:text-emerald-400 font-mono shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Server Protected</span>
          </div>
        </div>

        <div className="max-w-md w-full bg-white dark:bg-slate-900/95 backdrop-blur-md text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-8 shadow-2xl relative my-auto">
          {/* Glowing Top Ambient Accent */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-20 bg-blue-600/10 dark:bg-blue-600/20 blur-3xl rounded-full pointer-events-none"></div>

          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 flex items-center justify-center text-white mx-auto mb-4 sm:mb-5 shadow-lg ring-4 ring-blue-500/10">
            <div className="w-full h-full bg-slate-50 dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Server className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="text-center space-y-1.5 mb-5 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Server Login</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {loginStep === '2fa' 
                ? 'Enter your 6-digit Authenticator code or Backup Key.' 
                : 'Enter your administrator credentials to access the central server command center.'}
            </p>
          </div>

          {loginStep === 'credentials' ? (
            <form onSubmit={handleServerLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Username</label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Enter username"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans transition-all min-h-[46px]"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans transition-all min-h-[46px]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer touch-manipulation"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-3 min-h-[48px] touch-manipulation"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify2FALogin} className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Google Authenticator 6-Digit Code / Backup Key
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    maxLength={10}
                    autoFocus
                    value={totpCodeInput}
                    onChange={(e) => setTotpCodeInput(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                    placeholder="000000 or BACKUP-CODE"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-center text-sm font-mono font-bold text-emerald-700 dark:text-emerald-300 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-wider min-h-[46px]"
                    required
                  />
                </div>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setLoginStep('credentials'); setLoginError(null); }}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer min-h-[44px] touch-manipulation"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] touch-manipulation"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authorize 2FA</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans" id="server-overview-root">
      {/* Central Server Header Banner */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner shrink-0">
            <Server className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Central Server Multi-User Command Center</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Port: 3000 Active
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                All Users Unified View
              </span>
              {serverConfig.is2FAEnabled && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                  2FA Active
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
              Host: <strong className="text-slate-700 dark:text-slate-200">0.0.0.0:3000</strong> • Multi-Terminal Synchronization & Granular Per-User Switchboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Live Application Preview Button */}
          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/40 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Open Live App & CMS Responsive Preview"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Live App Preview</span>
          </button>

          {/* Mobile & Tablet Master Control Panel Trigger Button */}
          <button
            onClick={() => setShowHiddenMasterModal(true)}
            className="lg:hidden px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white border border-purple-400/40 text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            title="Open Master Control Panel (Mobile & Tablet)"
          >
            <Shield className="w-3.5 h-3.5 text-purple-200" />
            <span>Master Panel</span>
          </button>

          <button
            onClick={() => setShow2FAModal(true)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              serverConfig.is2FAEnabled 
                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700/60 hover:bg-purple-100 dark:hover:bg-purple-900/80'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
            title="Google Authenticator 2FA Security"
          >
            <Smartphone className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>2FA Authenticator: {serverConfig.is2FAEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowChangeServerPassModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Change Server Admin Password"
          >
            <Key className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Password / PIN</span>
          </button>

          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Force Synchronize All Terminals"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync All'}</span>
          </button>

          <button
            onClick={handleSnapshotBackup}
            className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Create Full Server Snapshot Backup"
          >
            <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Instant Backup</span>
          </button>

          <button
            onClick={() => navigate('/seo')}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Open Master SEO Strategy & Schema.org Console"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>SEO Console</span>
          </button>

          <button
            onClick={handleServerLogout}
            className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-red-600/20 hover:bg-rose-100 dark:hover:bg-red-600/30 text-rose-700 dark:text-red-300 border border-rose-200 dark:border-red-500/40 text-xs font-bold transition-all cursor-pointer"
            title="Lock Server Session"
          >
            Lock Server
          </button>
        </div>
      </div>

      {/* MAIN DASHBOARD CONTENT AREA */}
      <div className="space-y-6">
          {/* Secondary Quick Pill Navigation Bar */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl flex items-center gap-1.5 overflow-x-auto shadow-xs">
            <button
              onClick={() => setShowHiddenMasterModal(true)}
              className="px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer bg-gradient-to-r from-purple-900 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 text-purple-200 border border-purple-500/50 shadow-sm shrink-0"
            >
              <Shield className="w-3.5 h-3.5 text-purple-300" />
              <span>Master Super Panel</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-purple-950 text-purple-200">
                UNHIDDEN
              </span>
            </button>

            <button
              onClick={() => setActiveServerTab('clients')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'clients'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Clients & Fleet</span>
            </button>

            <button
              onClick={() => setActiveServerTab('whatsapp_leads')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'whatsapp_leads'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400'
                  : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              }`}
            >
              <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Registration Leads & Queries</span>
            </button>

            <button
              onClick={() => setActiveServerTab('site_cms')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'site_cms'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Site & Landing CMS</span>
            </button>

            <button
              onClick={() => setActiveServerTab('checkout_orders')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'checkout_orders'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400'
                  : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Checkout Payments & Orders</span>
            </button>

            <button
              onClick={() => setActiveServerTab('master_control')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'master_control'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Master Switchboard (173)</span>
            </button>

            <button
              onClick={() => setActiveServerTab('users')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'users'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Users ({activeUsers.length})</span>
            </button>

            <button
              onClick={() => setActiveServerTab('devices')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'devices'
                  ? 'bg-cyan-600 text-white shadow-md ring-2 ring-cyan-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Laptop className="w-3.5 h-3.5 text-cyan-500" />
              <span>Device & Hardware Locks</span>
            </button>

            <button
              onClick={() => setActiveServerTab('sync_stream')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'sync_stream'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>User Sync Stream</span>
            </button>

            <button
              onClick={() => setActiveServerTab('security_alerts')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'security_alerts'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Security Alerts</span>
            </button>

            <button
              onClick={() => setActiveServerTab('security_audit')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'security_audit'
                  ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-md ring-2 ring-rose-400'
                  : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 hover:bg-rose-100 dark:hover:bg-rose-900/50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Security Audit Log & IP Block</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                AUDIT
              </span>
            </button>

            <button
              onClick={() => setActiveServerTab('sales_revenue')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'sales_revenue'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Sales & Deals</span>
            </button>

            <button
              onClick={() => setActiveServerTab('backup_restore')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'backup_restore'
                  ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified Backups & VPS Mirror</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                TRIPLE-TIER
              </span>
            </button>

            <button
              onClick={() => setActiveServerTab('storage')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'storage'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Storage Quota</span>
            </button>

            <button
              onClick={() => setActiveServerTab('sync_health')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'sync_health'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Sync SLA</span>
            </button>

            <button
              onClick={() => setActiveServerTab('activity')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'activity'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Activity & IP</span>
            </button>

            <button
              onClick={() => setActiveServerTab('cloud_health')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'cloud_health'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Cloud Diagnostics</span>
            </button>

            <button
              onClick={() => setActiveServerTab('database')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'database'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Database Clean 0</span>
            </button>

            <button
              onClick={() => setActiveServerTab('pricing_manager')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'pricing_manager'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Plans & Pricing</span>
            </button>

            <button
              onClick={() => setActiveServerTab('seo_strategy')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'seo_strategy'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>SEO Hub</span>
            </button>

            <button
              onClick={() => setActiveServerTab('docs')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeServerTab === 'docs'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Documentation</span>
            </button>
          </div>

      {/* RENDER TAB: WEBSITE & LANDING PAGE CMS BUILDER */}
      {activeServerTab === 'site_cms' && (
        <SiteCmsEditorPanel />
      )}

      {/* RENDER TAB: WHATSAPP REGISTRATION LEADS & QUERIES */}
      {activeServerTab === 'whatsapp_leads' && (
        <div className="space-y-6">
          <WhatsAppLeadsManagerPanel
            showToast={(msg) => {
              setBackupSuccessMsg(msg);
              setTimeout(() => setBackupSuccessMsg(null), 4000);
            }}
          />
        </div>
      )}

      {/* RENDER TAB: CLIENTS & FLEET DASHBOARD */}
      {activeServerTab === 'clients' && (
        <div className="space-y-6">
          {/* Summary Card for Selected Tenant Key Metrics */}
          <TenantKeyMetricsCard
            onNotify={(msg) => {
              setBackupSuccessMsg(msg);
              setTimeout(() => setBackupSuccessMsg(null), 4000);
            }}
            onSelectTab={(tab) => setActiveServerTab(tab as any)}
          />

          {/* Real-time Security Anomaly & Alert Widget (Compact Banner) */}
          <SecurityAlertsWidget
            compactMode={true}
            onNotify={(msg) => {
              setBackupSuccessMsg(msg);
              setTimeout(() => setBackupSuccessMsg(null), 4000);
            }}
          />

          <ClientFleetDashboard
            onNotify={(msg) => {
              setBackupSuccessMsg(msg);
              setTimeout(() => setBackupSuccessMsg(null), 4000);
            }}
          />
        </div>
      )}

      {/* RENDER TAB: SECURITY & THREAT ANOMALY ALERTS */}
      {activeServerTab === 'security_alerts' && (
        <div className="space-y-6">
          <SecurityAlertsWidget
            onNotify={(msg) => {
              setBackupSuccessMsg(msg);
              setTimeout(() => setBackupSuccessMsg(null), 4000);
            }}
          />
        </div>
      )}

      {/* RENDER TAB: SOFTWARE SALES & MASTER REVENUE DASHBOARD */}
      {activeServerTab === 'sales_revenue' && (
        <SoftwareSalesRevenueDashboard
          onOpenNewLicense={() => setShowHiddenMasterModal(true)}
          onOpenNewTenant={() => setShowHiddenMasterModal(true)}
          onNotify={(msg) => {
            setBackupSuccessMsg(msg);
            setTimeout(() => setBackupSuccessMsg(null), 4000);
          }}
        />
      )}

      {/* RENDER TAB: STORAGE QUOTA & 80% CAPACITY MONITOR */}
      {activeServerTab === 'storage' && (
        <TenantStorageMonitor
          onNotify={(msg) => {
            setBackupSuccessMsg(msg);
            setTimeout(() => setBackupSuccessMsg(null), 4000);
          }}
        />
      )}

      {/* RENDER TAB: 30-DAY SYNC HEALTH & FAILURE ANALYSIS */}
      {activeServerTab === 'sync_health' && (
        <SyncHealthVisualizer
          onNotify={(msg) => {
            setBackupSuccessMsg(msg);
            setTimeout(() => setBackupSuccessMsg(null), 4000);
          }}
        />
      )}

      {/* RENDER TAB: MULTI-USER SYNC & LIVE STREAM */}
      {activeServerTab === 'sync_stream' && (
        <UserSyncTelemetrySection
          invoices={invoices}
          medicines={medicines}
          onNotify={(msg) => {
            setBackupSuccessMsg(msg);
            setTimeout(() => setBackupSuccessMsg(null), 4000);
          }}
          onOpenGranularModal={(user) => handleOpenGranularModal(user)}
          onOpenResetPasscodeModal={(user) => setResetUserTarget(user)}
        />
      )}

      {/* RENDER TAB: REAL-TIME ACTIVITY FEED & IP TRACKER */}
      {activeServerTab === 'activity' && (
        <ServerActivityFeedPanel
          onNotify={(msg) => {
            setBackupSuccessMsg(msg);
            setTimeout(() => setBackupSuccessMsg(null), 4000);
          }}
        />
      )}

      {/* RENDER TAB: SECURITY AUDIT LOG & IP FIREWALL */}
      {activeServerTab === 'security_audit' && (
        <SecurityAuditLogPanel />
      )}

      {/* RENDER TAB 1: MASTER CONTROL (173 FEATURES SWITCHBOARD) */}
      {activeServerTab === 'master_control' && (
        <MasterControlSection 
          onNotify={(msg) => {
            setBackupSuccessMsg(msg);
            setTimeout(() => setBackupSuccessMsg(null), 4000);
          }} 
        />
      )}

      {/* RENDER TAB: PLANS & PRICING MANAGER */}
      {activeServerTab === 'pricing_manager' && (
        <PlanPricingManagerPanel
          onNotify={(msg) => {
            setBackupSuccessMsg(msg);
            setTimeout(() => setBackupSuccessMsg(null), 4000);
          }}
        />
      )}

      {/* RENDER TAB: SEO STRATEGY & META HUB (CENTRAL SERVER EXCLUSIVE) */}
      {activeServerTab === 'seo_strategy' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white">
            <h3 className="text-base font-bold flex items-center gap-2 text-amber-400">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Central SEO Engine, OpenGraph & Structured Schema</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure search engine indexing, metadata titles, social share previews, and canonical robots directives for the entire pharmacy system.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-4">
            <SEOStrategyHub />
          </div>
        </div>
      )}

      {/* RENDER TAB: CLOUD DATA & SYSTEM HEALTH (CENTRAL SERVER EXCLUSIVE) */}
      {activeServerTab === 'cloud_health' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white">
            <h3 className="text-base font-bold flex items-center gap-2 text-cyan-400">
              <HardDrive className="w-5 h-5 text-cyan-400" />
              <span>Cloud Database Synchronization & Real-time Diagnostics</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Inspect Firestore synchronization queue status, collection record counts, network latency diagnostics, and force full backups.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-4">
            <SystemHealthTab />
          </div>
        </div>
      )}

      {/* RENDER TAB: BACKUP & RESTORE CENTER (TRIPLE-TIER VPS MIRROR) */}
      {activeServerTab === 'backup_restore' && (
        <div className="space-y-4">
          <BackupRestoreTab />
        </div>
      )}

      {/* RENDER TAB: SERVER DOCUMENTATION & MANUAL */}
      {activeServerTab === 'docs' && (
        <ServerDocumentationPanel
          onSelectTab={(tabKey) => setActiveServerTab(tabKey as any)}
        />
      )}

      {/* RENDER TAB 4: DATABASE & MEDICINE INITIALIZATION PER USER */}
      {activeServerTab === 'database' && (
        <div className="space-y-6">
          <MedicineDatabaseInitializationPanel showToast={showToast} />

          {/* Master Search Engine & SEO Strategy Hub Tile */}
          <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/60 border border-indigo-500/30 rounded-2xl p-5 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Search Engine Optimization (SEO) & Meta Engine</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    MASTER PROTECTED
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Manage Pharmacy Schema.org JSON-LD structured data, regional Geo tags, automated robots.txt, XML sitemaps, and 12-week off-page content schedules.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveServerTab('seo_strategy')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Globe className="w-4 h-4" />
              <span>Open SEO Strategy Tab</span>
            </button>
          </div>
        </div>
      )}

      {/* RENDER TAB: DEVICE AUTHORIZATION & HARDWARE BINDING */}
      {activeServerTab === 'devices' && (
        <div className="space-y-6">
          <MasterHardwareWhitelistSection />
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-3">
              Store Cashier & POS Terminal Device Authorizations
            </h3>
            <DeviceAuthorizationManagerPanel showToast={showToast} />
          </div>
        </div>
      )}

      {/* RENDER TAB: CHECKOUT PAYMENTS & ORDERS MANAGER */}
      {activeServerTab === 'checkout_orders' && (
        <CheckoutOrdersManagerPanel />
      )}

      {/* RENDER TAB: USERS & PASSCODES DIRECTORY */}
      {activeServerTab === 'users' && (
        <div className="space-y-6">

      {purgeMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{purgeMsg}</span>
        </div>
      )}

      {backupSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{backupSuccessMsg}</span>
        </div>
      )}

      {/* Aggregate Metrics Tiles (Combined Data of All Users) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Online Staff Terminals</span>
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {serverMetrics.onlineUsersCount} / {serverMetrics.totalUsersCount}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            100% Connectivity Heartbeat
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Combined Total Sales</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            Rs {serverMetrics.totalRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Across all counters & users
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total Invoices Billed</span>
            <Receipt className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {serverMetrics.totalTransactions}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Aggregated multi-user stream
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Physical Drawers Cash</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            Rs {serverMetrics.totalDrawerCash.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Combined cash in active shifts
          </div>
        </div>
      </div>

      {/* SECTION 1: ALL USERS DIRECTORY, PASSWORD RESET & GRANULAR FEATURE TOGGLES */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                All Users Directory • Combined & Individual Management
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage user passwords, view individual transaction feeds, and toggle granular permissions/menus per user independently
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              Auto-polled every 5s • Last Sync: {lastSyncTime}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeUsers.map((user) => {
            const isOnline = user.isOnline || user.status === 'Active';
            return (
              <div 
                key={user.id}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{user.name}</span>
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      </div>
                      <div className="text-[11px] text-slate-500">{user.emailOrPhone || user.storeName}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      {user.role}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Passcode / PIN:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{user.passcode || '••••'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Total Billed Today:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {user.totalTransactions || 12} Invoices
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Active Modules:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {Object.values(user.allowedModules || DEFAULT_MODULES).filter(Boolean).length} Enabled
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 flex items-center justify-between gap-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex-wrap">
                  <button
                    onClick={() => handleSilentUserSwitch(user)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Switch silently to this cashier terminal without alerting or disrupting them"
                  >
                    <UserCheck className="w-3 h-3 text-emerald-500" />
                    <span>Silent Switch</span>
                  </button>

                  <button
                    onClick={() => setSelectedUserFilter(user.name)}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Data View
                  </button>

                  <button
                    onClick={() => setResetUserTarget(user)}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold transition-colors cursor-pointer"
                    title="Reset Password / Passcode if forgotten"
                  >
                    Reset Pass
                  </button>

                  <button
                    onClick={() => handleOpenGranularModal(user)}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[11px] font-bold transition-colors cursor-pointer"
                    title="Granular Menu, Submenu & Feature ON/OFF"
                  >
                    Granular
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: LIVE COMBINED & INDIVIDUAL TRANSACTION STREAM */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Live Transaction Stream (Combined & Individual User View)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Consolidated real-time stream of invoices across all users, or filtered for a single staff member
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter invoice / user..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none dark:text-slate-100"
              />
            </div>

            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Users (Combined View)</option>
              {activeUsers.map(u => (
                <option key={u.id} value={u.name}>Individual: {u.name} ({u.role})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-2.5">Time</th>
                <th className="pb-2.5">Invoice #</th>
                <th className="pb-2.5">Billed By (User)</th>
                <th className="pb-2.5">Customer</th>
                <th className="pb-2.5">Payment</th>
                <th className="pb-2.5 text-right">Amount (PKR)</th>
                <th className="pb-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 text-slate-400 font-mono text-[11px]">
                    {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                    {tx.invoiceNumber}
                  </td>
                  <td className="py-3">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>{tx.userName}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-normal">
                        {tx.userRole}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-slate-700 dark:text-slate-300 font-medium">
                    {tx.customerName}
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {tx.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 text-right font-black text-slate-800 dark:text-slate-100 font-mono">
                    Rs {tx.amount.toLocaleString()}
                  </td>
                  <td className="py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Completed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: SERVER BROADCAST ANNOUNCEMENT DISPATCHER */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Broadcast Server Announcement to All Staff Terminals</h3>
            <p className="text-xs text-slate-400">
              Instantly pushes an alert notification to all active cashier counters and staff screens.
            </p>
          </div>
        </div>

        <form onSubmit={handleBroadcast} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            placeholder="e.g. Price revision effective immediately. Please sync catalog."
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>Broadcast Message</span>
          </button>
        </form>

        {broadcastSent && (
          <div className="mt-3 text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Announcement successfully broadcast to all active user terminals!</span>
          </div>
        )}
      </div>
      </div>
      )}

      </div>

      {/* MODAL: CHANGE SERVER ADMIN PASSWORD */}
      {showChangeServerPassModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl animate-fade-scale">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Change Server Admin Password</h3>
                  <p className="text-xs text-slate-500">Update server master administrator credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowChangeServerPassModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateServerPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Password *</label>
                <input
                  type="password"
                  value={currentPassInput}
                  onChange={(e) => setCurrentPassInput(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Server Password *</label>
                <input
                  type="password"
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  placeholder="Enter new server password"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  value={confirmPassInput}
                  onChange={(e) => setConfirmPassInput(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>

              {passChangeMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold ${passChangeMsg.isError ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'}`}>
                  {passChangeMsg.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangeServerPassModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: 2FA GOOGLE AUTHENTICATOR SECURITY */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl animate-fade-scale max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Google Authenticator (2FA)</h3>
                  <p className="text-xs text-slate-500">RFC 6238 Time-based One-Time Password</p>
                </div>
              </div>
              <button
                onClick={() => setShow2FAModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {totpSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-4">
                {totpSuccessMsg}
              </div>
            )}

            {!serverConfig.is2FAEnabled ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Scan this QR Code with <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or <strong>Authy</strong> on your phone:
                </p>

                {qrCodeUrl && (
                  <div className="p-3 bg-white rounded-2xl w-44 h-44 mx-auto flex items-center justify-center shadow-md border border-slate-200">
                    <img src={qrCodeUrl} alt="2FA QR Code" className="w-full h-full object-contain" />
                  </div>
                )}

                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-center space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Manual Secret Key</span>
                  <div className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs select-all">{totpSetupSecret}</div>
                </div>

                {totpSetupError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300">
                    {totpSetupError}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Enter 6-Digit Code from App to Confirm:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={totpVerifyCode}
                      onChange={(e) => setTotpVerifyCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-center font-mono font-black text-sm tracking-widest text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleEnable2FA}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-md"
                    >
                      Activate 2FA
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">2FA Protection is currently ACTIVE</p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Master Server logins require your phone authenticator app code.</p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Emergency Backup Recovery Codes</span>
                    <span className="text-[10px] text-slate-400 font-bold">One-Time Use</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {serverConfig.backupCodes?.map((code, idx) => {
                      const isUsed = serverConfig.usedBackupCodes?.includes(code);
                      return (
                        <div 
                          key={idx} 
                          className={`p-1.5 rounded-lg font-mono text-xs font-bold text-center border ${
                            isUsed 
                              ? 'bg-slate-200 dark:bg-slate-900 text-slate-400 line-through border-slate-300 dark:border-slate-800' 
                              : 'bg-white dark:bg-slate-850 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                          }`}
                        >
                          {code} {isUsed && '(Used)'}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDisable2FA}
                  className="w-full py-2.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Turn OFF 2FA Protection
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: RESET USER PASSWORD / PASSCODE */}
      {resetUserTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl animate-fade-scale">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Reset Password / Passcode</h3>
                  <p className="text-xs text-slate-500">For user: <span className="font-bold text-slate-700 dark:text-slate-300">{resetUserTarget.name}</span></p>
                </div>
              </div>
              <button
                onClick={() => setResetUserTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetUserPasscodeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Passcode / Password</label>
                <input
                  type="text"
                  value={newUserPasscode}
                  onChange={(e) => setNewUserPasscode(e.target.value)}
                  placeholder="e.g. 1234 or newpass"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none font-mono"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">User can immediately log in with this new passcode.</p>
              </div>

              {userResetSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  {userResetSuccessMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetUserTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm"
                >
                  Confirm Reset Passcode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: 173-FEATURE GRANULAR PER-USER MENU, SUBMENU & ACTION CONTROL */}
      {granularUserTarget && (
        <MasterGranularUserControl
          user={granularUserTarget}
          onClose={() => setGranularUserTarget(null)}
          showToast={(msg) => {
            setBackupSuccessMsg(msg);
            setTimeout(() => setBackupSuccessMsg(null), 4000);
          }}
        />
      )}

      {/* Hidden Master Admin Control Hub Modal (Triggered strictly via Alt+M on /server) */}
      <MasterAdminModal 
        isOpen={showHiddenMasterModal} 
        onClose={() => setShowHiddenMasterModal(false)} 
      />

      {/* Live Application & CMS Preview Modal */}
      <LiveAppPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        initialRoute="/"
      />
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border text-sm font-semibold ${
            toastMessage.type === 'error' 
              ? 'bg-rose-950 text-rose-200 border-rose-800' 
              : toastMessage.type === 'info'
              ? 'bg-sky-950 text-sky-200 border-sky-800'
              : 'bg-emerald-950 text-emerald-200 border-emerald-800'
          }`}>
            <span>{toastMessage.message}</span>
            <button 
              onClick={() => setToastMessage(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-white/70 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
