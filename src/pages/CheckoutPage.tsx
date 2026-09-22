import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  PackageCheck, 
  ShieldCheck, 
  CheckCircle2, 
  Upload, 
  Copy, 
  Check, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Lock, 
  CreditCard, 
  MessageSquare, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  HelpCircle,
  Clock,
  QrCode,
  DollarSign,
  Sun,
  Moon,
  AlertCircle,
  Trash2,
  Maximize2,
  X
} from 'lucide-react';
import { PAYMENT_ACCOUNTS, saveCheckoutOrder } from '../lib/checkoutOrderService';
import { getSaaSPlans } from '../lib/planLimitsService';
import { getSiteCmsConfig } from '../lib/siteCmsService';
import { SaaSPlanDefinition, SaaSPlanPricing } from '../types';

export const CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Theme State
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('theme') !== 'light';
  });

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    localStorage.setItem('theme', nextDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', nextDark);
  };

  // CMS Brand Logo
  const cmsConfig = getSiteCmsConfig();
  const brandLogo = cmsConfig?.brand?.logoUrl || '';

  // SaaS Plans from /server with live sync bridge
  const [saasPlans, setSaasPlans] = useState<SaaSPlanDefinition[]>(() => getSaaSPlans());

  useEffect(() => {
    setSaasPlans(getSaaSPlans());
    const handleSync = () => {
      setSaasPlans(getSaaSPlans());
    };
    window.addEventListener('saas-plans-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('saas-plans-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Selected Plan State
  const initialPlan = (searchParams.get('plan') as any) || 'business';
  const initialInterval = (searchParams.get('interval') as any) || '1year';

  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'business' | 'premium'>(initialPlan);
  const [billingInterval, setBillingInterval] = useState<'monthly' | '1year' | '3years' | '5years'>(initialInterval);

  // Form Input States
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Real-time Validation States
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Payment Selection & Proof States
  const [paymentMethod, setPaymentMethod] = useState<'Meezan Bank' | 'UBL Bank' | 'JazzCash' | 'EasyPaisa' | 'NayaPay' | 'SadaPay' | 'Binance Crypto'>('Meezan Bank');
  const [trxId, setTrxId] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<string>('');
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  const [screenshotFileName, setScreenshotFileName] = useState<string>('');
  const [screenshotFileSize, setScreenshotFileSize] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showZoomModal, setShowZoomModal] = useState<boolean>(false);
  const [notes, setNotes] = useState('');

  // UI States
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);

  // Real-time validation rule handler
  const validateField = (name: string, value: string): string => {
    if (name === 'businessName') {
      if (!value.trim()) return 'Pharmacy or store name is required';
      if (value.trim().length < 3) return 'Name must be at least 3 characters';
    }
    if (name === 'ownerName') {
      if (!value.trim()) return 'Owner or Pharmacist name is required';
      if (value.trim().length < 3) return 'Name must be at least 3 characters';
    }
    if (name === 'whatsapp') {
      if (!value.trim()) return 'WhatsApp number is required';
      const cleaned = value.replace(/[^0-9+]/g, '');
      if (cleaned.length < 10) return 'Valid mobile number required (e.g. 03281302636)';
    }
    if (name === 'email') {
      if (!value.trim()) return 'Email address is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Please enter a valid email address';
    }
    if (name === 'paymentScreenshot') {
      if (!value) return 'Payment receipt screenshot proof is required';
    }
    return '';
  };

  const markTouched = (name: string) => {
    setTouchedFields(prev => ({ ...prev, [name]: true }));
  };

  const getFieldError = (name: string, val: string): string => {
    if (!touchedFields[name]) return '';
    return validateField(name, val);
  };

  const isFieldValid = (name: string, val: string): boolean => {
    return !!touchedFields[name] && validateField(name, val) === '';
  };

  // Required fields completion progress
  const requiredFields = [
    { name: 'businessName', label: 'Pharmacy Name', val: businessName },
    { name: 'ownerName', label: 'Owner Name', val: ownerName },
    { name: 'whatsapp', label: 'WhatsApp', val: whatsapp },
    { name: 'email', label: 'Email', val: email },
    { name: 'paymentScreenshot', label: 'Payment SS Proof', val: paymentScreenshot },
  ];
  const validFieldsCount = requiredFields.filter(f => validateField(f.name, f.val) === '').length;
  const progressPercentage = Math.round((validFieldsCount / requiredFields.length) * 100);

  // File Processor for Drag & Drop / Input File Select
  const processUploadedFile = (file: File) => {
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB. Please upload a smaller screenshot.');
        return;
      }
      setScreenshotFileName(file.name);
      setScreenshotFileSize(`${(file.size / 1024).toFixed(1)} KB`);

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPaymentScreenshot(base64);
        setScreenshotPreview(base64);
        markTouched('paymentScreenshot');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
  };

  const handleDropScreenshot = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processUploadedFile(file);
  };

  // Dynamic plan pricing sync
  const currentPlanDef = React.useMemo(() => {
    return saasPlans.find(p => p.id.toLowerCase() === selectedPlan) || saasPlans[1] || saasPlans[0];
  }, [saasPlans, selectedPlan]);

  const planPricing = React.useMemo(() => {
    const monthlyBase = currentPlanDef?.pricing?.monthly ?? 3500;

    let discountPct = 0;
    let months = 1;
    let pricingKey: keyof SaaSPlanPricing = 'monthly';

    if (billingInterval === 'monthly') { discountPct = 0; months = 1; pricingKey = 'monthly'; }
    if (billingInterval === '1year') { discountPct = 30; months = 12; pricingKey = 'yearly'; }
    if (billingInterval === '3years') { discountPct = 40; months = 36; pricingKey = 'threeYears'; }
    if (billingInterval === '5years') { discountPct = 50; months = 60; pricingKey = 'fiveYears'; }

    let finalTotal = currentPlanDef?.pricing?.[pricingKey] ?? Math.round(monthlyBase * months * (1 - discountPct / 100));
    const rawTotal = monthlyBase * months;

    return {
      monthlyBase: monthlyBase || 0,
      discountPct,
      months,
      finalTotal: finalTotal || 0,
      savings: Math.max(0, rawTotal - (finalTotal || 0))
    };
  }, [currentPlanDef, billingInterval]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmitCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    // Mark all required fields touched
    setTouchedFields({
      businessName: true,
      ownerName: true,
      whatsapp: true,
      email: true,
      paymentScreenshot: true,
    });

    const bErr = validateField('businessName', businessName);
    const oErr = validateField('ownerName', ownerName);
    const wErr = validateField('whatsapp', whatsapp);
    const eErr = validateField('email', email);
    const sErr = validateField('paymentScreenshot', paymentScreenshot);

    if (bErr || oErr || wErr || eErr || sErr) {
      alert(`Validation Error: Please fix input errors before submitting.\n• ${bErr || oErr || wErr || eErr || sErr}`);
      return;
    }

    setIsSubmitting(true);

    const planName = currentPlanDef?.name || (
      selectedPlan === 'basic' ? 'Basic Single Terminal' :
      selectedPlan === 'business' ? 'Business Multi-Terminal POS' : 'Premium Enterprise Chain'
    );

    const order = saveCheckoutOrder({
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim(),
      city: city.trim() || 'Pakistan',
      username: username.trim() || ownerName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      planId: selectedPlan,
      planName,
      billingInterval,
      amountRupees: planPricing.finalTotal,
      paymentMethod,
      paymentScreenshot,
      trxId: trxId.trim() || `TRX-${Date.now().toString().slice(-6)}`,
      notes: notes.trim(),
    });

    setIsSubmitting(false);
    setSubmittedOrder(order);
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 font-sans selection:bg-emerald-500 selection:text-white ${
      isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${
        isDark ? 'bg-[#131d33]/90 border-slate-800' : 'bg-white/90 border-slate-200 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            {brandLogo ? (
              <img src={brandLogo} alt="MBI Inventra Logo" className="w-10 h-10 rounded-2xl object-cover shadow-md" />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 group-hover:bg-blue-500 transition">
                <PackageCheck className="w-6 h-6" />
              </div>
            )}
            <div>
              <span className={`text-lg font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span>MBI INVENTRA</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  OFFICIAL CHECKOUT
                </span>
              </span>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Software Subscription & License Activation
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              to="/"
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Order Submitted Success Modal */}
        {submittedOrder ? (
          <div className={`max-w-2xl mx-auto p-8 rounded-3xl border shadow-2xl space-y-6 text-center animate-fadeIn ${
            isDark ? 'bg-slate-900 border-emerald-500/40' : 'bg-white border-emerald-500/50'
          }`}>
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Order Reference: {submittedOrder.id}
              </span>
              <h2 className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Payment Proof Submitted Successfully!
              </h2>
              <p className={`text-xs leading-relaxed max-w-lg mx-auto ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Thank you <strong>{submittedOrder.ownerName}</strong>! Your subscription request for <strong>{submittedOrder.businessName}</strong> has been received by M.Bilal Inayat.
              </p>
            </div>

            <div className={`p-4 rounded-2xl border text-left text-xs space-y-2 font-mono ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`flex justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Plan Selected:</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{submittedOrder.planName} ({submittedOrder.billingInterval})</span>
              </div>
              <div className={`flex justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Total Paid:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Rs. {submittedOrder.amountRupees.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Payment Method:</span>
                <span className={isDark ? 'text-white' : 'text-slate-900'}>{submittedOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Verification Status:</span>
                <span className="text-amber-500 font-bold animate-pulse">Pending SS Verification (~5-15 Mins)</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <a
                href={`https://wa.me/923281302636?text=${encodeURIComponent(
                  `Assalam-o-Alaikum M.Bilal Inayat,\n` +
                  `I have submitted payment screenshot for my software order ${submittedOrder.id}.\n\n` +
                  `Business: ${submittedOrder.businessName}\n` +
                  `Plan: ${submittedOrder.planName}\n` +
                  `Amount: Rs. ${submittedOrder.amountRupees.toLocaleString()}\n\n` +
                  `Please verify screenshot and approve my software license.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 transition cursor-pointer"
              >
                <MessageSquare className="w-5 h-5" />
                <span>SEND PAYMENT SCREENSHOT ON WHATSAPP NOW</span>
              </a>

              <Link
                to="/"
                className={`inline-block text-xs font-bold pt-2 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Return to Home Page
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Form & Payment Submission */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Step 1: Select Plan & Interval */}
              <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${
                isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-xs">
                    01
                  </span>
                  <div>
                    <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Select Your Software Plan</h2>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Choose your store edition and billing duration</p>
                  </div>
                </div>

                {/* Plan Options */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {saasPlans.map((p) => {
                    const isSelected = selectedPlan === p.id.toLowerCase();
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlan(p.id.toLowerCase() as any)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-white ring-2 ring-blue-500/30'
                            : isDark 
                              ? 'bg-[#0b0f19] border-slate-800 text-slate-400 hover:border-slate-700' 
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className={`font-extrabold text-sm ${isSelected ? 'text-blue-500' : isDark ? 'text-white' : 'text-slate-900'}`}>{p.name}</div>
                        <div className={`text-[11px] mt-0.5 line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{p.tagline || p.description}</div>
                        <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono mt-2">Rs. {(p.pricing?.monthly ?? 0).toLocaleString()}/mo</div>
                      </button>
                    );
                  })}
                </div>

                {/* Billing Interval Selector */}
                <div className={`space-y-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Billing Interval & Discounts</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'monthly', label: 'Monthly', badge: 'Standard' },
                      { id: '1year', label: '1 Year', badge: '30% OFF' },
                      { id: '3years', label: '3 Years', badge: '40% OFF' },
                      { id: '5years', label: '5 Years', badge: '50% OFF' },
                    ].map((i) => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => setBillingInterval(i.id as any)}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                          billingInterval === i.id
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg'
                            : isDark
                              ? 'bg-[#0b0f19] border-slate-800 text-slate-400 hover:text-white'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <div>{i.label}</div>
                        <div className={`text-[10px] font-extrabold mt-0.5 ${
                          billingInterval === i.id ? 'text-emerald-200' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {i.badge}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 2: Customer & Account Details */}
              <form onSubmit={handleSubmitCheckout} className="space-y-8">
                <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${
                  isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/60">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-xs shadow-md">
                        02
                      </span>
                      <div>
                        <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Business & Owner Information</h2>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Enter details to configure your software license</p>
                      </div>
                    </div>

                    {/* Progress Indicator */}
                    <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                      validFieldsCount === requiredFields.length
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : isDark ? 'bg-[#0b0f19] border-slate-800 text-slate-300' : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}>
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Progress: {validFieldsCount}/5 Fields ({progressPercentage}%)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Pharmacy Name */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Pharmacy / Store Name *</label>
                        {touchedFields.businessName && (
                          isFieldValid('businessName', businessName) ? (
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Valid
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-400 font-bold flex items-center gap-0.5">
                              <AlertCircle className="w-3 h-3 text-rose-500" /> {getFieldError('businessName', businessName)}
                            </span>
                          )
                        )}
                      </div>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={businessName}
                          onBlur={() => markTouched('businessName')}
                          onChange={(e) => {
                            setBusinessName(e.target.value);
                            markTouched('businessName');
                          }}
                          placeholder="e.g. Al-Shafi Pharmacy"
                          className={`w-full pl-9 pr-8 py-2.5 rounded-xl border focus:outline-none font-bold transition-all ${
                            touchedFields.businessName
                              ? isFieldValid('businessName', businessName)
                                ? 'border-emerald-500/80 focus:border-emerald-500 ring-1 ring-emerald-500/20'
                                : 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20'
                              : isDark ? 'bg-[#0b0f19] border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                          } ${isDark ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-900'}`}
                        />
                        {touchedFields.businessName && isFieldValid('businessName', businessName) && (
                          <Check className="w-4 h-4 text-emerald-500 absolute right-2.5 top-3" />
                        )}
                      </div>
                    </div>

                    {/* Owner Name */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Owner / Pharmacist Name *</label>
                        {touchedFields.ownerName && (
                          isFieldValid('ownerName', ownerName) ? (
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Valid
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-400 font-bold flex items-center gap-0.5">
                              <AlertCircle className="w-3 h-3 text-rose-500" /> {getFieldError('ownerName', ownerName)}
                            </span>
                          )
                        )}
                      </div>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={ownerName}
                          onBlur={() => markTouched('ownerName')}
                          onChange={(e) => {
                            setOwnerName(e.target.value);
                            markTouched('ownerName');
                          }}
                          placeholder="e.g. Dr. Tariq Mahmood"
                          className={`w-full pl-9 pr-8 py-2.5 rounded-xl border focus:outline-none font-bold transition-all ${
                            touchedFields.ownerName
                              ? isFieldValid('ownerName', ownerName)
                                ? 'border-emerald-500/80 focus:border-emerald-500 ring-1 ring-emerald-500/20'
                                : 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20'
                              : isDark ? 'bg-[#0b0f19] border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                          } ${isDark ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-900'}`}
                        />
                        {touchedFields.ownerName && isFieldValid('ownerName', ownerName) && (
                          <Check className="w-4 h-4 text-emerald-500 absolute right-2.5 top-3" />
                        )}
                      </div>
                    </div>

                    {/* WhatsApp */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>WhatsApp / Mobile Number *</label>
                        {touchedFields.whatsapp && (
                          isFieldValid('whatsapp', whatsapp) ? (
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Valid
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-400 font-bold flex items-center gap-0.5">
                              <AlertCircle className="w-3 h-3 text-rose-500" /> {getFieldError('whatsapp', whatsapp)}
                            </span>
                          )
                        )}
                      </div>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={whatsapp}
                          onBlur={() => markTouched('whatsapp')}
                          onChange={(e) => {
                            setWhatsapp(e.target.value);
                            markTouched('whatsapp');
                          }}
                          placeholder="e.g. 03281302636"
                          className={`w-full pl-9 pr-8 py-2.5 rounded-xl border focus:outline-none font-mono transition-all ${
                            touchedFields.whatsapp
                              ? isFieldValid('whatsapp', whatsapp)
                                ? 'border-emerald-500/80 focus:border-emerald-500 ring-1 ring-emerald-500/20'
                                : 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20'
                              : isDark ? 'bg-[#0b0f19] border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                          } ${isDark ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-900'}`}
                        />
                        {touchedFields.whatsapp && isFieldValid('whatsapp', whatsapp) && (
                          <Check className="w-4 h-4 text-emerald-500 absolute right-2.5 top-3" />
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Email Address *</label>
                        {touchedFields.email && (
                          isFieldValid('email', email) ? (
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Valid
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-400 font-bold flex items-center gap-0.5">
                              <AlertCircle className="w-3 h-3 text-rose-500" /> {getFieldError('email', email)}
                            </span>
                          )
                        )}
                      </div>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onBlur={() => markTouched('email')}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            markTouched('email');
                          }}
                          placeholder="e.g. pharmacy@gmail.com"
                          className={`w-full pl-9 pr-8 py-2.5 rounded-xl border focus:outline-none font-medium transition-all ${
                            touchedFields.email
                              ? isFieldValid('email', email)
                                ? 'border-emerald-500/80 focus:border-emerald-500 ring-1 ring-emerald-500/20'
                                : 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20'
                              : isDark ? 'bg-[#0b0f19] border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                          } ${isDark ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-900'}`}
                        />
                        {touchedFields.email && isFieldValid('email', email) && (
                          <Check className="w-4 h-4 text-emerald-500 absolute right-2.5 top-3" />
                        )}
                      </div>
                    </div>

                    {/* City */}
                    <div className="space-y-1">
                      <label className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>City / Location</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Sargodha, Lahore, Karachi"
                          className={`w-full pl-9 pr-3 py-2.5 rounded-xl border focus:outline-none focus:border-blue-500 ${
                            isDark ? 'bg-[#0b0f19] border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Username */}
                    <div className="space-y-1">
                      <label className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Desired Software Username</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="e.g. alshafi_admin"
                          className={`w-full pl-9 pr-3 py-2.5 rounded-xl border focus:outline-none focus:border-blue-500 font-mono ${
                            isDark ? 'bg-[#0b0f19] border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3: Payment Accounts & Screenshot Upload */}
                <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${
                  isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-xs shadow-md">
                      03
                    </span>
                    <div>
                      <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Payment Accounts & Screenshot Proof</h2>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Transfer payment to any official account below and upload screenshot (SS)</p>
                    </div>
                  </div>

                  {/* Account Selector Tabs */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'Meezan Bank', label: 'Meezan Bank' },
                      { id: 'UBL Bank', label: 'UBL Bank' },
                      { id: 'JazzCash', label: 'JazzCash / EasyPaisa / NayaPay' },
                      { id: 'Binance Crypto', label: 'Binance Crypto (USDT)' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                          paymentMethod === m.id
                            ? 'bg-emerald-600 text-white shadow-md'
                            : isDark
                              ? 'bg-[#0b0f19] text-slate-400 hover:text-white border border-slate-800'
                              : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Account Details Box */}
                  <div className={`p-5 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-[#0b0f19] border-emerald-500/30' : 'bg-emerald-50/50 border-emerald-200'
                  }`}>
                    {paymentMethod === 'Meezan Bank' && (
                      <div className="space-y-2 text-xs">
                        <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span>Meezan Bank (Sargodha Branch)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className={`p-3 rounded-xl border space-y-1 ${isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200'}`}>
                            <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Account Title</span>
                            <div className={`font-mono font-bold flex items-center justify-between ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              <span>{PAYMENT_ACCOUNTS.meezan.accountTitle}</span>
                              <button type="button" onClick={() => handleCopy(PAYMENT_ACCOUNTS.meezan.accountTitle, 'title')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                {copiedKey === 'title' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className={`p-3 rounded-xl border space-y-1 ${isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200'}`}>
                            <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Account Number</span>
                            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                              <span>{PAYMENT_ACCOUNTS.meezan.accountNumber}</span>
                              <button type="button" onClick={() => handleCopy(PAYMENT_ACCOUNTS.meezan.accountNumber, 'acc')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                {copiedKey === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className={`p-3 rounded-xl border space-y-1 sm:col-span-2 ${isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200'}`}>
                            <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>IBAN Number</span>
                            <div className={`font-mono font-bold flex items-center justify-between ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              <span>{PAYMENT_ACCOUNTS.meezan.iban}</span>
                              <button type="button" onClick={() => handleCopy(PAYMENT_ACCOUNTS.meezan.iban, 'iban')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                {copiedKey === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'UBL Bank' && (
                      <div className="space-y-2 text-xs">
                        <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span>United Bank Limited (UBL)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className={`p-3 rounded-xl border space-y-1 ${isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200'}`}>
                            <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Account Title</span>
                            <div className={`font-mono font-bold flex items-center justify-between ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              <span>{PAYMENT_ACCOUNTS.ubl.accountTitle}</span>
                              <button type="button" onClick={() => handleCopy(PAYMENT_ACCOUNTS.ubl.accountTitle, 'ubl_title')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                {copiedKey === 'ubl_title' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className={`p-3 rounded-xl border space-y-1 ${isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200'}`}>
                            <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Account Number</span>
                            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                              <span>{PAYMENT_ACCOUNTS.ubl.accountNumber}</span>
                              <button type="button" onClick={() => handleCopy(PAYMENT_ACCOUNTS.ubl.accountNumber, 'ubl_acc')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                {copiedKey === 'ubl_acc' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className={`p-3 rounded-xl border space-y-1 sm:col-span-2 ${isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200'}`}>
                            <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>IBAN Number</span>
                            <div className={`font-mono font-bold flex items-center justify-between ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              <span>{PAYMENT_ACCOUNTS.ubl.iban}</span>
                              <button type="button" onClick={() => handleCopy(PAYMENT_ACCOUNTS.ubl.iban, 'ubl_iban')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                {copiedKey === 'ubl_iban' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {(paymentMethod === 'JazzCash' || paymentMethod === 'EasyPaisa' || paymentMethod === 'NayaPay' || paymentMethod === 'SadaPay') && (
                      <div className="space-y-2 text-xs">
                        <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          <span>JazzCash / EasyPaisa / NayaPay / SadaPay</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className={`p-3 rounded-xl border space-y-1 ${isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200'}`}>
                            <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Mobile Account Number</span>
                            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm flex items-center justify-between">
                              <span>{PAYMENT_ACCOUNTS.wallets.mobileNumber}</span>
                              <button type="button" onClick={() => handleCopy(PAYMENT_ACCOUNTS.wallets.mobileNumber, 'mob')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                {copiedKey === 'mob' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className={`p-3 rounded-xl border space-y-1 ${isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200'}`}>
                            <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Account Title</span>
                            <div className={`font-mono font-bold flex items-center justify-between ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              <span>{PAYMENT_ACCOUNTS.wallets.accountTitle}</span>
                              <button type="button" onClick={() => handleCopy(PAYMENT_ACCOUNTS.wallets.accountTitle, 'w_title')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                {copiedKey === 'w_title' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'Binance Crypto' && (
                      <div className="space-y-2 text-xs">
                        <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          <span>Binance Crypto (USDT / Pay)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className={`p-3 rounded-xl border space-y-1 ${isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200'}`}>
                            <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Binance ID</span>
                            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                              <span>{PAYMENT_ACCOUNTS.crypto.binanceId}</span>
                              <button type="button" onClick={() => handleCopy(PAYMENT_ACCOUNTS.crypto.binanceId, 'bid')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                {copiedKey === 'bid' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className={`p-3 rounded-xl border space-y-1 ${isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200'}`}>
                            <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Binance Username</span>
                            <div className={`font-mono font-bold flex items-center justify-between ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              <span>{PAYMENT_ACCOUNTS.crypto.username}</span>
                              <button type="button" onClick={() => handleCopy(PAYMENT_ACCOUNTS.crypto.username, 'buser')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                {copiedKey === 'buser' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Screenshot Proof Upload Box with Drag & Drop & Dark Mode styling */}
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <label className={`text-xs font-bold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Upload Payment Screenshot (SS) Proof *
                      </label>
                      {touchedFields.paymentScreenshot && (
                        paymentScreenshot ? (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Screenshot Attached
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-500" /> Screenshot Required
                          </span>
                        )
                      )}
                    </div>

                    <div 
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDropScreenshot}
                      className={`p-6 rounded-2xl border-2 border-dashed text-center transition-all ${
                        isDragging 
                          ? 'border-emerald-500 bg-emerald-500/10 ring-4 ring-emerald-500/20'
                          : touchedFields.paymentScreenshot && !paymentScreenshot
                            ? 'border-rose-500/80 bg-rose-500/5'
                            : paymentScreenshot
                              ? 'border-emerald-500/50 bg-[#0b0f19]'
                              : isDark ? 'bg-[#0b0f19] border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {screenshotPreview ? (
                        <div className="space-y-4">
                          <div className="relative inline-block group">
                            <img 
                              src={screenshotPreview} 
                              alt="Payment SS Preview" 
                              className="max-h-52 mx-auto rounded-xl border border-emerald-500/30 object-contain shadow-xl"
                            />
                            <button
                              type="button"
                              onClick={() => setShowZoomModal(true)}
                              className="absolute top-2 right-2 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1 backdrop-blur-md cursor-pointer border border-slate-700"
                              title="Zoom Full Size"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span>Zoom</span>
                            </button>
                          </div>

                          <div className={`p-3 rounded-xl border max-w-md mx-auto flex items-center justify-between gap-3 text-xs ${
                            isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200'
                          }`}>
                            <div className="flex items-center gap-2.5 truncate">
                              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                              <div className="text-left truncate">
                                <div className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {screenshotFileName || 'Payment Receipt Screenshot.png'}
                                </div>
                                <div className="text-[10px] text-emerald-400 font-mono font-bold">
                                  Verified Proof Attached • {screenshotFileSize || 'Ready'}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setPaymentScreenshot('');
                                setScreenshotPreview('');
                                setScreenshotFileName('');
                                setScreenshotFileSize('');
                                markTouched('paymentScreenshot');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer border border-rose-500/30 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer space-y-3 block">
                          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <Upload className="w-6 h-6 animate-pulse" />
                          </div>
                          <div>
                            <div className={`text-xs sm:text-sm font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              Drag & Drop Payment Screenshot here, or <span className="text-blue-500 underline">Browse File</span>
                            </div>
                            <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Supports PNG, JPG, JPEG receipts from Meezan, JazzCash, EasyPaisa, or Binance (Max 5MB)
                            </p>
                          </div>
                          <input type="file" accept="image/*" required onChange={handleScreenshotUpload} className="hidden" />
                        </label>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                      <div className="space-y-1">
                        <label className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Transaction ID / TRX Number</label>
                        <input
                          type="text"
                          value={trxId}
                          onChange={(e) => setTrxId(e.target.value)}
                          placeholder="e.g. TRX-98124912"
                          className={`w-full px-3 py-2 rounded-xl border font-mono ${
                            isDark ? 'bg-[#0b0f19] border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Additional Notes / Instructions</label>
                        <input
                          type="text"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="e.g. Sent via Meezan app to 14010111536981"
                          className={`w-full px-3 py-2 rounded-xl border ${
                            isDark ? 'bg-[#0b0f19] border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Checkout Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>SUBMIT PAYMENT SS & ACTIVATE LICENSE</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </div>

            {/* Right Column: Summary Card */}
            <div className="lg:col-span-4 space-y-6">
              <div className={`p-6 rounded-3xl border space-y-6 sticky top-28 shadow-xl ${
                isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className={`border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Order Summary</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>MBI Inventra Official License Subscription</p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className={`flex justify-between ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span>Selected Plan:</span>
                    <strong className={`capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentPlanDef?.name || selectedPlan}</strong>
                  </div>

                  <div className={`flex justify-between ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span>Billing Duration:</span>
                    <strong className={`capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>{billingInterval}</strong>
                  </div>

                  <div className={`flex justify-between ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span>Monthly Rate:</span>
                    <span className="font-mono">Rs. {(planPricing.monthlyBase ?? 0).toLocaleString()}</span>
                  </div>

                  {planPricing.discountPct > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Duration Discount ({planPricing.discountPct}% OFF):</span>
                      <span className="font-mono">- Rs. {(planPricing.savings ?? 0).toLocaleString()}</span>
                    </div>
                  )}

                  <div className={`pt-3 border-t flex justify-between items-baseline ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <span className={`text-sm font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>Total Amount Payable:</span>
                    <div className="text-right">
                      <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        Rs. {(planPricing.finalTotal ?? 0).toLocaleString()}
                      </div>
                      <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Inclusive of all features</span>
                    </div>
                  </div>
                </div>

                {/* Features Included List */}
                <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
                  isDark ? 'bg-[#0b0f19] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`font-bold text-[11px] uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>Included In Your Plan:</div>
                  <ul className={`space-y-1.5 text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Full Pharmacy POS & Inventory Engine</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>FEFO Expiry Protection & Batch Sync</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>1-Click WhatsApp Receipts & Customer Ledgers</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Online Storefront & Rx Upload Integration</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>100% Offline Functional with Cloud Backup</span>
                    </li>
                  </ul>
                </div>

                {/* Direct Support */}
                <div className={`p-4 rounded-2xl border text-center space-y-1 ${
                  isDark ? 'bg-[#0b0f19] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Have Questions or Need Help?</span>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 pt-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <a href="https://wa.me/923281302636" target="_blank" rel="noopener noreferrer" className="hover:underline">
                      WhatsApp Support: 03281302636
                    </a>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

      </main>

      {/* Screenshot Zoom Modal */}
      {showZoomModal && screenshotPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className={`relative max-w-3xl w-full p-4 rounded-3xl border shadow-2xl space-y-3 ${
            isDark ? 'bg-[#131d33] border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Screenshot Proof Preview ({screenshotFileName || 'Attached Proof'})
              </span>
              <button 
                type="button"
                onClick={() => setShowZoomModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex justify-center p-2">
              <img src={screenshotPreview} alt="Full size payment receipt proof" className="max-w-full rounded-2xl object-contain shadow-2xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

