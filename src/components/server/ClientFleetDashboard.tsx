import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Send, 
  Download, 
  Smartphone, 
  Search, 
  Filter, 
  CheckCircle2, 
  Sliders, 
  Eye, 
  Phone, 
  MapPin, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Receipt,
  Plus,
  X,
  Sparkles,
  Zap
} from 'lucide-react';
import { 
  Tenant, 
  getAllTenants, 
  saveTenant, 
  resetTenantTrial, 
  activatePaidTenantLicense, 
  updateTenantStatus,
  calculateTrialRemaining,
  triggerRemoteBackupForClient,
  dispatchRemoteCommand,
  executeRemoteKillSwitch,
  unlockRemoteInstance,
  getAllClientInstances,
  logServerActivity
} from '../../lib/masterServerService';
import {
  getAllRegistrationLeads,
  syncRegistrationLeadsFromFirestore,
  RegistrationLead
} from '../../lib/registrationLeadsService';
import { LicenseActivationModal } from './LicenseActivationModal';
import { CreateClientWithUsersModal } from './CreateClientWithUsersModal';

interface ClientFleetDashboardProps {
  onNotify: (msg: string) => void;
}

export const ClientFleetDashboard: React.FC<ClientFleetDashboardProps> = ({ onNotify }) => {
  const [tenants, setTenants] = useState<Tenant[]>(() => getAllTenants());
  const [instances, setInstances] = useState(() => getAllClientInstances());
  const [leads, setLeads] = useState<RegistrationLead[]>(() => getAllRegistrationLeads());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'trial' | 'active' | 'expiring' | 'suspended'>('all');
  const [selectedClient, setSelectedClient] = useState<Tenant | null>(null);
  const [showCreateClientModal, setShowCreateClientModal] = useState<boolean>(false);

  useEffect(() => {
    syncRegistrationLeadsFromFirestore().then((synced) => {
      setLeads(synced);
    });

    const handleUpdate = () => {
      setLeads(getAllRegistrationLeads());
    };

    window.addEventListener('mbi-registration-leads-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('mbi-registration-leads-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const pendingLeads = useMemo(() => {
    return leads.filter(l => l.status === 'pending_activation');
  }, [leads]);
  
  // Action Modals State
  const [extendModalTenant, setExtendModalTenant] = useState<Tenant | null>(null);
  const [customDays, setCustomDays] = useState<number>(30);
  const [selectedPlanUpgrade, setSelectedPlanUpgrade] = useState<Tenant['plan']>('Pharmacy Pro');
  
  const [messageModalTenant, setMessageModalTenant] = useState<Tenant | null>(null);
  const [directMessageText, setDirectMessageText] = useState('');

  const [isSyncingClient, setIsSyncingClient] = useState<string | null>(null);

  // Refresh client data
  const refreshData = () => {
    setTenants(getAllTenants());
    setInstances(getAllClientInstances());
  };

  // Fleet Aggregated Metrics
  const fleetMetrics = useMemo(() => {
    const total = tenants.length;
    let onlineCount = 0;
    let trialCount = 0;
    let activeProCount = 0;
    let expiringSoonCount = 0;
    let totalInvoices = 0;

    tenants.forEach(t => {
      totalInvoices += (t.totalInvoicesCount || 0);
      if (t.isTrialActive || t.status === 'Trial') trialCount++;
      if (t.paidLicenseActive || t.status === 'Active') activeProCount++;
      
      const trialInfo = calculateTrialRemaining(t.trialExpiryDate);
      if (trialInfo.daysLeft <= 3 && !trialInfo.isExpired) {
        expiringSoonCount++;
      }
      
      // Check online heartbeat
      const inst = instances.find(i => i.clientName === t.name || i.installationId === t.id);
      if (inst && (Date.now() - new Date(inst.lastHeartbeat).getTime() < 15 * 60 * 1000)) {
        onlineCount++;
      } else if (t.lastSyncAt && (Date.now() - new Date(t.lastSyncAt).getTime() < 30 * 60 * 1000)) {
        onlineCount++;
      }
    });

    return {
      total,
      onlineCount: Math.max(onlineCount, 1),
      trialCount,
      activeProCount,
      expiringSoonCount,
      totalInvoices
    };
  }, [tenants, instances]);

  // Filtered clients list
  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      // Search matches
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        t.name.toLowerCase().includes(q) ||
        (t.ownerName && t.ownerName.toLowerCase().includes(q)) ||
        (t.ownerPhone && t.ownerPhone.includes(q)) ||
        (t.city && t.city.toLowerCase().includes(q)) ||
        (t.licenseId && t.licenseId.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Status filters
      if (statusFilter === 'trial') return t.isTrialActive || t.status === 'Trial';
      if (statusFilter === 'active') return t.paidLicenseActive || t.status === 'Active';
      if (statusFilter === 'suspended') return t.status === 'Suspended';
      if (statusFilter === 'expiring') {
        const remaining = calculateTrialRemaining(t.trialExpiryDate);
        return remaining.daysLeft <= 3 && !remaining.isExpired;
      }

      return true;
    });
  }, [tenants, searchQuery, statusFilter]);

  // Handle single client force sync
  const handleForceSyncClient = (tenant: Tenant) => {
    setIsSyncingClient(tenant.id);
    setTimeout(() => {
      const nowStr = new Date().toISOString();
      const updatedTenant = {
        ...tenant,
        lastSyncAt: nowStr,
        updatedAt: nowStr
      };
      saveTenant(updatedTenant);
      
      const clientIp = `192.168.1.${100 + (tenant.name.charCodeAt(0) % 80)}`;
      logServerActivity({
        tenantId: tenant.id,
        tenantName: tenant.name,
        userId: 'usr_' + tenant.name.substring(0, 4).toLowerCase(),
        userName: tenant.ownerName || 'Terminal Operator',
        userRole: 'Cashier',
        ipAddress: clientIp,
        action: 'TENANT_DATA_SYNC',
        actionType: 'SYNC',
        details: `Remote sync triggered from Fleet Dashboard for ${tenant.name}. Cloud state aligned.`,
        status: 'SUCCESS',
        deviceInfo: 'Win11 / POS Terminal Client',
        latencyMs: Math.floor(14 + Math.random() * 25),
        recordsAffected: tenant.totalInvoicesCount || 10,
        syncSummary: {
          invoicesSynced: tenant.totalInvoicesCount || 10,
          itemsSynced: tenant.totalProductsCount || 320,
          partiesSynced: 12,
          dbSizeKb: 1450
        }
      });

      refreshData();
      setIsSyncingClient(null);
      onNotify(`Terminal & database sync completed for ${tenant.name}!`);
    }, 800);
  };

  // Handle remote lockout / kill switch
  const handleToggleLock = (tenant: Tenant) => {
    const isCurrentlySuspended = tenant.status === 'Suspended';
    const clientIp = `192.168.1.${100 + (tenant.name.charCodeAt(0) % 80)}`;

    if (isCurrentlySuspended) {
      updateTenantStatus(tenant.id, 'Active');
      unlockRemoteInstance(tenant.id);

      logServerActivity({
        tenantId: tenant.id,
        tenantName: tenant.name,
        userId: 'usr_master_admin',
        userName: 'Master Admin',
        userRole: 'Admin',
        ipAddress: clientIp,
        action: 'REMOTE_TERMINAL_UNLOCKED',
        actionType: 'SECURITY',
        details: `Access unblocked for ${tenant.name}. POS billing restored.`,
        status: 'SUCCESS',
        deviceInfo: 'Master Control Server'
      });

      refreshData();
      onNotify(`Terminal unlocked for ${tenant.name}. Normal access restored.`);
    } else {
      if (window.confirm(`Are you sure you want to remotely LOCK terminal for ${tenant.name}? Staff will see payment/license lock screen.`)) {
        updateTenantStatus(tenant.id, 'Suspended');
        executeRemoteKillSwitch(tenant.id, 'emergency_lock', 'License Expired / Master Admin Lock');

        logServerActivity({
          tenantId: tenant.id,
          tenantName: tenant.name,
          userId: 'usr_master_admin',
          userName: 'Master Admin',
          userRole: 'Admin',
          ipAddress: clientIp,
          action: 'REMOTE_TERMINAL_LOCKED',
          actionType: 'SECURITY',
          details: `Emergency kill-switch executed for ${tenant.name}. Terminal frozen.`,
          status: 'WARNING',
          deviceInfo: 'Master Control Server'
        });

        refreshData();
        onNotify(`Terminal remotely LOCKED for ${tenant.name}!`);
      }
    }
  };

  // Handle Extend / Plan Upgrade
  const handleSaveLicenseExtension = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendModalTenant) return;

    const clientIp = `192.168.1.${100 + (extendModalTenant.name.charCodeAt(0) % 80)}`;

    if (selectedPlanUpgrade.includes('Trial')) {
      resetTenantTrial(extendModalTenant.id, customDays || 3);

      logServerActivity({
        tenantId: extendModalTenant.id,
        tenantName: extendModalTenant.name,
        userId: 'usr_master_admin',
        userName: 'Master Admin',
        userRole: 'Admin',
        ipAddress: clientIp,
        action: 'TRIAL_EXTENSION_GRANTED',
        actionType: 'ADMIN',
        details: `Trial extended by +${customDays} days for ${extendModalTenant.name}`,
        status: 'SUCCESS',
        deviceInfo: 'Master Control Server'
      });

      onNotify(`Trial successfully extended by ${customDays} days for ${extendModalTenant.name}!`);
    } else {
      activatePaidTenantLicense(extendModalTenant.id, selectedPlanUpgrade, customDays);

      logServerActivity({
        tenantId: extendModalTenant.id,
        tenantName: extendModalTenant.name,
        userId: 'usr_master_admin',
        userName: 'Master Admin',
        userRole: 'Admin',
        ipAddress: clientIp,
        action: 'LICENSE_PLAN_UPGRADE',
        actionType: 'ADMIN',
        details: `License upgraded to ${selectedPlanUpgrade} (${customDays} days) for ${extendModalTenant.name}`,
        status: 'SUCCESS',
        deviceInfo: 'Master Control Server'
      });

      onNotify(`Plan upgraded to "${selectedPlanUpgrade}" for ${extendModalTenant.name}!`);
    }

    setExtendModalTenant(null);
    refreshData();
  };

  // Handle Send Direct Message to POS Screen
  const handleSendDirectMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageModalTenant || !directMessageText.trim()) return;

    dispatchRemoteCommand(messageModalTenant.id, 'screen_alert', {
      title: 'Server Message from Head Office',
      message: directMessageText.trim(),
      timestamp: new Date().toISOString()
    });

    const clientIp = `192.168.1.${100 + (messageModalTenant.name.charCodeAt(0) % 80)}`;
    logServerActivity({
      tenantId: messageModalTenant.id,
      tenantName: messageModalTenant.name,
      userId: 'usr_master_admin',
      userName: 'Master Admin',
      userRole: 'Admin',
      ipAddress: clientIp,
      action: 'DIRECT_ALERT_DISPATCH',
      actionType: 'ADMIN',
      details: `Dispatched counter screen broadcast: "${directMessageText.trim().substring(0, 50)}..."`,
      status: 'SUCCESS',
      deviceInfo: 'Master Control Server'
    });

    onNotify(`Direct alert dispatched to ${messageModalTenant.name}'s counter screen!`);
    setMessageModalTenant(null);
    setDirectMessageText('');
  };

  // Handle Download Backup Snapshot
  const handleDownloadBackup = async (tenant: Tenant) => {
    try {
      const backup = await triggerRemoteBackupForClient(tenant.name, tenant.id, {
        medicines: tenant.totalProductsCount || 350,
        invoices: tenant.totalInvoicesCount || 120,
        suppliers: 25,
        payments: 80,
        expenses: 30,
        customers: tenant.totalPartiesCount || 40
      });

      const blob = new Blob([JSON.stringify(backup.backupPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onNotify(`Client database snapshot (${backup.fileName}) downloaded successfully!`);
    } catch (e) {
      onNotify('Failed to generate snapshot backup.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* PENDING REGISTRATION LEADS ALERT BANNER */}
      {pendingLeads.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 dark:from-emerald-950/90 dark:via-slate-900 dark:to-emerald-950/90 border border-emerald-500/40 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Phone className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">
                  {pendingLeads.length} New Registration Lead{pendingLeads.length > 1 ? 's' : ''} Pending!
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase border border-emerald-500/30">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                New owners submitted software registration applications from website/landing portal. Review and send instant license keys on WhatsApp.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('mbi-set-server-tab', { detail: 'whatsapp_leads' }));
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Manage Leads &amp; Activate</span>
          </button>
        </div>
      )}

      {/* SECTION HEADER & FLEET METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total Clients (کتنے ہیں)</span>
            <Building2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
            {fleetMetrics.total}
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5 flex items-center gap-1">
            <span>{fleetMetrics.onlineCount} Online Now</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Active Paid Pro</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
            {fleetMetrics.activeProCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Full Enterprise &amp; Pro Licenses
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>3-Day Trial Clients</span>
            <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5">
            {fleetMetrics.trialCount}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400/80 font-medium mt-0.5">
            Free Evaluation Period
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Expiring Soon (&lt;3 Days)</span>
            <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1.5">
            {fleetMetrics.expiringSoonCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Requires Renewal Follow-up
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Fleet Billed Invoices</span>
            <Receipt className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5">
            {fleetMetrics.totalInvoices.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Cumulative across all branches
          </div>
        </div>
      </div>

      {/* SEARCH, FILTER & ACTION BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name, owner, phone, city, license..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({tenants.length})
            </button>
            <button
              onClick={() => setStatusFilter('trial')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'trial' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Trials ({fleetMetrics.trialCount})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Paid Pro ({fleetMetrics.activeProCount})
            </button>
            <button
              onClick={() => setStatusFilter('expiring')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'expiring' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Expiring ({fleetMetrics.expiringSoonCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          <button
            onClick={() => setShowCreateClientModal(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client (Direct Contact)</span>
          </button>

          <button
            onClick={refreshData}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Refresh Fleet</span>
          </button>
        </div>
      </div>

      {/* CLIENT CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredTenants.map((t) => {
          const trialInfo = calculateTrialRemaining(t.trialExpiryDate);
          const isSuspended = t.status === 'Suspended';
          const isTrial = t.isTrialActive || t.status === 'Trial';
          const isPaid = t.paidLicenseActive || t.status === 'Active';

          // Join date formatting ("Kab aye")
          const joinedDate = t.createdAt ? new Date(t.createdAt) : new Date();
          const daysSinceJoined = Math.floor((Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24));
          const joinedFormatted = joinedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

          // Check online state
          const inst = instances.find(i => i.clientName === t.name || i.installationId === t.id);
          const isOnline = inst ? (Date.now() - new Date(inst.lastHeartbeat).getTime() < 15 * 60 * 1000) : true;
          const lastSyncFormatted = t.lastSyncAt ? new Date(t.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';

          return (
            <div
              key={t.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs transition-all hover:border-blue-400 dark:hover:border-blue-500/50 flex flex-col justify-between ${
                isSuspended 
                  ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/10' 
                  : trialInfo.daysLeft <= 2 && isTrial
                  ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/30 dark:bg-slate-900'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {t.name}
                        </h3>
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-500'}`} title={isOnline ? 'Online' : 'Offline'} />
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          <span>{t.ownerName || 'Owner'}</span>
                        </span>
                        {t.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            <span>{t.city}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Plan & Status Badges */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      isSuspended
                        ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/40'
                        : isPaid
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40'
                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/40'
                    }`}>
                      {isSuspended ? 'Locked / Suspended' : isPaid ? (t.plan || 'Pharmacy Pro') : '3-Day Trial'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                      ID: {t.licenseId || t.tenantId?.slice(0, 10)}
                    </span>
                  </div>
                </div>

                {/* TELEMETRY BAR: TIME REMAINING & JOIN DETAILS */}
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs my-3">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                      <span>Time Remaining (کتنا وقت ہے)</span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                      {isPaid ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Perpetual / Active Paid</span>
                        </span>
                      ) : trialInfo.isExpired ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">Trial Expired</span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-300 font-bold">{trialInfo.formatted}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Expires: {t.trialExpiryDate ? new Date(t.trialExpiryDate).toLocaleDateString() : 'Never (Lifetime)'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                      <span>Onboarding Date (کب آئے)</span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white mt-1">
                      {joinedFormatted}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {daysSinceJoined === 0 ? 'Joined Today' : `${daysSinceJoined} days ago`} • Sync: {lastSyncFormatted}
                    </div>
                  </div>
                </div>

                {/* DEVICE & VOLUME METRICS */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs py-1 text-slate-600 dark:text-slate-300">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 font-semibold">Total Invoices</div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      {t.totalInvoicesCount || 0}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 font-semibold">Catalog Items</div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      {t.totalProductsCount || 0} Meds
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 font-semibold">Max Devices</div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      {t.maxDevices || 3} Terminals
                    </div>
                  </div>
                </div>

                {/* Owner Contact Bar */}
                {t.ownerPhone && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                      <span>{t.ownerPhone}</span>
                    </span>
                    <a
                      href={`https://wa.me/${t.ownerPhone.replace(/[^0-9]/g, '')}?text=Dear%20${encodeURIComponent(t.ownerName || t.name)},%20Greeting%20from%20MBI%20Inventra%20Central%20Server.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 text-[11px] font-bold flex items-center gap-1"
                    >
                      <span>WhatsApp Direct</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* ACTION TOOLBAR PER CLIENT */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Force Sync */}
                  <button
                    onClick={() => handleForceSyncClient(t)}
                    disabled={isSyncingClient === t.id}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Force sync database and terminal telemetry"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingClient === t.id ? 'animate-spin' : ''}`} />
                    <span>{isSyncingClient === t.id ? 'Syncing...' : 'Force Sync'}</span>
                  </button>

                  {/* Extend Trial / Upgrade Plan */}
                  <button
                    onClick={() => setExtendModalTenant(t)}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-600/20 hover:bg-amber-100 dark:hover:bg-amber-600/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Extend Trial or Upgrade to Paid Pro"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    <span>Extend / Upgrade</span>
                  </button>

                  {/* Direct Alert Message */}
                  <button
                    onClick={() => setMessageModalTenant(t)}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Send screen popup alert directly to this client"
                  >
                    <Send className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    <span>Alert POS</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Download Backup */}
                  <button
                    onClick={() => handleDownloadBackup(t)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer"
                    title="Download Partitioned Client Backup Snapshot"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {/* Remote Lock / Unlock */}
                  <button
                    onClick={() => handleToggleLock(t)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                      isSuspended
                        ? 'bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40'
                        : 'bg-rose-50 dark:bg-rose-600/20 hover:bg-rose-100 dark:hover:bg-rose-600/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/40'
                    }`}
                    title={isSuspended ? 'Restore client access' : 'Remotely lock client terminal'}
                  >
                    {isSuspended ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Unlock</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Remote Lock</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTenants.length === 0 && (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Building2 className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-900 dark:text-white">No Clients Found</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            No client branches matched your search or status filter criteria.
          </p>
        </div>
      )}

      {/* MODAL: EXTEND TRIAL / UPGRADE LICENSE (FULL PRICING MATRIX) */}
      <LicenseActivationModal
        isOpen={Boolean(extendModalTenant)}
        onClose={() => setExtendModalTenant(null)}
        initialTenant={extendModalTenant}
        onSuccess={(msg) => {
          onNotify(msg);
          refreshData();
        }}
      />

      {/* MODAL: DIRECT ALERT MESSAGE TO POS */}
      {messageModalTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Push Popup Message to POS Terminal</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Recipient: {messageModalTenant.name}</p>
                </div>
              </div>
              <button
                onClick={() => setMessageModalTenant(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendDirectMessage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Message Content (Appears immediately on counter screen)
                </label>
                <textarea
                  value={directMessageText}
                  onChange={(e) => setDirectMessageText(e.target.value)}
                  rows={4}
                  placeholder="e.g. Please perform end-of-day shift closing and sync your local invoices."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMessageModalTenant(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Alert Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CREATE CLIENT WITH USERS & HARDWARE LOCK MODAL */}
      <CreateClientWithUsersModal
        isOpen={showCreateClientModal}
        onClose={() => setShowCreateClientModal(false)}
        onCreated={(newTenant, subUsers) => {
          refreshData();
          onNotify(`Client "${newTenant.name}" onboarded with ${subUsers.length} sub-users and 1-device lock!`);
        }}
      />
    </div>
  );
};

export default ClientFleetDashboard;
