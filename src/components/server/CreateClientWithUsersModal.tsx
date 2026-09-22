import React, { useState } from 'react';
import { 
  Building2, 
  User, 
  Phone, 
  MapPin, 
  Key, 
  ShieldCheck, 
  Laptop, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Plus, 
  Trash2, 
  X, 
  Send, 
  Copy, 
  Check, 
  Lock, 
  Calendar,
  Sparkles,
  Users
} from 'lucide-react';
import { 
  Tenant, 
  saveTenant, 
  createMasterActiveUser, 
  generateNewLicenseKey, 
  saveClientLicense,
  logMasterAudit,
  logServerActivity,
  DEFAULT_TENANT_FEATURE_TOGGLES,
  DEFAULT_MODULES
} from '../../lib/masterServerService';
import { v4 as uuidv4 } from 'uuid';

interface SubUserEntry {
  name: string;
  role: 'Primary Admin' | 'Cashier' | 'Pharmacist' | 'Manager' | 'Accountant';
  username: string;
  passcode: string;
}

interface CreateClientWithUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (tenant: Tenant, subUsers: SubUserEntry[]) => void;
}

export const CreateClientWithUsersModal: React.FC<CreateClientWithUsersModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  // Store Information
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Lahore');
  const [address, setAddress] = useState('');

  // Plan & Duration
  const [plan, setPlan] = useState<'Standard POS' | 'Pharmacy Pro' | 'Enterprise Multi-Branch'>('Pharmacy Pro');
  const [durationPreset, setDurationPreset] = useState<string>('30_days');
  const [customDays, setCustomDays] = useState<number>(30);
  const [licenseKey, setLicenseKey] = useState(() => generateNewLicenseKey('Pharmacy Pro'));

  // Hardware Device Lock
  const [maxDevices, setMaxDevices] = useState<number>(1);
  const [primaryDeviceType, setPrimaryDeviceType] = useState<'Desktop' | 'Laptop' | 'Mobile' | 'Tablet'>('Laptop');
  const [autoBindOnLogin, setAutoBindOnLogin] = useState<boolean>(true);

  // Sub-Users List
  const [subUsers, setSubUsers] = useState<SubUserEntry[]>([
    { name: 'Store Owner (Admin)', role: 'Primary Admin', username: 'admin', passcode: '0000' },
    { name: 'Billing Cashier Counter 1', role: 'Cashier', username: 'cashier1', passcode: '1111' }
  ]);

  // Created Result State
  const [createdSummary, setCreatedSummary] = useState<{
    tenant: Tenant;
    whatsappMessage: string;
    loginUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleAddSubUser = () => {
    const nextIdx = subUsers.length + 1;
    setSubUsers([
      ...subUsers,
      {
        name: `Operator / Staff ${nextIdx}`,
        role: 'Cashier',
        username: `staff${nextIdx}`,
        passcode: `${nextIdx}${nextIdx}${nextIdx}${nextIdx}`
      }
    ]);
  };

  const handleRemoveSubUser = (index: number) => {
    if (subUsers.length <= 1) return;
    setSubUsers(subUsers.filter((_, i) => i !== index));
  };

  const handleSubUserChange = (index: number, field: keyof SubUserEntry, value: string) => {
    const updated = [...subUsers];
    (updated[index] as any)[field] = value;
    setSubUsers(updated);
  };

  const calculateExpiryDate = (): string => {
    const now = new Date();
    switch (durationPreset) {
      case '2_days':
        now.setDate(now.getDate() + 2);
        return now.toISOString().slice(0, 10);
      case '7_days':
        now.setDate(now.getDate() + 7);
        return now.toISOString().slice(0, 10);
      case '15_days':
        now.setDate(now.getDate() + 15);
        return now.toISOString().slice(0, 10);
      case '30_days':
        now.setDate(now.getDate() + 30);
        return now.toISOString().slice(0, 10);
      case '1_year':
        now.setDate(now.getDate() + 365);
        return now.toISOString().slice(0, 10);
      case '3_years':
        now.setDate(now.getDate() + 365 * 3);
        return now.toISOString().slice(0, 10);
      case '5_years':
        now.setDate(now.getDate() + 365 * 5);
        return now.toISOString().slice(0, 10);
      case 'lifetime':
        return 'Lifetime';
      case 'custom':
        now.setDate(now.getDate() + (customDays || 30));
        return now.toISOString().slice(0, 10);
      default:
        now.setDate(now.getDate() + 30);
        return now.toISOString().slice(0, 10);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !ownerName.trim() || !phone.trim()) {
      alert('Please fill in Store Name, Owner Name, and Contact Number.');
      return;
    }

    const tenantId = 't_' + uuidv4().replace(/-/g, '').substring(0, 8);
    const primaryAdminId = 'usr_' + uuidv4().replace(/-/g, '').substring(0, 8);
    const expiryDateStr = calculateExpiryDate();

    // 1. Create Tenant Record
    const newTenant: Tenant = {
      id: tenantId,
      tenantId: tenantId,
      organizationId: 'org_' + tenantId,
      name: storeName.trim(),
      ownerName: ownerName.trim(),
      ownerPhone: phone.trim(),
      ownerEmail: email.trim() || `${phone.replace(/\D/g, '')}@pharma.pk`,
      city: city.trim(),
      address: address.trim() || `${city}, Pakistan`,
      plan: plan,
      status: 'Active',
      trialStartDate: new Date().toISOString().slice(0, 10),
      trialExpiryDate: expiryDateStr,
      isTrialActive: false,
      trialExpired: false,
      paidLicenseActive: true,
      licenseId: licenseKey,
      primaryAdminId: primaryAdminId,
      primaryAdminEmail: email.trim() || `${phone.replace(/\D/g, '')}@pharma.pk`,
      maxDevices: maxDevices || 1,
      featureToggles: DEFAULT_TENANT_FEATURE_TOGGLES,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalInvoicesCount: 0,
      totalProductsCount: 0,
      totalPartiesCount: 0
    };
    saveTenant(newTenant);

    // 2. Save Client License in Master Registry
    saveClientLicense({
      id: 'lic_' + uuidv4().replace(/-/g, '').substring(0, 8),
      licenseKey: licenseKey,
      clientName: storeName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      city: city.trim(),
      plan: plan,
      status: 'Active',
      issueDate: new Date().toISOString().slice(0, 10),
      expiryDate: expiryDateStr,
      maxDevices: maxDevices || 1,
      strictHardwareLock: true,
      maxOfflineDays: 14,
      boundHardwareIds: [],
      allowedModules: { ...DEFAULT_MODULES },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 3. Create Master Active Sub-Users
    subUsers.forEach((u, idx) => {
      const uRole = u.role === 'Primary Admin' ? 'Primary Admin' : u.role === 'Manager' ? 'Store Manager' : u.role === 'Pharmacist' ? 'Sales Staff' : 'Cashier';
      createMasterActiveUser({
        name: u.name.trim(),
        role: uRole as any,
        emailOrPhone: u.username.trim() === 'admin' ? phone.trim() : `${u.username.trim()}@${tenantId}`,
        storeName: storeName.trim(),
        passcode: u.passcode.trim(),
        status: 'Active',
        isOnline: false,
        lastSyncTime: new Date().toISOString()
      });
    });

    // 4. Log Master Audit
    logMasterAudit(
      'Client & Sub-Users Created',
      'LICENSE',
      `Registered new tenant "${storeName}" with ${subUsers.length} sub-users and 1-Device Hardware Lock policy.`,
      tenantId
    );

    logServerActivity({
      tenantId: tenantId,
      tenantName: storeName,
      userId: 'usr_master_admin',
      userName: 'Master Admin',
      userRole: 'Admin',
      ipAddress: 'Master Control Hub',
      action: 'TENANT_ONBOARDED',
      actionType: 'ADMIN',
      details: `New client onboarded: ${storeName} (${ownerName}, ${phone}) with license ${licenseKey} (Valid till ${expiryDateStr}).`,
      status: 'SUCCESS'
    });

    // 5. Generate Welcome WhatsApp Message
    const hostUrl = window.location.origin;
    const cleanPhone = phone.replace(/\D/g, '');
    const waText = 
`*MBI INVENTRA - OFFICIAL CLIENT ONBOARDING & LICENSE KIT* 🏥💼
════════════════════════════════════
Salam *${ownerName}* Sahib! Aapka Pharmacy POS System Server par kamyabi se active ho gaya ha.

🏢 *Store Name:* ${storeName}
📍 *City:* ${city}
💎 *Plan:* ${plan}
📅 *Validity:* ${expiryDateStr}
🔑 *License Key:* \`${licenseKey}\`

🌐 *Software Web Portal:*
${hostUrl}

👤 *AUTHORIZED USERS & PASSCODES:*
${subUsers.map(u => `• *${u.role}:* ${u.name} (Username: \`${u.username}\` | Passcode: \`${u.passcode}\`)`).join('\n')}

🔒 *HARDWARE SECURITY & 1-DEVICE LOCK:*
Aapka account strictly *1 Authorized Terminal (${primaryDeviceType})* ke sath lock ha. Pehli martaba login karne par ye device auto-detect ho kar bind ho jaye gi. Kisi doosri device par Master Admin ki permission ke baghir software nahi chalay ga.

📞 *Master Support & Helpline:*
0336-4585863 / 0328-1302636
════════════════════════════════════
*Mastermind By Ali (MBI) - Powered by M Bilal Inayat*`;

    setCreatedSummary({
      tenant: newTenant,
      whatsappMessage: waText,
      loginUrl: hostUrl
    });

    onCreated(newTenant, subUsers);
  };

  const handleCopyMessage = () => {
    if (!createdSummary) return;
    navigator.clipboard.writeText(createdSummary.whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpenWhatsApp = () => {
    if (!createdSummary) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(createdSummary.whatsappMessage);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Add New Client (Direct Contact Setup)</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Onboard tenant, configure sub-users, set validity, and bind strict 1-device hardware lock.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {createdSummary ? (
          /* SUCCESS ONBOARDING SUMMARY & WHATSAPP SHARE SCREEN */
          <div className="p-6 space-y-5">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-200">
              <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-sm font-black">Client &amp; Sub-Users Successfully Registered!</h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Tenant <span className="font-bold">{createdSummary.tenant.name}</span> is live on the server. Send the login credentials and device lock kit to the client below.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>WhatsApp Welcome Message &amp; Access Kit:</span>
                <span className="text-[11px] text-slate-400 font-normal">Ready to send via WhatsApp</span>
              </label>
              <textarea
                readOnly
                rows={10}
                value={createdSummary.whatsappMessage}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="w-full sm:flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send on WhatsApp ({phone})</span>
              </button>

              <button
                type="button"
                onClick={handleCopyMessage}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Message'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
            
            {/* 1. Client / Store Identity */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                <span>1. Store &amp; Owner Identity</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Store / Pharmacy Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Al-Madina Pharmacy &amp; Clinic"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Owner Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Haji Muhammad Tariq"
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp / Contact Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 03001234567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lahore / Sargodha / Faisalabad"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. License Plan & Duration Selection */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span>2. License Plan &amp; Validity Duration</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Software Edition Plan
                  </label>
                  <select
                    value={plan}
                    onChange={e => {
                      const p = e.target.value as any;
                      setPlan(p);
                      setLicenseKey(generateNewLicenseKey(p));
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="Standard POS">Standard POS Edition</option>
                    <option value="Pharmacy Pro">Pharmacy Pro Edition</option>
                    <option value="Enterprise Multi-Branch">Enterprise Multi-Branch Edition</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Duration Period
                  </label>
                  <select
                    value={durationPreset}
                    onChange={e => setDurationPreset(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="2_days">2 Days Quick Trial</option>
                    <option value="7_days">7 Days Week Evaluation</option>
                    <option value="15_days">15 Days Fortnight Plan</option>
                    <option value="30_days">30 Days (1 Month Pro)</option>
                    <option value="1_year">1 Year Annual License</option>
                    <option value="3_years">3 Years Long-term Pro</option>
                    <option value="5_years">5 Years Enterprise Lock</option>
                    <option value="lifetime">Lifetime Unlimited Access</option>
                    <option value="custom">Custom Specified Days</option>
                  </select>
                </div>
              </div>

              {durationPreset === 'custom' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Specify Custom Days:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={customDays}
                    onChange={e => setCustomDays(Number(e.target.value))}
                    className="w-full max-w-xs px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
              )}

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>License Key: <strong className="font-mono">{licenseKey}</strong></span>
                </div>
                <span className="font-bold">Expires: {calculateExpiryDate()}</span>
              </div>
            </div>

            {/* 3. Strict 1-Device Hardware Binding Policy */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-rose-500" />
                <span>3. Hardware Device Lock &amp; Auto-Detection Policy</span>
              </h3>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Strict 1-Device Auto-Binding on First Login</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Automatically detects client's hardware on login. Any 2nd device/IP will be blocked with IP Error.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoBindOnLogin}
                    onChange={e => setAutoBindOnLogin(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                      Allowed Hardware Terminals:
                    </label>
                    <select
                      value={maxDevices}
                      onChange={e => setMaxDevices(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value={1}>Strictly 1 Device (Recommended)</option>
                      <option value={2}>2 Terminals (Counter 1 + Mobile)</option>
                      <option value={3}>3 Terminals (Multi-Counter)</option>
                      <option value={5}>5 Terminals (Enterprise)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                      Primary Client Device Type:
                    </label>
                    <select
                      value={primaryDeviceType}
                      onChange={e => setPrimaryDeviceType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="Laptop">Laptop Terminal</option>
                      <option value="Desktop">Desktop PC Counter</option>
                      <option value="Mobile">Mobile Phone Station</option>
                      <option value="Tablet">Tablet POS Pad</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Sub-Users & Passcodes Management */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>4. Sub-Users &amp; Passcodes ({subUsers.length})</span>
                </h3>

                <button
                  type="button"
                  onClick={handleAddSubUser}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[11px] font-bold flex items-center gap-1 hover:bg-blue-100 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Sub-User</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {subUsers.map((u, idx) => (
                  <div 
                    key={idx} 
                    className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                        User Name
                      </label>
                      <input
                        type="text"
                        value={u.name}
                        onChange={e => handleSubUserChange(idx, 'name', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                        Role
                      </label>
                      <select
                        value={u.role}
                        onChange={e => handleSubUserChange(idx, 'role', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                      >
                        <option value="Primary Admin">Primary Admin</option>
                        <option value="Cashier">Billing Cashier</option>
                        <option value="Pharmacist">Pharmacist</option>
                        <option value="Manager">Store Manager</option>
                        <option value="Accountant">Accountant</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                        Username / ID
                      </label>
                      <input
                        type="text"
                        value={u.username}
                        onChange={e => handleSubUserChange(idx, 'username', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                          Passcode (PIN)
                        </label>
                        <input
                          type="text"
                          maxLength={8}
                          value={u.passcode}
                          onChange={e => handleSubUserChange(idx, 'passcode', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
                        />
                      </div>

                      {subUsers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSubUser(idx)}
                          className="mt-4 p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="Remove user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer transition"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Create Client &amp; Issue License</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
