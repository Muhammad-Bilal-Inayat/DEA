import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, User, Mail, Phone, Lock, Sparkles, 
  ShieldCheck, Check, ArrowRight, Store, MapPin, 
  MessageSquare, Key, AlertCircle, Clock, Send, CheckCircle2, Shield, Home, ArrowLeft,
  Eye, EyeOff, AtSign, Sun, Moon, Loader2
} from 'lucide-react';
import { 
  submitRegistrationLead, 
  buildLeadWhatsAppInquiryUrl, 
  checkRegistrationUniqueness,
  RegistrationLead,
  ADMIN_PRIMARY_WHATSAPP,
  ADMIN_SUPPORT_PHONE
} from '../lib/registrationLeadsService';
import { activateLicenseKey } from '../lib/licenseManager';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Lahore');
  const [address, setAddress] = useState('');
  const [drugLicenseNo, setDrugLicenseNo] = useState('');
  const [requestedPlan, setRequestedPlan] = useState<'Basic (3-Day Free Trial)' | 'Basic (10-Day Free Trial)' | 'Standard POS' | 'Pharmacy Pro' | 'Enterprise Multi-Branch'>('Basic (3-Day Free Trial)');
  const [notes, setNotes] = useState('');

  // Live duplicate warning states
  const [emailConflict, setEmailConflict] = useState<string | null>(null);
  const [usernameConflict, setUsernameConflict] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedLead, setSubmittedLead] = useState<RegistrationLead | null>(null);
  const [showSubmittedPass, setShowSubmittedPass] = useState(false);

  // Direct Activation Key Box State
  const [instantKey, setInstantKey] = useState('');
  const [activationError, setActivationError] = useState('');
  const [isActivatingKey, setIsActivatingKey] = useState(false);

  // Theme support
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('mbi_landing_theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  const { authenticateAndSync } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check URL parameters for preselected plan
    try {
      const params = new URLSearchParams(window.location.search);
      const planParam = params.get('plan');
      if (planParam) {
        if (planParam.toLowerCase().includes('standard')) setRequestedPlan('Standard POS');
        else if (planParam.toLowerCase().includes('pro')) setRequestedPlan('Pharmacy Pro');
        else if (planParam.toLowerCase().includes('enterprise')) setRequestedPlan('Enterprise Multi-Branch');
        else if (planParam.toLowerCase().includes('basic') || planParam.toLowerCase().includes('trial')) setRequestedPlan('Basic (3-Day Free Trial)');
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (isDark) {
      root.classList.add('dark');
      if (body) body.classList.add('dark');
      root.style.colorScheme = 'dark';
      localStorage.setItem('mbi_landing_theme', 'dark');
    } else {
      root.classList.remove('dark');
      if (body) body.classList.remove('dark');
      root.style.colorScheme = 'light';
      localStorage.setItem('mbi_landing_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  // Helper to suggest username based on store or owner
  const handleOwnerChange = (val: string) => {
    setOwnerName(val);
    if (!username) {
      const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (slug) setUsername(slug);
    }
  };

  // Live duplicate validation on blur or change
  const validateFieldDuplicates = () => {
    if (email.trim() || username.trim()) {
      const res = checkRegistrationUniqueness({
        email: email.trim(),
        username: username.trim(),
      });
      if (!res.valid) {
        if (res.field === 'email') setEmailConflict(res.error || null);
        else setEmailConflict(null);

        if (res.field === 'username') setUsernameConflict(res.error || null);
        else setUsernameConflict(null);
      } else {
        setEmailConflict(null);
        setUsernameConflict(null);
      }
    }
  };

  const triggerError = (msg: string) => {
    setError(msg);
    // Ensure error is brought into visible viewport immediately
    setTimeout(() => {
      const errEl = document.getElementById('register-error-banner-top') || document.getElementById('register-error-banner-bottom');
      if (errEl) {
        errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!storeName.trim()) {
      triggerError('Please enter your Pharmacy or Store Name.');
      return;
    }
    if (!ownerName.trim()) {
      triggerError('Please enter the Owner or Contact Person Name.');
      return;
    }
    if (!email.trim()) {
      triggerError('Email address is mandatory. Please provide a valid email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      triggerError('Please enter a valid email address (e.g. name@domain.com).');
      return;
    }
    if (!username.trim()) {
      triggerError('Please choose a preferred Login Username.');
      return;
    }
    if (username.trim().length < 3) {
      triggerError('Username must be at least 3 characters long.');
      return;
    }
    if (!password.trim()) {
      triggerError('Password is mandatory. Please create a password.');
      return;
    }
    if (password.length < 4) {
      triggerError('Password should be at least 4 characters long.');
      return;
    }
    if (confirmPassword && password !== confirmPassword) {
      triggerError('Password and Confirm Password do not match.');
      return;
    }
    if (!phone.trim()) {
      triggerError('Please provide your WhatsApp / Mobile phone number.');
      return;
    }
    if (!address.trim()) {
      triggerError('Store physical address is mandatory. Please enter your complete shop / clinic address.');
      return;
    }

    // Check uniqueness
    const uniquenessCheck = checkRegistrationUniqueness({
      email: email.trim(),
      username: username.trim(),
    });

    if (!uniquenessCheck.valid) {
      triggerError(uniquenessCheck.error || 'Already exists: Please provide unique email and username.');
      return;
    }

    try {
      setIsSubmitting(true);

      const finalUsername = username.trim().toLowerCase();
      const finalPassword = password.trim();
      const is3DayFreeTrial = requestedPlan === 'Basic (3-Day Free Trial)' || requestedPlan === 'Basic (10-Day Free Trial)';

      const { lead, whatsappUrl } = await submitRegistrationLead({
        storeName: storeName.trim(),
        ownerName: ownerName.trim(),
        username: finalUsername,
        password: finalPassword,
        phone: phone.trim(),
        email: email.trim(),
        city: city.trim() || 'Lahore',
        address: address.trim(),
        drugLicenseNo: drugLicenseNo.trim() || undefined,
        requestedPlan,
        notes: notes.trim() || undefined
      });

      // 3-DAY FREE TRIAL (72 HOURS): AUTO LOGIN DIRECTLY - NO WHATSAPP REDIRECT OR POPUP!
      if (is3DayFreeTrial || lead.isApproved) {
        try {
          await authenticateAndSync(finalUsername, finalPassword);
        } catch (authErr) {
          console.warn('Instant auto-login notice:', authErr);
        }
        navigate('/user', { replace: true });
        return;
      }

      // FOR PAID PLANS: Show approval pending screen & open WhatsApp for admin confirmation
      setSubmittedLead(lead);

      if (whatsappUrl) {
        try {
          window.open(whatsappUrl, '_blank');
        } catch (popupErr) {
          console.warn('Popup blocked, lead details saved successfully:', popupErr);
        }
      }
    } catch (err: any) {
      triggerError(err.message || 'Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectKeyActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivationError('');
    if (!instantKey.trim()) {
      setActivationError('Please enter your License Key.');
      return;
    }

    setIsActivatingKey(true);
    try {
      const res = activateLicenseKey(instantKey.trim());
      if (res.success) {
        navigate('/user');
      } else {
        setActivationError(res.message || 'Invalid or unassigned license key. Contact Master Admin.');
      }
    } catch (err: any) {
      setActivationError(err.message || 'Failed to activate license.');
    } finally {
      setIsActivatingKey(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#f8fafc] text-slate-800'
    }`}>
      
      {/* Top Header Navigation: Back to Home + Theme Toggle */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl mb-4 flex items-center justify-between px-1">
        <Link 
          to="/" 
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-xs transition-all group ${
            isDark 
              ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-blue-400 border-slate-800' 
              : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 border-slate-200/80'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-blue-600 dark:text-blue-400" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Light / Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="flex justify-center mb-3">
          <img src="/logo.svg" alt="MBI INVENTRA" className="h-9 sm:h-10.5 w-auto object-contain max-w-[260px]" />
        </div>
        <p className={`mt-1 text-xs sm:text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Enterprise Pharmacy ERP, POS & Central Inventory Management System
        </p>

        {/* Status indicator */}
        <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
          isDark 
            ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Master Server Lead Capture & Activation Gateway</span>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        {/* VIEW 1: CONFIRMATION & PENDING ACTIVATION VIEW */}
        {submittedLead ? (
          <div className={`py-8 px-6 sm:px-10 shadow-lg border rounded-3xl space-y-6 ${
            isDark 
              ? 'bg-slate-900 border-slate-800 text-slate-100' 
              : 'bg-white border-slate-200/90 text-slate-900'
          }`}>
            {submittedLead.isApproved ? (
              /* 3-Day Free Trial Activated Directly */
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span>🎉 3-Day Free Trial Active (72 Hours)</span>
                </div>
                <h2 className="text-xl font-black">72-Hour Trial Activated Successfully!</h2>
                <p className={`text-xs max-w-md mx-auto leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Welcome to MBI Inventra! Your <strong>Basic Plan (3-Day / 72-Hour Free Trial)</strong> is active right now. 
                  No permission required — start managing your pharmacy immediately.
                </p>
              </div>
            ) : (
              /* Paid Plan Pending Admin Approval */
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Clock className="w-8 h-8" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  <span>⏳ Approval Required</span>
                </div>
                <h2 className="text-xl font-black">Registration Pending Master Approval</h2>
                <p className={`text-xs max-w-md mx-auto leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Your registration for <strong>{submittedLead.requestedPlan}</strong> has been submitted. Master Admin permission is required before your login is activated. Details have been forwarded to WhatsApp.
                </p>
              </div>
            )}

            {/* Summary Box */}
            <div className={`p-4 border rounded-2xl space-y-2.5 text-xs ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`flex justify-between border-b pb-1.5 ${isDark ? 'border-slate-800' : 'border-slate-200/70'}`}>
                <span className="text-slate-400 font-semibold">Store / Pharmacy:</span>
                <span className="font-bold">{submittedLead.storeName}</span>
              </div>
              <div className={`flex justify-between border-b pb-1.5 ${isDark ? 'border-slate-800' : 'border-slate-200/70'}`}>
                <span className="text-slate-400 font-semibold">Selected Plan:</span>
                <span className={`font-bold flex items-center gap-1 ${submittedLead.isApproved ? 'text-emerald-500' : 'text-amber-500'}`}>
                  <span className={`w-2 h-2 rounded-full inline-block ${submittedLead.isApproved ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                  {submittedLead.requestedPlan}
                </span>
              </div>
              <div className={`flex justify-between border-b pb-1.5 ${isDark ? 'border-slate-800' : 'border-slate-200/70'}`}>
                <span className="text-slate-400 font-semibold">Account Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                  submittedLead.isApproved 
                    ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                }`}>
                  {submittedLead.isApproved ? 'Active (10 Days Remaining)' : 'Pending Admin Approval'}
                </span>
              </div>
              {submittedLead.activationKey && (
                <div className={`flex justify-between border-b pb-1.5 ${isDark ? 'border-slate-800' : 'border-slate-200/70'}`}>
                  <span className="text-slate-400 font-semibold">License Key:</span>
                  <span className="font-mono font-bold text-blue-500">{submittedLead.activationKey}</span>
                </div>
              )}
              <div className={`flex justify-between border-b pb-1.5 -mx-4 px-4 py-1.5 rounded-lg ${
                isDark ? 'bg-blue-950/40 border-slate-800' : 'bg-blue-50/70 border-slate-200/70'
              }`}>
                <span className="text-blue-500 font-bold flex items-center gap-1">
                  <AtSign className="w-3.5 h-3.5" />
                  <span>Login Username:</span>
                </span>
                <span className="font-mono font-black text-blue-600 dark:text-blue-400">{submittedLead.username || submittedLead.email.split('@')[0]}</span>
              </div>
              <div className={`flex justify-between border-b pb-1.5 -mx-4 px-4 py-1.5 rounded-lg items-center ${
                isDark ? 'bg-blue-950/20 border-slate-800' : 'bg-blue-50/40 border-slate-200/70'
              }`}>
                <span className="font-bold flex items-center gap-1 text-slate-300">
                  <Lock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Login Password:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold">
                    {showSubmittedPass ? (submittedLead.password || '••••••••') : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSubmittedPass(!showSubmittedPass)}
                    className="text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer"
                    title={showSubmittedPass ? 'Hide Password' : 'Show Password'}
                  >
                    {showSubmittedPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-slate-400 font-semibold">Reference ID:</span>
                <span className="font-mono text-slate-500">{submittedLead.id}</span>
              </div>
            </div>

            {/* Action CTA: Direct Login if Approved, else Notify / Wait */}
            <div className="space-y-3">
              {submittedLead.isApproved ? (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await authenticateAndSync(submittedLead.username || submittedLead.email, submittedLead.password || '1234');
                    } catch (e) {}
                    navigate('/user', { replace: true });
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>🚀 Launch POS & Sign In Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <a
                  href={buildLeadWhatsAppInquiryUrl(submittedLead)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Notification on WhatsApp for Fast Approval</span>
                </a>
              )}

              <p className={`text-[11px] text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {submittedLead.isApproved 
                  ? 'Your login credentials are saved. Click above to log into your newly activated pharmacy terminal.'
                  : 'Once Master Admin approves your plan, you can log in with your selected username & password.'}
              </p>
            </div>

            {/* WhatsApp Contact / Support CTA */}
            <div className={`p-4 border rounded-2xl text-center space-y-2.5 ${
              isDark ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="text-xs font-semibold">
                {submittedLead.isApproved ? 'Need software assistance or training?' : 'Need immediate approval or invoice?'} Contact Master Admin:
              </div>
              <a
                href={buildLeadWhatsAppInquiryUrl(submittedLead)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat on WhatsApp: {ADMIN_PRIMARY_WHATSAPP}</span>
              </a>
            </div>

            <div className="text-center pt-2 flex items-center justify-between text-xs font-bold">
              <button
                type="button"
                onClick={() => setSubmittedLead(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                ← Register Another Store
              </button>
              <Link to="/login" className="px-3.5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors flex items-center gap-1">
                <span>Go to Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          /* VIEW 2: CLEAN REGISTRATION FORM WITH DARK/LIGHT MODE */
          <div className={`py-8 px-6 sm:px-10 shadow-lg border rounded-3xl ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90'
          }`}>
            <div className={`mb-6 pb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  🎉 3-Day Free Trial (72 Hours)
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  No Permission Required
                </span>
              </div>
              <h2 className="text-base font-bold">Pharmacy & Business Registration</h2>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Register your business and choose your username & password. Your 3-day (72-hour) free trial on the Basic Plan activates immediately!
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleLeadSubmit}>
              {error && (
                <div id="register-error-banner-top" className="bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 p-3.5 rounded-xl text-xs font-bold flex items-start gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <div className="flex-1 leading-relaxed">{error}</div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Store Name */}
                <div className="sm:col-span-2">
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <span>Pharmacy / Store Name *</span>
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  </label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Al-Madina Pharmacy & Medicos"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' 
                        : 'bg-slate-50/70 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    value={storeName} 
                    onChange={e => {
                      setStoreName(e.target.value);
                      if (!username) {
                        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (slug) setUsername(slug);
                      }
                    }} 
                  />
                </div>

                {/* Owner Name */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <span>Owner / Pharmacist Name *</span>
                    <User className="w-3.5 h-3.5 text-slate-400" />
                  </label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Dr. Muhammad Asif"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' 
                        : 'bg-slate-50/70 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    value={ownerName} 
                    onChange={e => handleOwnerChange(e.target.value)} 
                  />
                </div>

                {/* WhatsApp Phone */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <span>WhatsApp / Mobile Number *</span>
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                  </label>
                  <input 
                    type="text" 
                    required 
                    placeholder="03001234567"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' 
                        : 'bg-slate-50/70 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                  />
                </div>

                {/* Mandatory Email Address */}
                <div className="sm:col-span-2">
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <span>Email Address (Mandatory & Unique) *</span>
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                  </label>
                  <input 
                    type="email" 
                    required
                    placeholder="e.g. asif@pharma.com"
                    onBlur={validateFieldDuplicates}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      emailConflict 
                        ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                        : isDark 
                          ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' 
                          : 'bg-slate-50/70 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    value={email} 
                    onChange={e => {
                      setEmail(e.target.value);
                      setEmailConflict(null);
                    }} 
                  />
                  {emailConflict && (
                    <p className="text-[11px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{emailConflict}</span>
                    </p>
                  )}
                </div>

                {/* DESIRED CREDENTIALS SECTION: USERNAME & PASSWORD UNIQUE */}
                <div className={`sm:col-span-2 p-4 rounded-2xl space-y-3 border ${
                  isDark 
                    ? 'bg-slate-950/80 border-blue-900/60' 
                    : 'bg-gradient-to-br from-blue-50/80 to-indigo-50/60 border-blue-200'
                }`}>
                  <div className={`flex items-center justify-between border-b pb-2 ${
                    isDark ? 'border-blue-900/40' : 'border-blue-200/60'
                  }`}>
                    <span className="text-xs font-extrabold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Choose Unique Login Credentials (Username & Password)</span>
                    </span>
                    <span className="text-[10px] bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold px-2 py-0.5 rounded-full">
                      Must Be Unique
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Preferred Username */}
                    <div className="sm:col-span-2">
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-between ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        <span>Preferred Login Username / ID *</span>
                        <AtSign className="w-3.5 h-3.5 text-blue-500" />
                      </label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. asif_pharma or dr_asif"
                        onBlur={validateFieldDuplicates}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          usernameConflict 
                            ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                            : isDark 
                              ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' 
                              : 'bg-white border-blue-200 text-slate-900 placeholder-slate-400'
                        }`}
                        value={username} 
                        onChange={e => {
                          setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                          setUsernameConflict(null);
                        }} 
                      />
                      {usernameConflict ? (
                        <p className="text-[11px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{usernameConflict}</span>
                        </p>
                      ) : (
                        <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          You will use this unique ID to log in to MBI Inventra once your pharmacy is approved.
                        </p>
                      )}
                    </div>

                    {/* Preferred Password */}
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-between ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        <span>Create Password *</span>
                        <Lock className="w-3.5 h-3.5 text-blue-500" />
                      </label>
                      <div className="relative">
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          required
                          placeholder="••••••••"
                          className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDark 
                              ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' 
                              : 'bg-white border-blue-200 text-slate-900 placeholder-slate-400'
                          }`}
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-between ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        <span>Confirm Password *</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                      </label>
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        required
                        placeholder="••••••••"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark 
                            ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' 
                            : 'bg-white border-blue-200 text-slate-900 placeholder-slate-400'
                        }`}
                        value={confirmPassword} 
                        onChange={e => setConfirmPassword(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <span>City *</span>
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Lahore / Rawalpindi"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' 
                        : 'bg-slate-50/70 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    value={city} 
                    onChange={e => setCity(e.target.value)} 
                  />
                </div>

                {/* Mandatory Physical Store Address */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <span>Store Physical Address (Mandatory) *</span>
                    <Store className="w-3.5 h-3.5 text-slate-400" />
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Shop # 4, Main Commercial Market, Lahore"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' 
                        : 'bg-slate-50/70 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    value={address} 
                    onChange={e => setAddress(e.target.value)} 
                  />
                </div>

                {/* Drug License No. */}
                <div className="sm:col-span-2">
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <span>Drug License No. / NTN (Optional)</span>
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. DL-05-12498"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' 
                        : 'bg-slate-50/70 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    value={drugLicenseNo} 
                    onChange={e => setDrugLicenseNo(e.target.value)} 
                  />
                </div>

                {/* Selected Plan */}
                <div className="sm:col-span-2">
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Select Software Edition & Plan
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {/* Basic 3-Day Free Trial */}
                    <button
                      type="button"
                      onClick={() => setRequestedPlan('Basic (3-Day Free Trial)')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                        requestedPlan === 'Basic (3-Day Free Trial)' || requestedPlan === 'Basic (10-Day Free Trial)'
                          ? 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/40 shadow-sm'
                          : isDark ? 'border-slate-800 hover:border-slate-700 bg-slate-950' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">Basic Plan</span>
                        <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-emerald-600 text-white rounded-md tracking-wider">
                          3D (72h)
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Rs. 0 (Direct Login)</div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-tight">Instant access, 72 hours free trial</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRequestedPlan('Standard POS')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        requestedPlan === 'Standard POS'
                          ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                          : isDark ? 'border-slate-800 hover:border-slate-700 bg-slate-950' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold">Standard POS</span>
                        <span className="px-1 py-0.2 text-[8px] font-bold uppercase bg-amber-500/20 text-amber-500 rounded">Approval Req</span>
                      </div>
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">Rs. 1,999 / mo</div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-tight">WhatsApp notification sent</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRequestedPlan('Pharmacy Pro')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        requestedPlan === 'Pharmacy Pro'
                          ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                          : isDark ? 'border-slate-800 hover:border-slate-700 bg-slate-950' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold">Pharmacy Pro</span>
                        <span className="px-1 py-0.2 text-[8px] font-bold uppercase bg-amber-500/20 text-amber-500 rounded">Approval Req</span>
                      </div>
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">Rs. 3,999 / mo</div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-tight">WhatsApp notification sent</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRequestedPlan('Enterprise Multi-Branch')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        requestedPlan === 'Enterprise Multi-Branch'
                          ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                          : isDark ? 'border-slate-800 hover:border-slate-700 bg-slate-950' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold">Enterprise</span>
                        <span className="px-1 py-0.2 text-[8px] font-bold uppercase bg-amber-500/20 text-amber-500 rounded">Approval Req</span>
                      </div>
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">Rs. 6,999 / mo</div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-tight">WhatsApp notification sent</div>
                    </button>
                  </div>
                </div>

              </div>

              {/* Bottom Error Banner if validation or submission failed */}
              {error && (
                <div id="register-error-banner-bottom" className="bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 p-3.5 rounded-xl text-xs font-bold flex items-start gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <div className="flex-1 leading-relaxed">{error}</div>
                </div>
              )}

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full mt-3 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{requestedPlan === 'Basic (10-Day Free Trial)' ? 'Activating 10-Day Free Trial...' : 'Submitting for Approval & WhatsApp...'}</span>
                  </>
                ) : requestedPlan === 'Basic (10-Day Free Trial)' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Start 10-Day Free Trial (Instant Direct Login)</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 text-emerald-300" />
                    <span>Request Approval & Notify on WhatsApp ({requestedPlan})</span>
                  </>
                )}
              </button>
            </form>

            <div className={`mt-6 pt-4 border-t flex items-center justify-center text-xs ${
              isDark ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <Link to="/login" className="text-blue-500 hover:underline font-bold text-sm">
                Already registered? Sign In to POS Counter
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
