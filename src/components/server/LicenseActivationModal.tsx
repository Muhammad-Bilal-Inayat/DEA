import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, 
  Sparkles, 
  Calendar, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  CheckCircle2, 
  Send, 
  X, 
  Zap, 
  Layers, 
  Building2, 
  Phone, 
  User, 
  Award,
  ChevronRight,
  Sliders,
  BadgePercent
} from 'lucide-react';
import { 
  MASTER_LICENSE_PRICING_CATALOG, 
  LicensePlanTier, 
  LicenseDurationType, 
  calculateLicenseExpiryDate, 
  getCatalogPrice, 
  formatPKR,
  buildWhatsAppLicenseConfirmation
} from '../../lib/licensePricingService';
import { 
  Tenant, 
  getAllTenants, 
  saveTenant, 
  activatePaidTenantLicense,
  logServerActivity,
  saveClientLicense,
  ClientLicense
} from '../../lib/masterServerService';
import { RegistrationLead } from '../../lib/registrationLeadsService';

interface LicenseActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTenant?: Tenant | null;
  initialLead?: RegistrationLead | null;
  onSuccess?: (message: string) => void;
}

export const LicenseActivationModal: React.FC<LicenseActivationModalProps> = ({
  isOpen,
  onClose,
  initialTenant,
  initialLead,
  onSuccess
}) => {
  const [tenants, setTenants] = useState<Tenant[]>(() => getAllTenants());
  const [selectedTenantId, setSelectedTenantId] = useState<string>(initialTenant?.id || '');
  
  // Lead info if activating from lead
  const [clientName, setClientName] = useState(initialTenant?.name || initialLead?.storeName || '');
  const [ownerName, setOwnerName] = useState(initialTenant?.ownerName || initialLead?.ownerName || '');
  const [phone, setPhone] = useState(initialTenant?.ownerPhone || initialLead?.phone || '');
  const [city, setCity] = useState(initialTenant?.city || initialLead?.city || 'Lahore');

  // Plan Selection
  const [selectedPlanTier, setSelectedPlanTier] = useState<LicensePlanTier>(
    (initialTenant?.plan as LicensePlanTier) || 'Pharmacy Pro'
  );

  // Duration Selection
  const [selectedDuration, setSelectedDuration] = useState<LicenseDurationType>('1_year');
  const [customDaysCount, setCustomDaysCount] = useState<number>(45);

  // Financial Deal & Price Overrides
  const [dealPrice, setDealPrice] = useState<number>(39990);
  const [amountPaid, setAmountPaid] = useState<number>(39990);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'EasyPaisa / JazzCash' | 'Cheque'>('Bank Transfer');
  const [autoShareWhatsApp, setAutoShareWhatsApp] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (initialTenant) {
      setSelectedTenantId(initialTenant.id);
      setClientName(initialTenant.name);
      setOwnerName(initialTenant.ownerName || '');
      setPhone(initialTenant.ownerPhone || '');
      setCity(initialTenant.city || 'Lahore');
    } else if (initialLead) {
      setClientName(initialLead.storeName);
      setOwnerName(initialLead.ownerName);
      setPhone(initialLead.phone);
      setCity(initialLead.city || 'Lahore');
    }
  }, [initialTenant, initialLead]);

  // Recalculate default catalog price when plan or duration changes
  useEffect(() => {
    const standardPrice = getCatalogPrice(selectedPlanTier, selectedDuration, customDaysCount);
    setDealPrice(standardPrice);
    setAmountPaid(standardPrice);
  }, [selectedPlanTier, selectedDuration, customDaysCount]);

  const expiryCalculation = useMemo(() => {
    return calculateLicenseExpiryDate(selectedDuration, customDaysCount);
  }, [selectedDuration, customDaysCount]);

  const balanceDue = useMemo(() => {
    return Math.max(0, (dealPrice || 0) - (amountPaid || 0));
  }, [dealPrice, amountPaid]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const licenseKey = `MBI-${selectedPlanTier.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4)}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiryDateStr = expiryCalculation.isLifetime ? 'Lifetime' : expiryCalculation.expiryDateStr;

    // 1. If existing tenant, upgrade tenant license
    if (selectedTenantId) {
      activatePaidTenantLicense(selectedTenantId, selectedPlanTier, expiryCalculation.days);
    }

    // 2. Save Client License in Master Registry
    const newLicense: ClientLicense = {
      id: `lic_${Date.now()}`,
      licenseKey,
      clientName: clientName || 'Retail Pharmacy',
      ownerName: ownerName || 'Store Owner',
      phone: phone || '03000000000',
      city: city || 'Lahore',
      plan: expiryCalculation.isLifetime ? 'Lifetime Perpetual' : (selectedPlanTier as any),
      status: 'Active',
      issueDate: new Date().toISOString().slice(0, 10),
      expiryDate: expiryDateStr,
      maxDevices: selectedPlanTier === 'Enterprise Multi-Branch' ? 20 : selectedPlanTier === 'Pharmacy Pro' ? 5 : 2,
      strictHardwareLock: true,
      maxOfflineDays: 30,
      boundHardwareIds: [],
      allowedModules: {
        sales: true,
        purchases: true,
        pharmacy: true,
        inventory: true,
        reports: true,
        cloudSync: selectedPlanTier !== 'Standard POS',
        multiBranch: selectedPlanTier === 'Enterprise Multi-Branch',
        aiVoice: selectedPlanTier !== 'Standard POS',
        cashierShifts: true,
        customPrint: true,
        accountsLedger: true,
        narcoticsSchedule: selectedPlanTier !== 'Standard POS',
        customerLoyalty: true,
        bulkExcel: true,
        barcodeLabels: true
      },
      salePrice: dealPrice,
      amountPaid: amountPaid,
      amountDue: balanceDue,
      saleStatus: balanceDue === 0 ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Pending',
      paymentMethod,
      saleDate: new Date().toISOString().slice(0, 10),
      notes: notes || `Activated ${selectedPlanTier} for ${selectedDuration}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveClientLicense(newLicense);

    // 3. Log Server Activity
    logServerActivity({
      tenantId: selectedTenantId || 'new_tenant',
      tenantName: clientName,
      userId: 'usr_master_admin',
      userName: 'Master Admin',
      userRole: 'Admin',
      ipAddress: '127.0.0.1',
      action: 'LICENSE_PLAN_UPGRADE',
      actionType: 'ADMIN',
      details: `Activated ${selectedPlanTier} (${selectedDuration}, Expiry: ${expiryDateStr}) for ${clientName} - Price: Rs. ${dealPrice}`,
      status: 'SUCCESS',
      deviceInfo: 'Master Server Activation Console'
    });

    // 4. WhatsApp Sharing
    if (autoShareWhatsApp && phone) {
      const waText = buildWhatsAppLicenseConfirmation({
        clientName,
        ownerName,
        phone,
        planName: selectedPlanTier,
        durationType: selectedDuration,
        durationLabel: selectedDuration === 'custom' ? `${customDaysCount} Days` : selectedDuration.replace('_', ' ').toUpperCase(),
        expiryDate: expiryDateStr,
        licenseKey,
        agreedPrice: dealPrice,
        amountPaid,
        amountDue: balanceDue,
        paymentMethod
      });

      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const phoneWithCode = cleanPhone.startsWith('92') ? cleanPhone : cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;
      window.open(`https://api.whatsapp.com/send?phone=${phoneWithCode}&text=${waText}`, '_blank');
    }

    onSuccess?.(`License successfully activated for "${clientName}"! (${selectedPlanTier} - ${expiryDateStr})`);
    onClose();
  };

  const currentPlanMeta = MASTER_LICENSE_PRICING_CATALOG[selectedPlanTier];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 my-auto">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-t-3xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">Master License Activation &amp; Pricing</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  OFFICIAL RATES
                </span>
              </div>
              <p className="text-xs text-slate-300">Issue paid license keys, select durations, apply rates, and generate deal agreements.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* STEP 1: CLIENT & PHARMACY PROFILE */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span>1. Client &amp; Store Credentials</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Store / Pharmacy Name *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Al-Razi Pharmacy"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Owner Full Name *</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Dr. Salman Khan"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">WhatsApp / Mobile *</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03001234567"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Lahore"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* STEP 2: CHOOSE PLAN (3 CORE PLANS) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>2. Select Core License Plan Tier</span>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">3 Official Editions</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['Standard POS', 'Pharmacy Pro', 'Enterprise Multi-Branch'] as LicensePlanTier[]).map((planKey) => {
                const plan = MASTER_LICENSE_PRICING_CATALOG[planKey];
                const isSelected = selectedPlanTier === planKey;

                return (
                  <div
                    key={planKey}
                    onClick={() => setSelectedPlanTier(planKey)}
                    className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-lg shadow-indigo-600/10 ring-2 ring-indigo-400/30' 
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {planKey === 'Pharmacy Pro' && (
                      <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs">
                        POPULAR ⭐
                      </span>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{plan.planName}</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-400'}`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                        {plan.tagline}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-750 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-500 dark:text-slate-400">1-Year Rate:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {formatPKR(plan.rates['1_year'].pricePkr)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: SUBSCRIPTION DURATION & PRICING MATRIX */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span>3. Subscription Duration &amp; Official Rates</span>
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                Computed Expiry: {expiryCalculation.isLifetime ? 'Lifetime Perpetual' : expiryCalculation.expiryDateStr}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {/* 2 Days */}
              <button
                type="button"
                onClick={() => setSelectedDuration('2_days')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedDuration === '2_days'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 ring-2 ring-emerald-400/40 text-emerald-950 dark:text-emerald-100'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100'
                }`}
              >
                <div className="text-[11px] font-extrabold uppercase">2 Days Demo</div>
                <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1">FREE</div>
              </button>

              {/* 7 Days */}
              <button
                type="button"
                onClick={() => setSelectedDuration('7_days')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedDuration === '7_days'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 ring-2 ring-emerald-400/40 text-emerald-950 dark:text-emerald-100'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100'
                }`}
              >
                <div className="text-[11px] font-extrabold uppercase">7 Days Trial</div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-100 mt-1">
                  {formatPKR(currentPlanMeta.rates['7_days'].pricePkr)}
                </div>
              </button>

              {/* 15 Days */}
              <button
                type="button"
                onClick={() => setSelectedDuration('15_days')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedDuration === '15_days'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 ring-2 ring-emerald-400/40 text-emerald-950 dark:text-emerald-100'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100'
                }`}
              >
                <div className="text-[11px] font-extrabold uppercase">15 Days</div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-100 mt-1">
                  {formatPKR(currentPlanMeta.rates['15_days'].pricePkr)}
                </div>
              </button>

              {/* 30 Days (1 Month) */}
              <button
                type="button"
                onClick={() => setSelectedDuration('30_days')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedDuration === '30_days'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 ring-2 ring-emerald-400/40 text-emerald-950 dark:text-emerald-100'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100'
                }`}
              >
                <div className="text-[11px] font-extrabold uppercase">30 Days (1 Mo)</div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-100 mt-1">
                  {formatPKR(currentPlanMeta.rates['30_days'].pricePkr)}
                </div>
              </button>

              {/* 1 Year */}
              <button
                type="button"
                onClick={() => setSelectedDuration('1_year')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedDuration === '1_year'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 ring-2 ring-emerald-400/40 text-emerald-950 dark:text-emerald-100 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase">1 Year</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold">17% OFF</span>
                </div>
                <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatPKR(currentPlanMeta.rates['1_year'].pricePkr)}
                </div>
              </button>

              {/* 3 Years */}
              <button
                type="button"
                onClick={() => setSelectedDuration('3_years')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedDuration === '3_years'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 ring-2 ring-emerald-400/40 text-emerald-950 dark:text-emerald-100'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase">3 Years</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-600 dark:text-blue-300 font-bold">25% OFF</span>
                </div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-100 mt-1">
                  {formatPKR(currentPlanMeta.rates['3_years'].pricePkr)}
                </div>
              </button>

              {/* 5 Years */}
              <button
                type="button"
                onClick={() => setSelectedDuration('5_years')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedDuration === '5_years'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 ring-2 ring-emerald-400/40 text-emerald-950 dark:text-emerald-100'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase">5 Years</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold">30% OFF</span>
                </div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-100 mt-1">
                  {formatPKR(currentPlanMeta.rates['5_years'].pricePkr)}
                </div>
              </button>

              {/* Lifetime Perpetual */}
              <button
                type="button"
                onClick={() => setSelectedDuration('lifetime')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedDuration === 'lifetime'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50 ring-2 ring-purple-400/40 text-purple-950 dark:text-purple-100 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100'
                }`}
              >
                <div className="text-[11px] font-extrabold uppercase text-purple-600 dark:text-purple-400">Lifetime</div>
                <div className="text-xs font-black text-purple-700 dark:text-purple-300 mt-1">
                  {formatPKR(currentPlanMeta.rates['lifetime'].pricePkr)}
                </div>
              </button>

              {/* Custom Days */}
              <button
                type="button"
                onClick={() => setSelectedDuration('custom')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between col-span-2 sm:col-span-1 ${
                  selectedDuration === 'custom'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-indigo-400/40 text-indigo-950 dark:text-indigo-100'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100'
                }`}
              >
                <div className="text-[11px] font-extrabold uppercase">Custom Days</div>
                <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {customDaysCount} Days
                </div>
              </button>
            </div>

            {selectedDuration === 'custom' && (
              <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 flex items-center gap-3">
                <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300 whitespace-nowrap">
                  Enter Custom Days:
                </div>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={customDaysCount}
                  onChange={(e) => setCustomDaysCount(parseInt(e.target.value) || 1)}
                  className="w-32 px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl text-xs font-mono font-bold"
                />
                <span className="text-xs text-slate-500">
                  Calculated Expiry: <strong>{expiryCalculation.expiryDateStr}</strong>
                </span>
              </div>
            )}
          </div>

          {/* STEP 4: FINANCIAL DEAL SETTLEMENT */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>4. Software Deal Agreement &amp; Payment (PKR)</span>
              </div>
              <span className="text-[11px] text-slate-500 font-semibold">Custom Discount Supported</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Agreed Deal Price (PKR) *</label>
                <input
                  type="number"
                  value={dealPrice}
                  onChange={(e) => setDealPrice(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Amount Received (PKR) *</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Balance Due (PKR)</label>
                <div className={`px-3 py-2 rounded-xl border text-xs font-mono font-black ${balanceDue > 0 ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-700 dark:text-amber-300' : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300'}`}>
                  {formatPKR(balanceDue)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100"
                >
                  <option value="Bank Transfer">Bank Transfer (Direct IBFT)</option>
                  <option value="Cash">Cash in Hand</option>
                  <option value="EasyPaisa / JazzCash">EasyPaisa / JazzCash Mobile</option>
                  <option value="Cheque">Bank Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">License Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 5-branch multi-counter setup"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="autoWaShare"
                checked={autoShareWhatsApp}
                onChange={(e) => setAutoShareWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="autoWaShare" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auto-generate and share official WhatsApp License Confirmation with client</span>
              </label>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black tracking-wide uppercase transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Activate Paid License Now</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
