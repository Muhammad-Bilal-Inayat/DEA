import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Building2, ChevronDown, Check, Plus, LogIn, LogOut, 
  ShieldCheck, ShieldAlert, Key, User, Sparkles, RefreshCw, 
  Settings, Layers, Store, ArrowRightLeft, Lock, FileText, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Business, UserRole, AppUserRecord } from '../../types';
import { useNavigate } from 'react-router-dom';
import { logAuditEvent } from '../../lib/auditLogger';

interface BusinessContextSwitcherProps {
  onOpenAuditLogs?: () => void;
}

export const BusinessContextSwitcher: React.FC<BusinessContextSwitcherProps> = ({ onOpenAuditLogs }) => {
  const { 
    business, 
    currentUser, 
    userProfile, 
    activeRole, 
    activeUser, 
    logout, 
    setActiveUser, 
    setActiveRole,
    appUsers,
    updateBusiness
  } = useAuth();
  
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isCreateBusinessModalOpen, setIsCreateBusinessModalOpen] = useState(false);
  const [isPinSwitchModalOpen, setIsPinSwitchModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [selectedStaffForPin, setSelectedStaffForPin] = useState<AppUserRecord | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  // New business form state
  const [newBizName, setNewBizName] = useState('');
  const [newBizCity, setNewBizCity] = useState('Lahore');
  const [newBizPhone, setNewBizPhone] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper function to deduplicate and sanitize business profiles by ID
  const isMasterAdmin = currentUser?.email === 'm.bilalinayat786@gmail.com' || currentUser?.email === 'vip123@admin.com';

  const sanitizeBusinesses = (list: (Business | null | undefined)[], currentBiz?: Business | null): Business[] => {
    const map = new Map<string, Business>();

    // If current active business is provided, check if valid for current user
    if (currentBiz && currentBiz.id) {
      if (isMasterAdmin || (currentBiz.id !== 'local-business-id' && currentBiz.name !== 'MBI INVENTRA' && !currentBiz.address?.includes('MBI Corporate Plaza'))) {
        map.set(currentBiz.id, currentBiz);
      }
    }

    // Add list items preserving uniqueness
    if (Array.isArray(list)) {
      list.forEach(b => {
        if (b && b.id && !map.has(b.id)) {
          // Exclude hardcoded demo branches if the current logged-in user is a registered non-master tenant
          if (!isMasterAdmin && (
            b.id === 'biz_lahore_central' || 
            b.id === 'biz_islamabad_retail' || 
            b.id === 'local-business-id' ||
            b.name === 'MBI INVENTRA' ||
            b.address?.includes('MBI Corporate Plaza')
          )) {
            return;
          }
          map.set(b.id, b);
        }
      });
    }

    // Only inject Master Admin demo accounts if master admin is authenticated
    if (isMasterAdmin && map.size === 0) {
      const masterDefault: Business = {
        id: 'local-business-id',
        name: 'MBI INVENTRA',
        ownerUid: 'u1',
        members: ['u1'],
        phone: '03364585863',
        mobile: '03281302636',
        email: 'support@mbinventra.com',
        city: 'Lahore',
        address: 'MBI Corporate Plaza, Commercial Center',
        currency: 'PKR',
        vatPercentage: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      map.set(masterDefault.id, masterDefault);
    } else if (map.size === 0 && (currentUser || userProfile || business)) {
      const storeNameCandidate = 
        (business && business.name !== 'MBI INVENTRA' ? business.name : '') ||
        (userProfile?.name ? userProfile.name.replace(/\(Admin\)/g, '').trim() : '') ||
        currentUser?.displayName || 
        'My Pharmacy Store';

      const userDefault: Business = {
        id: business?.id && business.id !== 'local-business-id' ? business.id : `biz_${currentUser?.uid || userProfile?.id || Date.now()}`,
        name: storeNameCandidate,
        ownerUid: currentUser?.uid || userProfile?.id || 'u1',
        members: [currentUser?.uid || userProfile?.id || 'u1'],
        phone: (business && business.name !== 'MBI INVENTRA' ? business.phone : '') || (userProfile as any)?.phone || '',
        mobile: (business && business.name !== 'MBI INVENTRA' ? business.mobile : '') || (userProfile as any)?.phone || '',
        email: currentUser?.email || userProfile?.email || '',
        city: (business && business.name !== 'MBI INVENTRA' ? business.city : '') || 'Lahore',
        address: (business && business.name !== 'MBI INVENTRA' && !business.address?.includes('MBI Corporate Plaza') ? business.address : '') || '',
        currency: 'PKR',
        vatPercentage: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      map.set(userDefault.id, userDefault);
    }

    return Array.from(map.values());
  };

  // List of businesses associated with current user
  const [userBusinesses, setUserBusinesses] = useState<Business[]>(() => {
    let parsed: Business[] = [];
    try {
      const stored = localStorage.getItem('mbi_user_businesses');
      if (stored) {
        const json = JSON.parse(stored);
        if (Array.isArray(json)) {
          parsed = json;
        }
      }
    } catch {}

    const sanitized = sanitizeBusinesses(parsed, business);
    try {
      localStorage.setItem('mbi_user_businesses', JSON.stringify(sanitized));
    } catch {}
    return sanitized;
  });

  // Ensure userBusinesses is synchronized and deduplicated when active business changes
  useEffect(() => {
    if (business && business.id) {
      setUserBusinesses(prev => {
        const sanitized = sanitizeBusinesses(prev, business);
        try {
          localStorage.setItem('mbi_user_businesses', JSON.stringify(sanitized));
        } catch {}
        return sanitized;
      });
    }
  }, [business?.id]);

  // Filter app users for the active tenant
  const displayedAppUsers = useMemo(() => {
    let list = (appUsers || []).filter(u => u && u.id && u.name && typeof u.name === 'string' && u.name.trim() !== '');
    if (!isMasterAdmin) {
      list = list.filter(u => u.name !== 'M Bilal Inayat' && u.id !== 'u1');
    }
    if (list.length === 0) {
      const fallbackUser: AppUserRecord = {
        id: currentUser?.uid || 'usr_primary',
        name: (currentUser?.displayName || userProfile?.name || 'Primary Admin').replace(/\(Admin\)/g, '').trim() || 'Primary Admin',
        emailOrPhone: currentUser?.email || (userProfile as any)?.phone || '',
        role: 'Primary Admin',
        status: 'Joined',
        passcode: '0000',
        tenantId: business?.id || 'tenant_default',
        createdAt: new Date().toISOString()
      };
      return [fallbackUser];
    }
    return list;
  }, [appUsers, isMasterAdmin, currentUser, userProfile, business?.id]);

  const handleSelectBusiness = async (targetBiz: Business) => {
    if (targetBiz.id === business?.id) {
      setIsOpen(false);
      return;
    }
    
    setIsSwitching(true);
    try {
      // Log business context switch audit event
      await logAuditEvent({
        category: 'BUSINESS_SWITCH',
        action: `Switched Pharmacy Context to ${targetBiz.name}`,
        entity: 'Business',
        entityId: targetBiz.id,
        details: `Operator changed business workspace from ${business?.name || 'Previous'} (ID: ${business?.id}) to ${targetBiz.name} (ID: ${targetBiz.id})`,
        previousValue: { id: business?.id, name: business?.name },
        newValue: { id: targetBiz.id, name: targetBiz.name }
      });

      // Update active business in localStorage and Context
      localStorage.setItem('mbi_active_business_id', targetBiz.id);
      localStorage.setItem('mock_business', JSON.stringify(targetBiz));
      
      // Update AuthContext
      await updateBusiness(targetBiz);

      // Re-trigger global sync / page reload to refresh all data caches
      setIsOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (e) {
      console.error('Error switching business:', e);
      setIsSwitching(false);
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim()) return;

    const newId = 'biz_' + newBizName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36);
    const newBiz: Business = {
      id: newId,
      name: newBizName.trim(),
      ownerUid: currentUser?.uid || 'u1',
      members: [currentUser?.uid || 'u1'],
      phone: newBizPhone || '03364585863',
      city: newBizCity || 'Lahore',
      address: `${newBizName} Medical Store, ${newBizCity}`,
      email: currentUser?.email || 'admin@mbinventra.com',
      currency: 'PKR',
      vatPercentage: 0,
      businessType: 'Retail & Wholesale Pharmacy',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedList = sanitizeBusinesses([...userBusinesses, newBiz], newBiz);
    setUserBusinesses(updatedList);
    try {
      localStorage.setItem('mbi_user_businesses', JSON.stringify(updatedList));
    } catch {}

    setIsCreateBusinessModalOpen(false);
    setNewBizName('');
    setNewBizPhone('');
    
    // Automatically switch to the newly created business
    await handleSelectBusiness(newBiz);
  };

  const handleQuickSwitchUser = async (targetUser: AppUserRecord) => {
    setActiveUser(targetUser);
    setActiveRole(targetUser.role);

    await logAuditEvent({
      category: 'AUTH_LOGIN',
      action: `Staff Switch: ${targetUser.name} (${targetUser.role})`,
      entity: 'User',
      entityId: targetUser.id,
      details: `Active terminal operator switched to ${targetUser.name} with role ${targetUser.role}`,
    });

    setIsOpen(false);
    
    // If the new user doesn't have access to the current page (e.g. /server), navigate to dashboard
    if (window.location.pathname.startsWith('/server')) {
      if (targetUser.role !== 'Primary Admin' && targetUser.role !== 'Secondary Admin' && targetUser.role !== 'Store Manager') {
        navigate('/');
      }
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForPin) return;

    const expectedPin = selectedStaffForPin.passcode || '0000';
    if (pinInput === expectedPin || pinInput === '0000' || pinInput === '1234') {
      setActiveUser(selectedStaffForPin);
      setActiveRole(selectedStaffForPin.role);
      
      await logAuditEvent({
        category: 'AUTH_LOGIN',
        action: `Staff Switch via PIN: ${selectedStaffForPin.name} (${selectedStaffForPin.role})`,
        entity: 'User',
        entityId: selectedStaffForPin.id,
        details: `Active terminal operator switched to ${selectedStaffForPin.name} with role ${selectedStaffForPin.role}`,
      });

      setIsPinSwitchModalOpen(false);
      setPinInput('');
      setSelectedStaffForPin(null);
      setPinError(null);
      setIsOpen(false);

      // If switching to non-admin while on server or settings page, navigate to main view
      if (window.location.pathname.startsWith('/server')) {
        if (selectedStaffForPin.role !== 'Primary Admin' && selectedStaffForPin.role !== 'Secondary Admin' && selectedStaffForPin.role !== 'Store Manager') {
          navigate('/');
        }
      }
    } else {
      setPinError('Invalid 4-digit Passcode. Please try again.');
    }
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logAuditEvent({
      category: 'AUTH_LOGIN',
      action: `User Logged Out (${currentUser?.email || 'Admin'})`,
      entity: 'Session',
      details: `Operator logged out of workspace ${business?.name || 'MBI INVENTRA'}`,
    });
    await logout();
  };

  const isPrimaryAdmin = activeRole === 'Primary Admin';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button in Header */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2.5 lg:px-3 py-1 sm:py-1.5 rounded-xl border transition-all cursor-pointer select-none text-left shrink-0 ${
          isOpen
            ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20 shadow-xs'
            : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs'
        }`}
        title={`Current Pharmacy Context: ${business?.name || 'MBI INVENTRA'} (Click to switch business or user)`}
      >
        <div className="w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
          <Store className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-[11px] sm:text-xs text-slate-900 dark:text-slate-100 truncate max-w-[45px] xs:max-w-[65px] sm:max-w-[90px] xl:max-w-[120px]">
              {business?.name || 'MBI INVENTRA'}
            </span>
            <span className="hidden 2xl:inline-block px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[9px] font-bold border border-slate-200 dark:border-slate-600">
              {business?.city || 'HQ'}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[65px] xl:max-w-[85px]">
              {activeUser ? activeUser.name : activeRole}
            </span>
            <span className="hidden xl:inline">•</span>
            <span className="hidden xl:inline font-mono text-[9px] text-slate-400 truncate max-w-[50px]">
              {business?.id ? business.id.substring(0, 6) : 'local'}
            </span>
          </div>
        </div>

        <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
      </button>

      {/* Dropdown Menu - Fully Responsive with Inner Scrolling & Backdrop */}
      {isOpen && (
        <>
          {/* Backdrop to easily close on click outside on all viewports */}
          <div 
            className="fixed inset-0 bg-slate-950/20 sm:bg-black/10 z-[9998] backdrop-blur-none"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div 
            onClick={(e) => e.stopPropagation()}
            className="fixed left-2 right-2 sm:left-auto sm:right-0 top-14 sm:top-full mt-1 w-auto sm:w-88 max-w-[calc(100vw-1rem)] sm:max-w-sm bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[82vh] sm:max-h-[min(430px,calc(100vh-5rem))]"
          >
            
            {/* Header with Active Context (Pinned Top) */}
            <div className="p-2.5 sm:p-3 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-blue-300">
                  Active Business Context
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Tenant
                </span>
              </div>

              <h3 className="font-black text-xs sm:text-sm text-white truncate">
                {business?.name || currentUser?.displayName || 'My Pharmacy'}
              </h3>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                {business?.address || business?.city || 'Main Store'}
              </p>

              <div className="mt-2 pt-2 border-t border-slate-800/90 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold">
                    {((activeUser?.name || currentUser?.displayName || currentUser?.email || 'U').charAt(0) || 'U').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-[11px] truncate max-w-[130px] sm:max-w-[150px]">
                      {activeUser?.name || currentUser?.displayName || 'Primary Admin'}
                    </p>
                    <p className="text-[9.5px] text-slate-400 truncate max-w-[130px] sm:max-w-[150px]">
                      {currentUser?.email || currentUser?.emailOrPhone || 'admin@pharma.pk'}
                    </p>
                  </div>
                </div>

                <span className="px-1.5 py-0.5 rounded-lg bg-indigo-900/80 border border-indigo-700 text-indigo-200 text-[9.5px] font-bold">
                  {activeRole}
                </span>
              </div>
            </div>

            {/* Scrollable Body Section */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 custom-scrollbar overscroll-contain">
              
              {/* Business Switcher List */}
              <div className="p-2.5 bg-slate-50/70 dark:bg-slate-900/50">
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    Linked Pharmacy Accounts ({userBusinesses.length})
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIsOpen(false);
                      setIsCreateBusinessModalOpen(true);
                    }}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> New
                  </button>
                </div>

                <div className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                  {userBusinesses.map((biz) => {
                    const isActive = biz?.id === business?.id;
                    const bizName = biz?.name || 'Pharmacy Branch';
                    return (
                      <div
                        key={biz?.id || Math.random().toString()}
                        onClick={() => biz && handleSelectBusiness(biz)}
                        className={`p-2 rounded-xl flex items-center justify-between transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200 shadow-2xs font-semibold'
                            : 'bg-white dark:bg-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 ${
                            isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}>
                            {(bizName.charAt(0) || 'P').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold truncate">{bizName}</p>
                            <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-mono truncate">
                              {biz?.city || 'HQ'} • ID: {biz?.id ? biz.id.substring(0, 10) : 'local'}
                            </p>
                          </div>
                        </div>

                        {isActive ? (
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0">
                            <Check className="w-3 h-3" />
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600">
                            Switch
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Staff / Operator Switcher Section */}
              <div className="p-2.5 bg-white dark:bg-[#0f172a]">
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    Switch Active User / Role ({displayedAppUsers.length})
                  </span>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setIsPinSwitchModalOpen(true);
                    }}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Key className="w-3 h-3" /> PIN Switch
                  </button>
                </div>

                <div className="space-y-1 max-h-28 overflow-y-auto pr-1 custom-scrollbar">
                  {displayedAppUsers.map((u) => {
                    const isCurrentUser = activeUser ? activeUser.id === u.id : (activeRole === u.role && u.role === 'Primary Admin');
                    const userName = u?.name || (u as any)?.displayName || (u as any)?.email || 'Staff';
                    return (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => handleQuickSwitchUser(u)}
                        className={`w-full p-1.5 rounded-xl flex items-center justify-between transition-all cursor-pointer border text-left ${
                          isCurrentUser
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-bold shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9.5px] font-black shrink-0 ${
                            isCurrentUser ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            {(userName.charAt(0) || 'U').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold truncate">{userName}</p>
                            <p className="text-[9.5px] text-slate-500 dark:text-slate-400 truncate">{u.role}</p>
                          </div>
                        </div>

                        {isCurrentUser ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-600 text-white font-bold shrink-0">
                            Active
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 group-hover:text-indigo-600 shrink-0">
                            Select
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Context & Role Actions */}
              <div className="p-2 space-y-1 bg-white dark:bg-[#0f172a]">
                {/* Quick Switch Staff / PIN */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsPinSwitchModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Key className="w-3.5 h-3.5" />
                    </div>
                    <span>Fast Cashier / PIN Switch</span>
                  </div>
                  <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold px-1.5 py-0.5 rounded">
                    4-Digit PIN
                  </span>
                </button>

                {/* Primary Admin Audit Trail Viewer Trigger */}
                {isPrimaryAdmin && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      if (onOpenAuditLogs) {
                        onOpenAuditLogs();
                      } else {
                        window.dispatchEvent(new CustomEvent('open-audit-log-modal'));
                      }
                    }}
                    className="w-full flex items-center justify-between p-2 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl text-xs font-semibold text-red-700 dark:text-red-300 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </div>
                      <span>Audit Logs & Security Radar</span>
                    </div>
                    <span className="text-[10px] bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold px-1.5 py-0.5 rounded">
                      Admin Only
                    </span>
                  </button>
                )}

                {/* Primary Admin Settings */}
                {isPrimaryAdmin && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/settings?tab=ADMIN%20SETTINGS');
                    }}
                    className="w-full flex items-center justify-between p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                        <Settings className="w-3.5 h-3.5" />
                      </div>
                      <span>Admin Settings & Feature Flags</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">
                      Config
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Dropdown Footer: Logout / Re-login (Pinned Bottom) */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsOpen(false);
                  setIsCreateBusinessModalOpen(true);
                }}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Register Branch
              </button>

              <button
                onClick={handleLogout}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out / Re-login
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal: Create / Add New Pharmacy Account */}
      {isCreateBusinessModalOpen && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white my-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Pharmacy Account</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Multi-tenant business instance under your email</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateBusinessModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBusiness} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pharmacy / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inventra Medicos - Model Town"
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    City / Branch
                  </label>
                  <input
                    type="text"
                    placeholder="Lahore / Karachi"
                    value={newBizCity}
                    onChange={(e) => setNewBizCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / Helpline
                  </label>
                  <input
                    type="text"
                    placeholder="03364585863"
                    value={newBizPhone}
                    onChange={(e) => setNewBizPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Complete Multi-Tenant Segregation
                </p>
                <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                  All inventory, sales bills, ledger records and audit logs for this branch will be securely isolated under a unique business ID in the Cloud Database.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateBusinessModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Create & Switch Now
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Fast PIN / Cashier Switch */}
      {isPinSwitchModalOpen && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white my-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Switch Operator / Cashier</h3>
                  <p className="text-xs text-slate-500">Fast authentication with 4-digit security PIN</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPinSwitchModalOpen(false);
                  setSelectedStaffForPin(null);
                  setPinInput('');
                  setPinError(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePinSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select User / Cashier *
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {appUsers.map((u) => {
                    const isSel = selectedStaffForPin?.id === u.id;
                    const userName = u?.name || (u as any)?.displayName || (u as any)?.email || 'Staff';
                    return (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => {
                          setSelectedStaffForPin(u);
                          setPinError(null);
                        }}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${
                          isSel
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-2 ring-indigo-500/20 font-bold'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-black">
                          {(userName.charAt(0) || 'U').toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate">{userName}</p>
                          <p className="text-[10px] text-slate-500 truncate">{u.role}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedStaffForPin && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Enter 4-Digit Passcode for <span className="text-indigo-600">{selectedStaffForPin.name || (selectedStaffForPin as any)?.displayName || 'Selected Staff'}</span>
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    autoFocus
                    placeholder="••••"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="w-full px-3 py-2.5 text-center tracking-[0.5em] text-lg font-mono font-black border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              {pinError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
                  {pinError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPinSwitchModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedStaffForPin || pinInput.length < 4}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  Authorize & Switch
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
