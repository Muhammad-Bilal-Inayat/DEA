import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, Zap, Sparkles, Check, ArrowRight, 
  Phone, MessageSquare, Mail, MapPin, Clock, 
  Printer, QrCode, HardDrive, Smartphone, Lock, User, 
  Key, AlertCircle, RefreshCw, Star, HelpCircle, 
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CheckCircle2, Layers, Sun, Moon, 
  Award, Activity, Database, Cpu, Receipt, 
  CreditCard, BarChart3, Users, Building2, WifiOff,
  TrendingUp, XCircle, ArrowUpRight, Play, CheckCircle,
  FileText, ShoppingBag, Truck, DollarSign, PieChart,
  Shield, Laptop, Compass, HeartHandshake, Eye, Search,
  Send, ArrowUp, Share2, Globe, ThumbsUp, Quote, ExternalLink,
  Briefcase, Camera, Menu, X
} from 'lucide-react';
import { 
  getSiteCmsConfig, 
  SiteCmsConfig, 
  getBrandContact,
  saveNewsletterSubscriber,
  SectionCustomStyle
} from '../lib/siteCmsService';
import { getSaaSPlans } from '../lib/planLimitsService';
import { SaaSPlanDefinition } from '../types';
import { PWAInstallBanner } from '../components/pwa/PWAInstallBanner';
import { PWAInstallButton } from '../components/pwa/PWAComponents';
import { useAuth } from '../contexts/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, authenticateAndSync } = useAuth();
  const [config, setConfig] = useState<SiteCmsConfig>(getSiteCmsConfig);
  const [contact, setContact] = useState(getBrandContact);
  const [saasPlans, setSaasPlans] = useState<SaaSPlanDefinition[]>(getSaaSPlans);
  
  // Mobile Navigation Drawer state
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Responsive Window Width state for dynamic touch carousels & adaptive UI
  const [windowWidth, setWindowWidth] = useState<number>(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Theme state: Default Light mode with seamless Dark Mode support
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('mbi_landing_theme');
    if (saved) return saved === 'dark' ? 'dark' : 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      if (body) body.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      if (body) body.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem('mbi_landing_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Billing interval switcher: monthly | 1year | 3years | 5years
  const [billingInterval, setBillingInterval] = useState<'monthly' | '1year' | '3years' | '5years'>('monthly');
  
  // Hero Interactive Tabs: dashboard | pos | fefo
  const [heroActiveTab, setHeroActiveTab] = useState<'dashboard' | 'pos' | 'fefo'>('dashboard');

  // Interactive FAQ States
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');
  const [faqCategory, setFaqCategory] = useState<string>('All');
  const [faqSearchQuery, setFaqSearchQuery] = useState<string>('');
  const [expandAllFaqs, setExpandAllFaqs] = useState<boolean>(false);

  // Testimonials Carousel States
  const [activeTestimonialIdx, setActiveTestimonialIdx] = useState<number>(0);
  const [isPausedTestimonials, setIsPausedTestimonials] = useState<boolean>(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  // Newsletter Form State
  const [newsletterEmail, setNewsletterEmail] = useState<string>('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMessage, setNewsletterMessage] = useState<string>('');

  // Single-screen Quick Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Dashboard Tab state for interactive preview
  const [activeDashTab, setActiveDashTab] = useState<'overview' | 'sales' | 'inventory'>('overview');
  
  // Interactive Dashboard Graph Tab States (Sales Trend | Category Share | Rush Hours | Margins)
  const [activeDashGraphTab, setActiveDashGraphTab] = useState<'sales_trend' | 'category_pie' | 'rush_hours' | 'margin_velocity'>('sales_trend');
  const [hoveredGraphDay, setHoveredGraphDay] = useState<number | null>(4); // Default Fri peak (Friday)

  useEffect(() => {
    const handleCmsUpdate = () => {
      setConfig(getSiteCmsConfig());
      setContact(getBrandContact());
    };
    const handlePlansUpdate = () => {
      setSaasPlans(getSaaSPlans());
    };

    window.addEventListener('mbi-site-cms-updated', handleCmsUpdate);
    window.addEventListener('saas-plans-updated', handlePlansUpdate);
    window.addEventListener('storage', handlePlansUpdate);
    return () => {
      window.removeEventListener('mbi-site-cms-updated', handleCmsUpdate);
      window.removeEventListener('saas-plans-updated', handlePlansUpdate);
      window.removeEventListener('storage', handlePlansUpdate);
    };
  }, []);

  // Auto slide testimonials carousel
  useEffect(() => {
    if (isPausedTestimonials || config.testimonials.length <= 1) return;
    const timer = setInterval(() => {
      setActiveTestimonialIdx((prev) => (prev + 1) % config.testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPausedTestimonials, config.testimonials.length]);

  const handleNextTestimonial = () => {
    setActiveTestimonialIdx((prev) => (prev + 1) % config.testimonials.length);
  };

  const handlePrevTestimonial = () => {
    setActiveTestimonialIdx((prev) => (prev - 1 + config.testimonials.length) % config.testimonials.length);
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current !== null && touchEndXRef.current !== null) {
      const distance = touchStartXRef.current - touchEndXRef.current;
      if (distance > 50) {
        handleNextTestimonial();
      } else if (distance < -50) {
        handlePrevTestimonial();
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) {
      setNewsletterStatus('error');
      setNewsletterMessage('Please provide a valid email address.');
      return;
    }

    setNewsletterStatus('loading');
    try {
      saveNewsletterSubscriber(newsletterEmail.trim(), 'footer_newsletter');
      setNewsletterStatus('success');
      setNewsletterMessage('🎉 Thank you! You are subscribed to MBI Inventra updates & feature releases.');
      setNewsletterEmail('');
      setTimeout(() => {
        setNewsletterStatus('idle');
        setNewsletterMessage('');
      }, 6000);
    } catch (err: any) {
      setNewsletterStatus('error');
      setNewsletterMessage(err?.message || 'Subscription failed. Please try again.');
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Smooth scroll to target section without polluting URL hash
  const scrollToSection = (e?: React.MouseEvent, sectionId?: string) => {
    if (e) e.preventDefault();
    if (!sectionId) return;
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    // Clean URL address bar to remove #hash completely
    if (window.location.hash) {
      try {
        window.history.replaceState(null, '', window.location.pathname);
      } catch (err) {
        // ignore in restrictive environments
      }
    }
  };

  // Clean initial #hash if user opened with /#pricing or other hash
  useEffect(() => {
    if (window.location.hash) {
      const targetHash = window.location.hash.replace('#', '');
      if (targetHash === 'login') {
        navigate('/login');
      } else {
        const targetEl = document.getElementById(targetHash);
        if (targetEl) {
          setTimeout(() => {
            targetEl.scrollIntoView({ behavior: 'smooth' });
          }, 150);
        }
      }
      try {
        window.history.replaceState(null, '', window.location.pathname);
      } catch (err) {
        // ignore
      }
    }
  }, [navigate]);

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter valid credentials to access your pharmacy.');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      await authenticateAndSync(loginEmail.trim(), loginPassword);
      navigate('/user');
    } catch (err: any) {
      setLoginError(err?.message || 'Failed to authenticate. Please verify your credentials.');
      setLoginLoading(false);
    }
  };

  // Helper to retrieve custom section style config
  const getSecStyle = (secId: string): SectionCustomStyle | undefined => {
    return config.sectionStyles?.[secId];
  };


  // Helper calculation for plans based on interval
  const getPlanPricing = (plan: SaaSPlanDefinition) => {
    const monthlyPrice = plan.pricing?.monthly || 1999;
    const yearlyPrice = plan.pricing?.yearly || monthlyPrice * 10;
    const threeYearsPrice = plan.pricing?.threeYears || monthlyPrice * 24;
    const fiveYearsPrice = plan.pricing?.fiveYears || monthlyPrice * 36;

    let discountBadge: string | null = null;
    let durationText = 'Monthly Subscription';
    let totalPrice = monthlyPrice;
    let periodLabel = '/month';
    let effectiveMonthly = monthlyPrice;

    if (billingInterval === 'monthly') {
      totalPrice = monthlyPrice;
      periodLabel = '/month';
      effectiveMonthly = monthlyPrice;
      discountBadge = null;
      durationText = 'Monthly Subscription';
    } else if (billingInterval === '1year') {
      const discount = Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100);
      totalPrice = yearlyPrice;
      periodLabel = '/year';
      effectiveMonthly = Math.round(yearlyPrice / 12);
      discountBadge = `Save ${discount > 0 ? discount : 30}%`;
      durationText = '1 Year License';
    } else if (billingInterval === '3years') {
      const discount = Math.round(((monthlyPrice * 36 - threeYearsPrice) / (monthlyPrice * 36)) * 100);
      totalPrice = threeYearsPrice;
      periodLabel = 'for 3 Years';
      effectiveMonthly = Math.round(threeYearsPrice / 36);
      discountBadge = `Save ${discount > 0 ? discount : 45}%`;
      durationText = '3 Years License';
    } else {
      const discount = Math.round(((monthlyPrice * 60 - fiveYearsPrice) / (monthlyPrice * 60)) * 100);
      totalPrice = fiveYearsPrice;
      periodLabel = 'for 5 Years';
      effectiveMonthly = Math.round(fiveYearsPrice / 60);
      discountBadge = `Save ${discount > 0 ? discount : 60}%`;
      durationText = '5 Years License';
    }

    const isBusiness = plan.id === 'Business';
    const isPremium = plan.id === 'Premium';
    const featureList: string[] = [
      `Up to ${plan.maxUsers} Active Staff Users`,
      `Up to ${plan.maxFirms} Pharmacy Branch${plan.maxFirms > 1 ? 'es' : ''}`,
      '0.2s Rapid Thermal POS & A4 Bills',
      'Smart Drug Catalog & Barcode Scanner',
      'Customer & Supplier Ledger Accounts',
    ];

    if (plan.features?.batchManagement || plan.features?.expiryManagement) {
      featureList.push('Batch & Expiry 30/60/90 Days Auto-Alerts');
    }
    if (plan.features?.profitAndLoss) {
      featureList.push('Profit & Loss Statements & Balance Sheet');
    }
    if (isPremium) {
      featureList.push('Multi-Branch Inventory & Central Transfer');
      featureList.push('Granular Audit Logs & Activity Trails');
      featureList.push('Dedicated VIP Tech Support');
    } else if (isBusiness) {
      featureList.push('Multi-User & Purchase Order Automation');
      featureList.push('Priority WhatsApp Tech Support');
    } else {
      featureList.push('100% Offline Mode & Local Cache');
      featureList.push('Standard Helpline & WhatsApp Support');
    }

    return {
      totalPrice,
      periodLabel,
      effectiveMonthly,
      discountBadge,
      durationText,
      featureList,
    };
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen font-sans antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200 ${
      isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      <PWAInstallBanner />

      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & NAVIGATION BAR (FULLY RESPONSIVE MOBILE, TABLET & DESKTOP)
      ───────────────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-colors ${
        isDark ? 'bg-[#131d33]/90 border-slate-800/90 shadow-lg shadow-black/20' : 'bg-white/95 border-slate-200 shadow-xs'
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Brand Logo & Name */}
          <div 
            className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer group select-none shrink-0" 
            onClick={() => {
              setIsMobileNavOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <img 
              src={config.brand.logoUrl || '/logo.svg'} 
              alt={config.brand.name} 
              className="h-7.5 sm:h-8.5 w-auto object-contain group-hover:scale-105 transition-transform" 
            />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7 text-xs font-bold">
            <button type="button" onClick={() => scrollToTop()} className={`transition-colors hover:text-blue-600 cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Home</button>
            <button type="button" onClick={(e) => scrollToSection(e, 'store')} className={`transition-colors hover:text-blue-600 cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Online Store</button>
            <button type="button" onClick={() => navigate('/blogs')} className={`transition-colors hover:text-blue-600 font-extrabold text-blue-500 cursor-pointer`}>Blog & Guides</button>
            <button type="button" onClick={(e) => scrollToSection(e, 'pricing')} className={`transition-colors hover:text-blue-600 cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Pricing</button>
            <button type="button" onClick={(e) => scrollToSection(e, 'features')} className={`transition-colors hover:text-blue-600 cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Features</button>
            <button type="button" onClick={(e) => scrollToSection(e, 'faq')} className={`transition-colors hover:text-blue-600 cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>FAQ</button>
            <button type="button" onClick={(e) => scrollToSection(e, 'contact')} className={`transition-colors hover:text-blue-600 cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Contact</button>
          </nav>

          {/* Header Action Buttons & Mobile Hamburger */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* PWA Direct Install Button for Live Domain and Offline Capability */}
            <div className="hidden sm:block">
              <PWAInstallButton 
                label="Install Software" 
                className={`px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isDark 
                    ? 'bg-blue-950/60 border-blue-700/70 text-blue-300 hover:bg-blue-900/80 shadow-xs' 
                    : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 shadow-xs'
                }`}
              />
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
              className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' 
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              aria-label="Toggle Night/Day theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Login Button (Hidden on smallest screens, shown in mobile drawer or >= sm) */}
            {currentUser ? (
              <button
                onClick={() => navigate('/user')}
                className={`hidden sm:inline-flex px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800'
                    : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                }`}
              >
                Workspace
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={`hidden sm:inline-flex px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800'
                    : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                }`}
              >
                LOGIN
              </button>
            )}

            {/* Start Free Trial Button */}
            {currentUser ? (
              <button
                onClick={() => navigate('/user')}
                className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5"
              >
                <span>POS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 whitespace-nowrap"
              >
                <span className="hidden xs:inline">10 Days Free Trial</span>
                <span className="xs:hidden">Trial</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Mobile / Tablet Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileNavOpen(prev => !prev)}
              className={`lg:hidden p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800' 
                  : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
              }`}
              aria-label="Toggle navigation menu"
            >
              {isMobileNavOpen ? <X className="w-5 h-5 text-rose-500" /> : <Menu className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            </button>
          </div>
        </div>

        {/* MOBILE & TABLET EXPANDABLE NAVIGATION DRAWER */}
        {isMobileNavOpen && (
          <div className="lg:hidden border-t animate-in slide-in-from-top duration-200 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className={`p-4 sm:p-6 space-y-5 ${
              isDark ? 'bg-slate-950/98 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              
              {/* Quick Contact & Helpline Bar */}
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <a 
                  href={contact.callUrl(contact.phone1)} 
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                    isDark ? 'bg-slate-900 border-slate-800 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span className="truncate">Call {contact.displayPhone1}</span>
                </a>
                <a 
                  href={contact.whatsappUrl('Hello! I would like to inquire about MBI Inventra Pharmacy System.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                    isDark ? 'bg-slate-900 border-slate-800 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="truncate">WhatsApp Support</span>
                </a>
              </div>

              {/* Navigation Links Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                {[
                  { label: 'Core Features', target: 'features', icon: Layers },
                  { label: 'Pharmacy Solutions', target: 'solutions', icon: Building2 },
                  { label: 'Smart Inventory', target: 'smart-inventory', icon: Database },
                  { label: 'Executive Dashboard', target: 'dashboard-preview', icon: BarChart3 },
                  { label: 'Plans & Pricing', target: 'pricing', icon: CreditCard },
                  { label: 'Customer Reviews', target: 'testimonials', icon: Star },
                  { label: 'FAQ Support', target: 'faq', icon: HelpCircle },
                  { label: 'About & Company', target: 'about', icon: ShieldCheck },
                ].map((item) => (
                  <button
                    key={item.target}
                    type="button"
                    onClick={(e) => {
                      setIsMobileNavOpen(false);
                      scrollToSection(e, item.target);
                    }}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                      isDark 
                        ? 'bg-slate-900/80 border-slate-800 hover:bg-slate-800 hover:border-blue-500/40 text-slate-200' 
                        : 'bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-300 text-slate-800'
                    }`}
                  >
                    <item.icon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Mobile Action Buttons */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2.5">
                {currentUser ? (
                  <button
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      navigate('/user');
                    }}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <span>OPEN POS WORKSPACE</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileNavOpen(false);
                        navigate('/register');
                      }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>START 10-DAY FREE TRIAL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileNavOpen(false);
                        navigate('/login');
                      }}
                      className={`w-full py-3 rounded-xl border font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isDark 
                          ? 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800' 
                          : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                      }`}
                    >
                      <User className="w-4 h-4 text-blue-600" />
                      <span>SIGN IN / LOGIN</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        setIsMobileNavOpen(false);
                        scrollToSection(e, 'pricing');
                      }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>VIEW PRICING & DEALS</span>
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. HERO SECTION WITH 3D FLOATING DASHBOARD & ENTRANCE ANIMATIONS
      ───────────────────────────────────────────────────────────── */}
      {(() => {
        const sec = getSecStyle('hero');
        if (sec && sec.enabled === false) return null;

        const bgImg = sec?.bgImageUrl;
        const overlayOpacity = (sec?.bgOverlayOpacity ?? 80) / 100;
        const badge = sec?.badge || 'SMART PHARMACY. SMARTER BUSINESS.';
        const title = sec?.title || 'MBI INVENTRA';
        const subtitle = sec?.subtitle || 'Manage stock, sales, purchases, customers, suppliers & reports from one powerful platform.';
        const customBtnText = sec?.customButtonText;
        const customBtnUrl = sec?.customButtonUrl;

        return (
          <section className="relative pt-16 pb-24 overflow-hidden animate-fade-in-up">
            {/* Background Image Layer if configured */}
            {bgImg && (
              <div 
                className="absolute inset-0 bg-cover bg-center -z-20 transition-all duration-700"
                style={{ backgroundImage: `url(${bgImg})` }}
              >
                <div 
                  className={`absolute inset-0 ${isDark ? 'bg-slate-950' : 'bg-slate-900'}`}
                  style={{ opacity: overlayOpacity }}
                />
              </div>
            )}

            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] bg-blue-500/10 dark:bg-blue-600/15 blur-[160px] rounded-full pointer-events-none -z-10" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="text-center max-w-4xl mx-auto space-y-6">
                
                {/* Top Eyebrow Badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-extrabold tracking-wide uppercase shadow-xs transition-all animate-float ${
                  isDark ? 'bg-slate-900/90 border-slate-700 text-blue-400' : 'bg-blue-50/90 border-blue-200 text-blue-800'
                }`}>
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{badge}</span>
                </div>

                {/* Main Headline */}
                <h1 className={`text-4xl sm:text-6xl font-black tracking-tight leading-[1.12] ${
                  bgImg ? 'text-white' : (isDark ? 'text-white' : 'text-slate-950')
                }`}>
                  {title}
                  <span className="block text-2xl sm:text-4xl lg:text-5xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">
                    Pharmacy & Inventory Management Platform
                  </span>
                </h1>

                {/* Value Subtitle */}
                <p className={`text-base sm:text-lg leading-relaxed max-w-2xl mx-auto ${
                  bgImg ? 'text-slate-200' : (isDark ? 'text-slate-300' : 'text-slate-600')
                }`}>
                  {subtitle}
                </p>

                {/* CTAs: [ 10 Days Free Trial ] [ WHATSAPP DEMO ] */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 transition-all group cursor-pointer hover:scale-[1.02]"
                  >
                    <span>10 Days Free Trial</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <a
                    href={contact.whatsappUrl('Hello! I would like to watch the live demo and test MBI Inventra.')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full sm:w-auto px-7 py-4 rounded-2xl border font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-xs hover:scale-[1.02] ${
                      isDark 
                        ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700' 
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                    }`}
                  >
                    <Play className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                    <span>WHATSAPP DEMO</span>
                  </a>
                </div>

                {/* Live Floating Statistics Badges */}
                <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                  {(config.hero?.stats || []).map((stat, idx) => (
                    <div 
                      key={stat.id || idx}
                      className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-2 backdrop-blur-md shadow-xs ${
                        isDark 
                          ? 'bg-slate-900/80 border-slate-800 text-slate-300' 
                          : 'bg-white/90 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="font-black text-blue-600 dark:text-blue-400">{stat.value}</span>
                      <span className="text-slate-400">•</span>
                      <span>{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3D FLOATING DASHBOARD INTERACTIVE PREVIEW TABS */}
              <div className="mt-14 max-w-5xl mx-auto perspective-1000">
                
                {/* Mode Selector Tabs (Responsive Wrap) */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-4">
                  <button
                    onClick={() => setHeroActiveTab('dashboard')}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      heroActiveTab === 'dashboard'
                        ? 'bg-blue-600 text-white shadow-md'
                        : isDark
                          ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Live POS Terminal</span>
                  </button>

                  <button
                    onClick={() => setHeroActiveTab('pos')}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      heroActiveTab === 'pos'
                        ? 'bg-blue-600 text-white shadow-md'
                        : isDark
                          ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>0.2s Cashier Bill</span>
                  </button>

                  <button
                    onClick={() => setHeroActiveTab('fefo')}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      heroActiveTab === 'fefo'
                        ? 'bg-blue-600 text-white shadow-md'
                        : isDark
                          ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>FEFO Expiry Radar</span>
                  </button>
                </div>

                <div className={`rounded-3xl border p-4 sm:p-6 lg:p-8 shadow-2xl transition-all relative overflow-hidden backdrop-blur-md ${
                  isDark 
                    ? 'bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border-slate-800 shadow-blue-900/10' 
                    : 'bg-gradient-to-b from-white via-white to-slate-50 border-slate-200/90 shadow-slate-200'
                }`}>
                  
                  {/* Window Bar */}
                  <div className="flex items-center justify-between border-b pb-4 mb-6 border-slate-200 dark:border-slate-800 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-rose-500 shrink-0" />
                      <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-amber-500 shrink-0" />
                      <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-[11px] sm:text-xs font-mono font-bold ml-1 sm:ml-2 text-slate-500 dark:text-slate-400 truncate">
                        {heroActiveTab === 'dashboard' && 'MBI Inventra — Enterprise POS Dashboard #1'}
                        {heroActiveTab === 'pos' && 'MBI Inventra — 0.2s Urdu Barcode Cashier Terminal'}
                        {heroActiveTab === 'fefo' && 'MBI Inventra — FEFO Expiry & High-Margin Batch Matrix'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 text-[10px] sm:text-xs">
                        <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                      </span>
                    </div>
                  </div>

                  {/* TAB 1: OVERVIEW METRICS & GRAPH */}
                  {heroActiveTab === 'dashboard' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Sales */}
                        <div className={`p-5 rounded-2xl border ${
                          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span>Total Sales Today</span>
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div className={`text-2xl sm:text-3xl font-black mt-2 tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                            Rs. 142,850
                          </div>
                          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                            +18.4% vs last week
                          </div>
                        </div>

                        {/* Stock Units */}
                        <div className={`p-5 rounded-2xl border ${
                          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span>Active Stock Units</span>
                            <Database className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className={`text-2xl sm:text-3xl font-black mt-2 tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                            18,420
                          </div>
                          <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1">
                            12,300 SKUs Managed
                          </div>
                        </div>

                        {/* Net Profit */}
                        <div className={`p-5 rounded-2xl border ${
                          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span>Gross Margin</span>
                            <DollarSign className="w-4 h-4 text-purple-500" />
                          </div>
                          <div className={`text-2xl sm:text-3xl font-black mt-2 tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                            Rs. 48,290
                          </div>
                          <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-1">
                            34.2% Net Margin
                          </div>
                        </div>
                      </div>

                      {/* 3D Revenue Analytics Mockup */}
                      <div className={`p-5 rounded-2xl border space-y-4 shadow-sm relative overflow-hidden ${
                        isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                3D Revenue Analytics
                              </span>
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live POS & Wholesale Sync
                              </span>
                            </div>
                            <div className={`text-sm font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              Hourly Sales & Cash Flow Distribution
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-bold bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs" />
                              <span className="text-slate-700 dark:text-slate-300">Retail POS</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                              <span className="text-slate-700 dark:text-slate-300">Wholesale</span>
                            </div>
                          </div>
                        </div>

                        {/* Dual Series Visual Chart Container */}
                        <div className="relative pt-6 pb-2">
                          {/* Background SVG Curve & Area Gradients */}
                          <div className="h-36 relative">
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35"/>
                                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0"/>
                                </linearGradient>
                                <linearGradient id="wholesaleGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
                                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0"/>
                                </linearGradient>
                              </defs>
                              
                              {/* Filled Area 1 (Retail POS) */}
                              <path 
                                d="M 0,90 Q 40,75 80,45 T 160,30 T 240,55 T 320,20 T 400,35 T 500,10 L 500,120 L 0,120 Z" 
                                fill="url(#posGrad)" 
                              />
                              
                              {/* Filled Area 2 (Wholesale) */}
                              <path 
                                d="M 0,105 Q 40,85 80,65 T 160,50 T 240,75 T 320,40 T 400,55 T 500,25 L 500,120 L 0,120 Z" 
                                fill="url(#wholesaleGrad)" 
                              />

                              {/* Curve Lines */}
                              <path 
                                d="M 0,90 Q 40,75 80,45 T 160,30 T 240,55 T 320,20 T 400,35 T 500,10" 
                                fill="none" 
                                stroke="#3b82f6" 
                                strokeWidth="3.5" 
                                strokeLinecap="round" 
                              />
                              <path 
                                d="M 0,105 Q 40,85 80,65 T 160,50 T 240,75 T 320,40 T 400,55 T 500,25" 
                                fill="none" 
                                stroke="#10b981" 
                                strokeWidth="3" 
                                strokeDasharray="4 4" 
                                strokeLinecap="round" 
                              />

                              {/* Peak Points Glow */}
                              <circle cx="320" cy="20" r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
                              <circle cx="500" cy="10" r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
                              <circle cx="320" cy="40" r="4" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                            </svg>
                          </div>

                          {/* Dual Bar Overlays for 12 Hours */}
                          <div className="absolute inset-0 h-36 flex items-end justify-between gap-1.5 px-2 pointer-events-none">
                            {[
                              { h: '8h', pos: 45, ws: 25 },
                              { h: '9h', pos: 60, ws: 35 },
                              { h: '10h', pos: 75, ws: 45 },
                              { h: '11h', pos: 88, ws: 60 },
                              { h: '12h', pos: 95, ws: 70, isPeak: true },
                              { h: '13h', pos: 70, ws: 50 },
                              { h: '14h', pos: 80, ws: 55 },
                              { h: '15h', pos: 100, ws: 80, isPeak: true },
                              { h: '16h', pos: 65, ws: 42 },
                              { h: '17h', pos: 85, ws: 65 },
                              { h: '18h', pos: 78, ws: 58 },
                              { h: '19h', pos: 92, ws: 75 }
                            ].map((item, i) => (
                              <div key={i} className="flex-1 flex items-end justify-center gap-0.5 h-full group pointer-events-auto">
                                <div 
                                  className="w-1.5 sm:w-2 bg-gradient-to-t from-blue-700 to-blue-400 rounded-t-sm transition-all group-hover:scale-110" 
                                  style={{ height: `${item.pos}%` }} 
                                  title={`Retail POS: Rs. ${(item.pos * 480).toLocaleString()}`}
                                />
                                <div 
                                  className="w-1.5 sm:w-2 bg-gradient-to-t from-emerald-700 to-emerald-400 rounded-t-sm opacity-80 transition-all group-hover:scale-110" 
                                  style={{ height: `${item.ws}%` }}
                                  title={`Wholesale: Rs. ${(item.ws * 350).toLocaleString()}`}
                                />
                              </div>
                            ))}
                          </div>

                          {/* Time Labels */}
                          <div className="flex justify-between text-[9px] font-mono font-bold text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-800">
                            {['8h', '9h', '10h', '11h', '12h (Peak)', '13h', '14h', '15h (Peak)', '16h', '17h', '18h', '19h'].map((t, idx) => (
                              <span key={idx} className={t.includes('Peak') ? 'text-blue-600 dark:text-blue-400 font-black' : ''}>
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Live Hourly Analytics Bar Summary */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Peak Hour Velocity</div>
                            <div className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400 font-mono">3:00 PM (80 Bills/hr)</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Retail vs Wholesale</div>
                            <div className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">68% / 32%</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Cash Inflow Speed</div>
                            <div className="text-xs sm:text-sm font-black text-purple-600 dark:text-purple-400 font-mono">Rs. 18,450 / hr</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: RAPID POS PREVIEW */}
                  {heroActiveTab === 'pos' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`md:col-span-2 p-4 rounded-2xl border space-y-3 ${
                          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase text-blue-500">Active Sale Cart #INV-8924</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">Scanner Connected</span>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">Augmentin 625mg Tab (GSK)</div>
                                <div className="text-[10px] text-slate-500">Batch #AUG-291 • Exp: 12/2026 • 2 Strips</div>
                              </div>
                              <span className="font-black text-slate-900 dark:text-white">Rs. 480.00</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">Panadol Extra 500mg (GSK)</div>
                                <div className="text-[10px] text-slate-500">Batch #PAN-881 • Exp: 09/2027 • 40 Tablets</div>
                              </div>
                              <span className="font-black text-slate-900 dark:text-white">Rs. 240.00</span>
                            </div>
                          </div>
                        </div>

                        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
                          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-slate-500">Subtotal: Rs. 720.00</div>
                            <div className="text-xs font-bold text-emerald-500">Discount (5%): -Rs. 36.00</div>
                            <div className="text-lg font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                              Net: Rs. 684.00
                            </div>
                          </div>
                          <div className="pt-3">
                            <span className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md">
                              <Printer className="w-3.5 h-3.5" />
                              <span>Thermal Print (0.2s)</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: FEFO EXPIRY PREVIEW */}
                  {heroActiveTab === 'fefo' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className={`p-4 rounded-2xl border space-y-1.5 transition-all ${
                          isDark 
                            ? 'bg-rose-950/40 border-rose-500/30' 
                            : 'bg-rose-50/80 border-rose-200 shadow-xs'
                        }`}>
                          <div className="text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                            Expiring &lt;30 Days
                          </div>
                          <div className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            4 Batches
                          </div>
                          <div className="text-[11px] font-medium text-rose-700 dark:text-rose-300">
                            Return supplier credit note ready
                          </div>
                        </div>

                        <div className={`p-4 rounded-2xl border space-y-1.5 transition-all ${
                          isDark 
                            ? 'bg-amber-950/40 border-amber-500/30' 
                            : 'bg-amber-50/80 border-amber-200 shadow-xs'
                        }`}>
                          <div className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Expiring 30-60 Days
                          </div>
                          <div className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            12 Batches
                          </div>
                          <div className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                            Auto-prioritized at billing counter
                          </div>
                        </div>

                        <div className={`p-4 rounded-2xl border space-y-1.5 transition-all ${
                          isDark 
                            ? 'bg-emerald-950/40 border-emerald-500/30' 
                            : 'bg-emerald-50/80 border-emerald-200 shadow-xs'
                        }`}>
                          <div className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Fresh Inventory (&gt;180 Days)
                          </div>
                          <div className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            8,410 Units
                          </div>
                          <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                            Protected FEFO rotation
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────
          3. TRUST BAR (✓ Fast ✓ Secure ✓ Cloud Sync ✓ Multi-User)
      ───────────────────────────────────────────────────────────── */}
      {(() => {
        const sec = getSecStyle('trust_bar');
        if (sec && sec.enabled === false) return null;

        return (
          <section className={`py-6 border-y transition-colors ${
            isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className={`text-sm font-black tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Ultra Fast (0.2s)
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className={`text-sm font-black tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    100% Secure SSL
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className={`text-sm font-black tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Live Cloud Sync
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span className={`text-sm font-black tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Multi-User Access
                  </span>
                </div>

              </div>
            </div>
          </section>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────
          4. PROBLEM / SOLUTION COMPARISON
      ───────────────────────────────────────────────────────────── */}
      <section id="solutions" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            <Compass className="w-3.5 h-3.5" />
            <span>The Modern Pharmacy Shift</span>
          </div>
          <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
            Why Traditional Methods Are Costing You Money
          </h2>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            See how MBI Inventra replaces chaotic manual bookkeeping with precision digital intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* Old Way Card */}
          <div className={`p-8 rounded-3xl border space-y-6 ${
            isDark ? 'bg-rose-950/20 border-rose-900/40' : 'bg-rose-50/50 border-rose-200'
          }`}>
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <XCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-xl font-black">Old Way (Manual Hassle)</h3>
            </div>

            <ul className="space-y-4 text-xs font-medium">
              <li className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-600 font-bold flex items-center justify-center shrink-0 text-[11px]">✕</span>
                <div>
                  <strong className="block text-slate-800 dark:text-white font-bold">Paper Registers & Sticky Notes</strong>
                  High risk of calculation errors, misplaced receipts, and damaged physical ledger books.
                </div>
              </li>
              <li className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-600 font-bold flex items-center justify-center shrink-0 text-[11px]">✕</span>
                <div>
                  <strong className="block text-slate-800 dark:text-white font-bold">Manual Stock Counting</strong>
                  Unexpected stockouts, undetected medicine expiries, and massive inventory write-off losses.
                </div>
              </li>
              <li className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-600 font-bold flex items-center justify-center shrink-0 text-[11px]">✕</span>
                <div>
                  <strong className="block text-slate-800 dark:text-white font-bold">Lost Bills & Slow Checkout</strong>
                  Frustrated customers waiting in long lines while staff searches for medicines manually.
                </div>
              </li>
              <li className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-600 font-bold flex items-center justify-center shrink-0 text-[11px]">✕</span>
                <div>
                  <strong className="block text-slate-800 dark:text-white font-bold">No Real-Time Visibility</strong>
                  Store owners have zero idea of daily gross profits, cashier leaks, or branch performance.
                </div>
              </li>
            </ul>
          </div>

          {/* INVENTRA Solution Card */}
          <div className={`p-8 rounded-3xl border-2 space-y-6 shadow-xl ${
            isDark 
              ? 'bg-blue-950/30 border-blue-500 shadow-blue-500/10' 
              : 'bg-white border-blue-600 shadow-blue-100 ring-4 ring-blue-50'
          }`}>
            <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <h3 className="text-xl font-black">INVENTRA (Smart System)</h3>
            </div>

            <ul className="space-y-4 text-xs font-medium">
              <li className="flex items-start gap-3 text-slate-700 dark:text-slate-200">
                <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-600 font-bold flex items-center justify-center shrink-0 text-[11px]">✓</span>
                <div>
                  <strong className="block text-slate-950 dark:text-white font-bold">100% Digital & Encrypted Records</strong>
                  Automated backups, encrypted customer/supplier records, and zero data loss guarantee.
                </div>
              </li>
              <li className="flex items-start gap-3 text-slate-700 dark:text-slate-200">
                <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-600 font-bold flex items-center justify-center shrink-0 text-[11px]">✓</span>
                <div>
                  <strong className="block text-slate-950 dark:text-white font-bold">Smart FEFO Inventory & Expiry Alerts</strong>
                  First-Expiry-First-Out automated deduction with 30/60/90-day expiry loss warnings.
                </div>
              </li>
              <li className="flex items-start gap-3 text-slate-700 dark:text-slate-200">
                <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-600 font-bold flex items-center justify-center shrink-0 text-[11px]">✓</span>
                <div>
                  <strong className="block text-slate-950 dark:text-white font-bold">0.2s Barcode Scanning & Instant Bills</strong>
                  Ultra-rapid ESC/POS 80mm/58mm thermal receipts with WhatsApp digital invoice dispatch.
                </div>
              </li>
              <li className="flex items-start gap-3 text-slate-700 dark:text-slate-200">
                <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-600 font-bold flex items-center justify-center shrink-0 text-[11px]">✓</span>
                <div>
                  <strong className="block text-slate-950 dark:text-white font-bold">Live Executive Dashboard & P&L</strong>
                  Real-time profit tracking, audit logs, cashier shift balancing, and multi-branch control.
                </div>
              </li>
            </ul>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. CORE FEATURES (6 3D CARDS)
      ───────────────────────────────────────────────────────────── */}
      <section id="features" className={`py-20 border-y transition-colors ${
        isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-100/60 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <Layers className="w-3.5 h-3.5" />
              <span>Modular Architecture</span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
              6 Core Engines Engineered for Pharmacy Excellence
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Every module is designed to run in sync, providing effortless operations from retail counter to accounting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1: Pharmacy Point of Sale */}
            <div className={`p-7 rounded-3xl border transition-all hover:scale-[1.02] hover:shadow-xl group ${
              isDark ? 'bg-slate-900 border-slate-800 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-400 shadow-xs'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                1. Pharmacy POS Terminal
              </h3>
              <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                0.2s rapid checkout with F2 fast search, barcode scanner integration, batch selection, thermal 80mm/58mm printing, and instant discounts.
              </p>
            </div>

            {/* Card 2: Inventory & Stock */}
            <div className={`p-7 rounded-3xl border transition-all hover:scale-[1.02] hover:shadow-xl group ${
              isDark ? 'bg-slate-900 border-slate-800 hover:border-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-400 shadow-xs'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Database className="w-6 h-6" />
              </div>
              <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                2. Smart Inventory Management
              </h3>
              <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Complete cataloging of all medicines with dosage, formula, manufacturer, packaging types, low stock warnings, and reorder levels.
              </p>
            </div>

            {/* Card 3: Sales & Invoicing */}
            <div className={`p-7 rounded-3xl border transition-all hover:scale-[1.02] hover:shadow-xl group ${
              isDark ? 'bg-slate-900 border-slate-800 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-400 shadow-xs'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                3. Sales & Instant Billing
              </h3>
              <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Support for quotations, estimates, sales orders, delivery challans, customer sales returns, and multiple payment methods (Cash, Card, Credit).
              </p>
            </div>

            {/* Card 4: Purchases & Suppliers */}
            <div className={`p-7 rounded-3xl border transition-all hover:scale-[1.02] hover:shadow-xl group ${
              isDark ? 'bg-slate-900 border-slate-800 hover:border-purple-500' : 'bg-white border-slate-200 hover:border-purple-400 shadow-xs'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                4. Purchases & Suppliers
              </h3>
              <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Manage distributor purchase bills, payment-out records, purchase returns, bulk batch imports, and automated cost price averaging.
              </p>
            </div>

            {/* Card 5: Comprehensive Reports */}
            <div className={`p-7 rounded-3xl border transition-all hover:scale-[1.02] hover:shadow-xl group ${
              isDark ? 'bg-slate-900 border-slate-800 hover:border-amber-500' : 'bg-white border-slate-200 hover:border-amber-400 shadow-xs'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-amber-600/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                5. Reports & Profit/Loss
              </h3>
              <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Net profit and loss reports, sales by category, fast-moving drug analytics, daily cashier shift reconciliation, and balance sheets.
              </p>
            </div>

            {/* Card 6: Customer & Supplier Ledgers */}
            <div className={`p-7 rounded-3xl border transition-all hover:scale-[1.02] hover:shadow-xl group ${
              isDark ? 'bg-slate-900 border-slate-800 hover:border-cyan-500' : 'bg-white border-slate-200 hover:border-cyan-400 shadow-xs'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                6. Ledgers & Accounts
              </h3>
              <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Customer udhaar credit accounts, distributor balances, automated payment receipts, cash-in-hand tracking, and bank book ledgers.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. SMART INVENTORY DEEP-DIVE
      ───────────────────────────────────────────────────────────── */}
      <section id="smart-inventory" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`rounded-3xl p-8 sm:p-12 border shadow-xl ${
          isDark 
            ? 'bg-gradient-to-tr from-slate-900 via-slate-900 to-blue-950/40 border-slate-800' 
            : 'bg-white border-slate-200 shadow-slate-100'
        }`}>
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-bold">
              <Zap className="w-3.5 h-3.5" />
              <span>Pharmaceutical Precision</span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
              SMART INVENTORY
            </h2>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Avoid medicine expiry losses, stock shrinkage, and manual stocktaking errors with intelligent algorithmic stock management.
            </p>
          </div>

          {/* Feature Badges & Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
            
            <div className={`p-4 rounded-2xl border text-center space-y-1.5 ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-blue-600 dark:text-blue-400 font-black text-sm">Batch Tracking</div>
              <div className="text-[11px] text-slate-500">Track every batch number & manufacturing date</div>
            </div>

            <div className={`p-4 rounded-2xl border text-center space-y-1.5 ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-rose-600 dark:text-rose-400 font-black text-sm">Expiry Alerts</div>
              <div className="text-[11px] text-slate-500">30 / 60 / 90 days proactive loss warning</div>
            </div>

            <div className={`p-4 rounded-2xl border text-center space-y-1.5 ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-emerald-600 dark:text-emerald-400 font-black text-sm">FEFO Deduction</div>
              <div className="text-[11px] text-slate-500">First-Expiry-First-Out automated billing</div>
            </div>

            <div className={`p-4 rounded-2xl border text-center space-y-1.5 ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-purple-600 dark:text-purple-400 font-black text-sm">FIFO Support</div>
              <div className="text-[11px] text-slate-500">First-In-First-Out stock rotation</div>
            </div>

            <div className={`p-4 rounded-2xl border text-center space-y-1.5 ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-amber-600 dark:text-amber-400 font-black text-sm">Low Stock Alerts</div>
              <div className="text-[11px] text-slate-500">Instant notification when items hit threshold</div>
            </div>

            <div className={`p-4 rounded-2xl border text-center space-y-1.5 ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-indigo-600 dark:text-indigo-400 font-black text-sm">Auto Reorder</div>
              <div className="text-[11px] text-slate-500">1-click purchase orders for depleted stock</div>
            </div>

            <div className={`p-4 rounded-2xl border text-center space-y-1.5 ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-cyan-600 dark:text-cyan-400 font-black text-sm">Stock History Trail</div>
              <div className="text-[11px] text-slate-500">Complete item ledger from purchase to sale</div>
            </div>

            <div className={`p-4 rounded-2xl border text-center space-y-1.5 ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-teal-600 dark:text-teal-400 font-black text-sm">Barcode Generator</div>
              <div className="text-[11px] text-slate-500">Generate & print customized item barcode labels</div>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. POWERFUL DASHBOARD & LIVE GRAPH ANALYTICS SECTION
      ───────────────────────────────────────────────────────────── */}
      <section id="dashboard-preview" className={`py-20 border-y transition-colors ${
        isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-100/60 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Real-Time Business Intelligence</span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
              POWERFUL DASHBOARD & LIVE ANALYTICS
            </h2>
            <p className={`text-sm text-justify sm:text-center leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Gain crystal-clear operational visibility with real-time sales velocity graphs, therapeutic category distribution, cashier rush-hour traffic heatmaps, and automated gross profit calculations.
            </p>
          </div>

          {/* Interactive Graph Suite & Dashboard Mockup UI */}
          <div className={`max-w-6xl mx-auto rounded-3xl border shadow-xl p-5 sm:p-8 space-y-8 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            
            {/* Top KPI Metrics Header Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className={`p-4 rounded-2xl border transition-all ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Weekly Revenue</span>
                  <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className={`text-xl sm:text-2xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  Rs. 1,605,700
                </div>
                <div className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <span>+18.4%</span>
                  <span className="text-slate-400 font-normal">vs previous 7 days</span>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gross Profit Margin</span>
                  <span className="p-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <PieChart className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className={`text-xl sm:text-2xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  Rs. 549,150
                </div>
                <div className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                  <span>34.2% Net Margin</span>
                  <span className="text-slate-400 font-normal">verified</span>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Invoices Cleared</span>
                  <span className="p-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Receipt className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className={`text-xl sm:text-2xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  2,035 Bills
                </div>
                <div className="text-[10.5px] font-bold text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
                  <span>0.2s Speed</span>
                  <span className="text-slate-400 font-normal">avg Rs. 789/bill</span>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">FEFO Protected Stock</span>
                  <span className="p-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className={`text-xl sm:text-2xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  99.8% Zero Loss
                </div>
                <div className="text-[10.5px] font-bold text-teal-600 dark:text-teal-400 mt-1 flex items-center gap-1">
                  <span>0 Expiry Dump</span>
                  <span className="text-slate-400 font-normal">last 90d</span>
                </div>
              </div>
            </div>

            {/* Interactive Graph Tab Navigation Selector */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setActiveDashGraphTab('sales_trend')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeDashGraphTab === 'sales_trend'
                      ? 'bg-blue-600 text-white shadow-md'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>7-Day Sales Trend</span>
                </button>

                <button
                  onClick={() => setActiveDashGraphTab('category_pie')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeDashGraphTab === 'category_pie'
                      ? 'bg-blue-600 text-white shadow-md'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PieChart className="w-3.5 h-3.5" />
                  <span>Category Mix</span>
                </button>

                <button
                  onClick={() => setActiveDashGraphTab('rush_hours')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeDashGraphTab === 'rush_hours'
                      ? 'bg-blue-600 text-white shadow-md'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Rush Hours Velocity</span>
                </button>

                <button
                  onClick={() => setActiveDashGraphTab('margin_velocity')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeDashGraphTab === 'margin_velocity'
                      ? 'bg-blue-600 text-white shadow-md'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Fast SKUs & Margins</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 self-end sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Data Feed (Pharmacy ERP Engine)</span>
              </div>
            </div>

            {/* MAIN GRAPH CANVAS DISPLAY */}
            <div className={`p-4 sm:p-6 rounded-2xl border ${
              isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50/80 border-slate-200'
            }`}>
              
              {/* GRAPH 1: 7-DAY SALES & REVENUE TREND */}
              {activeDashGraphTab === 'sales_trend' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-950'}`}>
                        Weekly Revenue & Bill Count Trajectory
                      </h4>
                      <p className="text-xs text-slate-500">
                        Daily counter performance across all active retail terminals with automatic peak day tagging.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-blue-600" />
                        <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Revenue (PKR)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-emerald-500" />
                        <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Invoices Count</span>
                      </div>
                    </div>
                  </div>

                  {/* SVG Bar & Trend Visualization */}
                  <div className="relative pt-4">
                    <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-56 sm:h-64 border-b border-slate-200 dark:border-slate-800 pb-2">
                      {[
                        { day: 'Mon', date: 'Sep 11', rev: 182400, bills: 230, top: 'Augmentin 625mg', height: '62%' },
                        { day: 'Tue', date: 'Sep 12', rev: 196800, bills: 248, top: 'Panadol Extra', height: '67%' },
                        { day: 'Wed', date: 'Sep 13', rev: 215300, bills: 272, top: 'Risek 20mg Cap', height: '74%' },
                        { day: 'Thu', date: 'Sep 14', rev: 204900, bills: 260, top: 'Brufen 400mg', height: '70%' },
                        { day: 'Fri', date: 'Sep 15', rev: 268700, bills: 340, top: 'Nexum 40mg Tab', height: '91%', isPeak: true },
                        { day: 'Sat', date: 'Sep 16', rev: 289500, bills: 375, top: 'Cravit 500mg', height: '100%', isPeak: true },
                        { day: 'Sun', date: 'Sep 17', rev: 248100, bills: 310, top: 'Arinac Forte', height: '84%' }
                      ].map((item, idx) => {
                        const isHovered = hoveredGraphDay === idx;
                        return (
                          <div 
                            key={idx}
                            onMouseEnter={() => setHoveredGraphDay(idx)}
                            className="flex flex-col items-center h-full justify-end group cursor-pointer relative"
                          >
                            {/* Hover Tooltip Card */}
                            {isHovered && (
                              <div className="absolute -top-16 z-20 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[10.5px] shadow-xl border border-slate-700 whitespace-nowrap text-center animate-fadeIn pointer-events-none">
                                <div className="font-bold text-blue-400">Rs. {item.rev.toLocaleString()}</div>
                                <div className="text-slate-300">{item.bills} Bills • Top: {item.top}</div>
                              </div>
                            )}

                            {/* Bar Column with Gradient */}
                            <div className="w-full max-w-[48px] flex flex-col items-center justify-end h-full">
                              <div 
                                style={{ height: item.height }}
                                className={`w-full rounded-t-xl transition-all duration-300 relative ${
                                  item.isPeak 
                                    ? 'bg-gradient-to-t from-blue-700 to-indigo-500 shadow-md shadow-blue-500/20' 
                                    : 'bg-gradient-to-t from-blue-600 to-sky-400'
                                } ${isHovered ? 'brightness-125 scale-x-105' : 'opacity-90 hover:opacity-100'}`}
                              >
                                {item.isPeak && (
                                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-black text-amber-500 uppercase">
                                    Peak
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-center mt-2">
                              <div className={`text-xs font-black ${isHovered ? 'text-blue-600 dark:text-blue-400' : isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                {item.day}
                              </div>
                              <div className="text-[10px] text-slate-400 hidden sm:block">
                                Rs. {(item.rev / 1000).toFixed(0)}k
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chart Bottom Summary Details */}
                    <div className="mt-4 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Average Basket Ticket</span>
                        <span className="font-black text-blue-600 dark:text-blue-400">Rs. 789.04</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Payment Split</span>
                        <span className="font-black text-emerald-600">78% Cash / 22% Raast</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Peak Saturday Bill Velocity</span>
                        <span className="font-black text-purple-600">47 Bills / Hour</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* GRAPH 2: THERAPEUTIC CATEGORY MIX */}
              {activeDashGraphTab === 'category_pie' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-950'}`}>
                        Therapeutic Drug Category Volume & Profit Margins
                      </h4>
                      <p className="text-xs text-slate-500">
                        Categorical sales breakdown ensuring balanced stock allocation and optimal margin control.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      Total 5,840 Units Dispensed
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* Visual Segmented Ring / Donut Representation */}
                    <div className="lg:col-span-4 flex flex-col items-center justify-center p-4">
                      <div className="relative w-44 h-44 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          {/* Background Ring */}
                          <circle cx="50" cy="50" r="38" fill="transparent" stroke={isDark ? '#1e293b' : '#e2e8f0'} strokeWidth="12" />
                          {/* Antibiotics 34% */}
                          <circle cx="50" cy="50" r="38" fill="transparent" stroke="#2563eb" strokeWidth="12" strokeDasharray="238.7" strokeDashoffset="79" strokeLinecap="round" />
                          {/* Analgesics 22% */}
                          <circle cx="50" cy="50" r="38" fill="transparent" stroke="#10b981" strokeWidth="12" strokeDasharray="238.7" strokeDashoffset="132" strokeLinecap="round" />
                          {/* Gastro 18% */}
                          <circle cx="50" cy="50" r="38" fill="transparent" stroke="#8b5cf6" strokeWidth="12" strokeDasharray="238.7" strokeDashoffset="175" strokeLinecap="round" />
                          {/* Respiratory 14% */}
                          <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f59e0b" strokeWidth="12" strokeDasharray="238.7" strokeDashoffset="204" strokeLinecap="round" />
                          {/* Cardio 12% */}
                          <circle cx="50" cy="50" r="38" fill="transparent" stroke="#ec4899" strokeWidth="12" strokeDasharray="238.7" strokeDashoffset="210" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-xl font-black text-blue-600 dark:text-blue-400">100%</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Stock Mix</span>
                        </div>
                      </div>
                    </div>

                    {/* Category Breakdown Progress Bars */}
                    <div className="lg:col-span-8 space-y-3">
                      {[
                        { name: 'Antibiotics & Anti-Infectives', share: 34, revenue: 'Rs. 545,900', margin: '28% Margin', color: 'bg-blue-600', textColor: 'text-blue-600' },
                        { name: 'Analgesics & Pain Relievers', share: 22, revenue: 'Rs. 353,200', margin: '32% Margin', color: 'bg-emerald-500', textColor: 'text-emerald-600' },
                        { name: 'Gastro & Proton Pump (PPIs)', share: 18, revenue: 'Rs. 289,000', margin: '38% Margin', color: 'bg-purple-600', textColor: 'text-purple-600' },
                        { name: 'Respiratory & Cough Syrups', share: 14, revenue: 'Rs. 224,800', margin: '35% Margin', color: 'bg-amber-500', textColor: 'text-amber-600' },
                        { name: 'Cardiovascular & Diabetes', share: 12, revenue: 'Rs. 192,800', margin: '24% Margin', color: 'bg-pink-500', textColor: 'text-pink-600' },
                      ].map((cat, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 font-bold">
                              <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
                              <span className={isDark ? 'text-white' : 'text-slate-900'}>{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-3 font-semibold text-slate-500">
                              <span>{cat.revenue}</span>
                              <span className={`font-bold ${cat.textColor}`}>({cat.share}%)</span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                                {cat.margin}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${cat.color}`} style={{ width: `${cat.share}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* GRAPH 3: HOURLY COUNTER RUSH VELOCITY */}
              {activeDashGraphTab === 'rush_hours' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-950'}`}>
                        Hourly Counter Footfall & Prescription Rush Velocity
                      </h4>
                      <p className="text-xs text-slate-500">
                        Identifies dual-peak doctor consultant rush hours (Morning 11 AM - 1 PM & Evening 7 PM - 10:30 PM).
                      </p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-500/30">
                      Peak Rush: 8:00 PM (52 Bills/Hour)
                    </div>
                  </div>

                  {/* Hourly Waveform Graph */}
                  <div className="h-52 sm:h-60 pt-4 flex items-end gap-1.5 sm:gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    {[
                      { hour: '8 AM', bills: 8, height: '15%' },
                      { hour: '9 AM', bills: 14, height: '26%' },
                      { hour: '10 AM', bills: 28, height: '52%' },
                      { hour: '11 AM', bills: 44, height: '82%', isPeak: true },
                      { hour: '12 PM', bills: 41, height: '76%', isPeak: true },
                      { hour: '1 PM', bills: 30, height: '56%' },
                      { hour: '2 PM', bills: 16, height: '30%' },
                      { hour: '3 PM', bills: 12, height: '22%' },
                      { hour: '4 PM', bills: 18, height: '34%' },
                      { hour: '5 PM', bills: 25, height: '48%' },
                      { hour: '6 PM', bills: 36, height: '68%' },
                      { hour: '7 PM', bills: 48, height: '90%', isPeak: true },
                      { hour: '8 PM', bills: 52, height: '100%', isPeak: true },
                      { hour: '9 PM', bills: 49, height: '94%', isPeak: true },
                      { hour: '10 PM', bills: 38, height: '72%' },
                      { hour: '11 PM', bills: 19, height: '36%' },
                    ].map((slot, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer">
                        <div 
                          style={{ height: slot.height }}
                          className={`w-full rounded-t-md transition-all ${
                            slot.isPeak 
                              ? 'bg-gradient-to-t from-rose-600 to-amber-500 shadow-xs' 
                              : 'bg-slate-300 dark:bg-slate-700 hover:bg-blue-500'
                          }`}
                        />
                        <span className="text-[9px] sm:text-[10px] text-slate-400 mt-1 font-bold truncate max-w-[28px] sm:max-w-none">
                          {slot.hour}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs flex items-center gap-3">
                    <Zap className="w-5 h-5 text-blue-600 shrink-0" />
                    <span className="leading-relaxed">
                      <strong>Automated Staffing Optimization:</strong> Based on historical sales velocity, Inventra recommends assigning <strong>3 Cashier Terminals</strong> between 7:00 PM and 10:30 PM to maintain sub-0.2s bill completion without customer queues.
                    </span>
                  </div>
                </div>
              )}

              {/* GRAPH 4: FAST-MOVING SKUS & GROSS MARGINS */}
              {activeDashGraphTab === 'margin_velocity' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-950'}`}>
                        Top Fast-Moving Medicines & Profit Generation Matrix
                      </h4>
                      <p className="text-xs text-slate-500">
                        Real-time stock turnover rates, monthly consumption velocity, and supplier profit margins.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                          isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
                        }`}>
                          <th className="py-2.5 px-3">Medicine & Strength</th>
                          <th className="py-2.5 px-3">Formula / Molecule</th>
                          <th className="py-2.5 px-3">Weekly Sold</th>
                          <th className="py-2.5 px-3">Stock Left</th>
                          <th className="py-2.5 px-3">Gross Margin</th>
                          <th className="py-2.5 px-3">Turnover Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {[
                          { name: 'Augmentin 625mg Tab', formula: 'Amoxicillin + Clavulanic', sold: '420 Packs', stock: '85 Packs', margin: '26.5%', rate: '3.2 Days', color: 'emerald' },
                          { name: 'Panadol Extra 500mg', formula: 'Paracetamol + Caffeine', sold: '1,250 Strips', stock: '340 Strips', margin: '34.0%', rate: '1.8 Days', color: 'emerald' },
                          { name: 'Risek 20mg Capsule', formula: 'Omeprazole', sold: '610 Packs', stock: '120 Packs', margin: '38.2%', rate: '2.4 Days', color: 'emerald' },
                          { name: 'Nexum 40mg Tablet', formula: 'Esomeprazole Magnesium', sold: '480 Packs', stock: '94 Packs', margin: '39.0%', rate: '2.9 Days', color: 'emerald' },
                          { name: 'Arinac Forte Syrup', formula: 'Ibuprofen + Pseudoephedrine', sold: '310 Bottles', stock: '45 Bottles', margin: '31.5%', rate: '4.1 Days', color: 'blue' },
                        ].map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="py-2.5 px-3 font-bold">{row.name}</td>
                            <td className="py-2.5 px-3 text-slate-500">{row.formula}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">{row.sold}</td>
                            <td className="py-2.5 px-3 font-mono font-semibold">{row.stock}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                {row.margin}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-purple-600 dark:text-purple-400">{row.rate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Real-time Invoices Ticker & Action Radar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Left Column: Recent Bills Ticker */}
              <div className={`p-5 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-blue-600" />
                    <span>Live Cashier Invoices</span>
                  </div>
                  <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>0.2s Dispatch</span>
                  </span>
                </div>
                
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="font-bold">#INV-8912 • Main POS Counter</div>
                      <div className="text-[10px] text-slate-400">Panadol, Augmentin 625mg, Brufen</div>
                    </div>
                    <span className="font-mono font-bold text-emerald-600">Rs. 1,450</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="font-bold">#INV-8913 • Express Terminal 2</div>
                      <div className="text-[10px] text-slate-400">Risek 20mg Cap, Nexum 40mg Tab</div>
                    </div>
                    <span className="font-mono font-bold text-emerald-600">Rs. 3,890</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="font-bold">#INV-8914 • Main POS Counter</div>
                      <div className="text-[10px] text-slate-400">Arinac Forte Syrup, Disprin</div>
                    </div>
                    <span className="font-mono font-bold text-emerald-600">Rs. 620</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Low Stock Alerts */}
              <div className={`p-5 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Critical FEFO & Reorder Radar</span>
                  </div>
                  <span className="text-rose-600 font-bold text-[11px]">Proactive Protection</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300">
                    <div>
                      <div className="font-bold">Sancos Syrup 120ml</div>
                      <div className="text-[10px]">Only 3 units left (Reorder trigger: 15)</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-bold">Auto-Reorder</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300">
                    <div>
                      <div className="font-bold">Cefspan 400mg Cap</div>
                      <div className="text-[10px]">Batch B-402 expires in 42 days</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-bold">FEFO Prioritized</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300">
                    <div>
                      <div className="font-bold">Entamizole DS Tab</div>
                      <div className="text-[10px]">1 pack left in primary billing rack</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-bold">Rack Empty</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. BUSINESS MANAGEMENT (Customers | Suppliers | Staff | Roles)
      ───────────────────────────────────────────────────────────── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isDark ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-700 border-purple-200'
          }`}>
            <Building2 className="w-3.5 h-3.5" />
            <span>Complete Control</span>
          </div>
          <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
            BUSINESS MANAGEMENT ECOSYSTEM
          </h2>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Customers | Suppliers | Staff & Cashiers | Roles & Permissions | Firms & Branches | Granular Audit Trail
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          
          <div className={`p-5 rounded-2xl border text-center space-y-2 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <Users className="w-6 h-6 mx-auto text-blue-600" />
            <div className="font-bold text-xs">Customers</div>
            <div className="text-[10px] text-slate-400">Udhaar & Profiles</div>
          </div>

          <div className={`p-5 rounded-2xl border text-center space-y-2 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <Truck className="w-6 h-6 mx-auto text-emerald-600" />
            <div className="font-bold text-xs">Suppliers</div>
            <div className="text-[10px] text-slate-400">Distributor Bills</div>
          </div>

          <div className={`p-5 rounded-2xl border text-center space-y-2 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <User className="w-6 h-6 mx-auto text-purple-600" />
            <div className="font-bold text-xs">Staff & Shifts</div>
            <div className="text-[10px] text-slate-400">Cashier Balances</div>
          </div>

          <div className={`p-5 rounded-2xl border text-center space-y-2 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <Shield className="w-6 h-6 mx-auto text-amber-600" />
            <div className="font-bold text-xs">Permissions</div>
            <div className="text-[10px] text-slate-400">Role-Based Access</div>
          </div>

          <div className={`p-5 rounded-2xl border text-center space-y-2 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <Building2 className="w-6 h-6 mx-auto text-cyan-600" />
            <div className="font-bold text-xs">Firms / Branches</div>
            <div className="text-[10px] text-slate-400">Multi-Location</div>
          </div>

          <div className={`p-5 rounded-2xl border text-center space-y-2 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <FileText className="w-6 h-6 mx-auto text-rose-600" />
            <div className="font-bold text-xs">Audit Trail</div>
            <div className="text-[10px] text-slate-400">Anti-Theft Logs</div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. WHY INVENTRA (Checklist of Core Advantages)
      ───────────────────────────────────────────────────────────── */}
      <section className={`py-20 border-y transition-colors ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100/80 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
              WHY INVENTRA
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Built specifically to overcome real operational challenges faced by pharmacies in Pakistan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            
            <div className={`p-6 rounded-2xl border flex items-start gap-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-black">Faster Billing</h3>
                <p className="text-xs text-slate-500 mt-1">0.2s ultra-rapid cashier scan & thermal receipt printing</p>
              </div>
            </div>

            <div className={`p-6 rounded-2xl border flex items-start gap-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-black">Better Stock Control</h3>
                <p className="text-xs text-slate-500 mt-1">Zero medicine expiry losses with FEFO auto-deductions</p>
              </div>
            </div>

            <div className={`p-6 rounded-2xl border flex items-start gap-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <CheckCircle2 className="w-6 h-6 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-black">Less Manual Work</h3>
                <p className="text-xs text-slate-500 mt-1">Automatic double-entry ledgers and profit statements</p>
              </div>
            </div>

            <div className={`p-6 rounded-2xl border flex items-start gap-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <CheckCircle2 className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-black">Real-Time Visibility</h3>
                <p className="text-xs text-slate-500 mt-1">Access store revenue & inventory from any mobile or laptop</p>
              </div>
            </div>

            <div className={`p-6 rounded-2xl border flex items-start gap-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <CheckCircle2 className="w-6 h-6 text-cyan-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-black">Multi-User Access</h3>
                <p className="text-xs text-slate-500 mt-1">Distinct login roles for Cashiers, Pharmacists & Owners</p>
              </div>
            </div>

            <div className={`p-6 rounded-2xl border flex items-start gap-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <CheckCircle2 className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-black">Cloud + Offline Support</h3>
                <p className="text-xs text-slate-500 mt-1">Continue selling during internet load shedding smoothly</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          10. HOW IT WORKS (01 to 05 Step Roadmap)
      ───────────────────────────────────────────────────────────── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            <Compass className="w-3.5 h-3.5" />
            <span>Simple 5-Step Process</span>
          </div>
          <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
            HOW IT WORKS
          </h2>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Get your pharmacy fully digitalized in under 10 minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          
          <div className={`p-6 rounded-2xl border space-y-3 relative ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="text-2xl font-black text-blue-600">01</div>
            <h3 className="text-sm font-black">Register</h3>
            <p className="text-xs text-slate-500">Create your free secure cloud account in seconds.</p>
          </div>

          <div className={`p-6 rounded-2xl border space-y-3 relative ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="text-2xl font-black text-emerald-600">02</div>
            <h3 className="text-sm font-black">Add Business</h3>
            <p className="text-xs text-slate-500">Set pharmacy name, branch address & tax details.</p>
          </div>

          <div className={`p-6 rounded-2xl border space-y-3 relative ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="text-2xl font-black text-purple-600">03</div>
            <h3 className="text-sm font-black">Add Products</h3>
            <p className="text-xs text-slate-500">Import opening stock, batches & distributor rates.</p>
          </div>

          <div className={`p-6 rounded-2xl border space-y-3 relative ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="text-2xl font-black text-amber-600">04</div>
            <h3 className="text-sm font-black">Start Billing</h3>
            <p className="text-xs text-slate-500">Scan barcodes & print instant thermal receipts.</p>
          </div>

          <div className={`p-6 rounded-2xl border space-y-3 relative ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="text-2xl font-black text-cyan-600">05</div>
            <h3 className="text-sm font-black">Manage & Grow</h3>
            <p className="text-xs text-slate-500">Track profits, expand branches & automate inventory.</p>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          10.5 ONLINE STORE & DIGITAL PATIENT FRONTEND
      ───────────────────────────────────────────────────────────── */}
      <section id="store" className={`py-20 border-t transition-colors ${
        isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Patient Digital Storefront & E-Commerce</span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
              ONLINE STORE & DIGITAL PHARMACY FRONT
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Expand your retail pharmacy with a built-in web store. Allow patients to search live inventory, upload doctor prescriptions, place delivery orders, and receive instant WhatsApp invoices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`p-6 rounded-3xl border space-y-3 transition-all hover:scale-[1.02] ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>1. Live Stock Sync</h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Medicine prices, dosages, and available quantities sync automatically from your MBI Inventra POS to your public web store.
              </p>
            </div>

            <div className={`p-6 rounded-3xl border space-y-3 transition-all hover:scale-[1.02] ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>2. Rx Prescription Upload</h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Patients upload doctor prescription photos via phone camera. Cashiers review Rx images in POS and generate approved bills.
              </p>
            </div>

            <div className={`p-6 rounded-3xl border space-y-3 transition-all hover:scale-[1.02] ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>3. WhatsApp Order Dispatch</h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Instant order confirmation and delivery tracking links sent directly to customer WhatsApp number upon checkout.
              </p>
            </div>

            <div className={`p-6 rounded-3xl border space-y-3 transition-all hover:scale-[1.02] ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>4. Doorstep Local Delivery</h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Assign store riders, track cash-on-delivery payments, and manage doorstep medicine dispatches seamlessly.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => navigate('/store')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>LAUNCH LIVE ONLINE STORE</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            
            <a
              href="https://wa.me/923281302636?text=Hello!%20I%20want%20to%20set%20up%20my%20Online%20Pharmacy%20Storefront."
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl border font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <span>Set Up Online Store via WhatsApp</span>
            </a>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          11. PRICING SECTION (BASIC, BUSINESS, PREMIUM + 3-DAY TRIAL)
      ───────────────────────────────────────────────────────────── */}
      <section id="pricing" className={`py-20 border-t transition-colors ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100/80 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <Award className="w-3.5 h-3.5" />
              <span>Transparent Pricing</span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
              PRICING PLANS
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Choose the right plan for your medical store. Switch or upgrade anytime.
            </p>

            {/* 4-Interval Switcher */}
            <div className="pt-4 flex items-center justify-center">
              <div className={`p-1.5 rounded-2xl border flex flex-wrap items-center justify-center gap-1.5 text-xs font-bold shadow-xs ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
              }`}>
                <button
                  onClick={() => setBillingInterval('monthly')}
                  className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer font-bold ${
                    billingInterval === 'monthly'
                      ? 'bg-blue-600 text-white shadow-md'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
                  }`}
                >
                  Monthly
                </button>

                <button
                  onClick={() => setBillingInterval('1year')}
                  className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 font-bold ${
                    billingInterval === '1year'
                      ? 'bg-blue-600 text-white shadow-md'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
                  }`}
                >
                  <span>1 Year</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    billingInterval === '1year'
                      ? 'bg-white/20 text-white'
                      : isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    Save 30%
                  </span>
                </button>

                <button
                  onClick={() => setBillingInterval('3years')}
                  className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 font-bold ${
                    billingInterval === '3years'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
                  }`}
                >
                  <span>3 Years Deal</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    billingInterval === '3years'
                      ? 'bg-white/20 text-white'
                      : isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-800 border border-purple-300'
                  }`}>
                    Save 45%
                  </span>
                </button>

                <button
                  onClick={() => setBillingInterval('5years')}
                  className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 font-bold ${
                    billingInterval === '5years'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
                  }`}
                >
                  <span>5 Years Deal</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    billingInterval === '5years'
                      ? 'bg-white/20 text-white'
                      : isDark ? 'bg-amber-400/20 text-amber-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    Save 60%
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {saasPlans.map((plan) => {
              const pricing = getPlanPricing(plan);
              const isPopular = plan.isPopular || plan.id === 'Business';

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-8 flex flex-col justify-between space-y-6 transition-all relative border ${
                    isPopular
                      ? isDark
                        ? 'bg-gradient-to-b from-blue-950/80 to-slate-900 border-2 border-blue-500 shadow-xl shadow-blue-500/10'
                        : 'bg-white border-2 border-blue-600 shadow-xl ring-4 ring-blue-50'
                      : isDark
                        ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                      Most Popular
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>{plan.name}</h3>
                        {pricing.discountBadge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            {pricing.discountBadge}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{plan.tagline || plan.description}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-bold text-slate-500">Rs.</span>
                        <span className={`text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                          {pricing.totalPrice.toLocaleString()}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">{pricing.periodLabel}</span>
                      </div>
                      {billingInterval !== 'monthly' && (
                        <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          ≈ Rs. {pricing.effectiveMonthly.toLocaleString()}/month effective rate
                        </div>
                      )}
                    </div>

                    <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                      isDark ? 'bg-slate-950/70 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <span>Max Users: <strong className="text-blue-600">{plan.maxUsers} Staff</strong></span>
                      <span>•</span>
                      <span>Max Branches: <strong className="text-blue-600">{plan.maxFirms}</strong></span>
                    </div>

                    <div className={`pt-4 border-t space-y-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                      <div className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Included Features:
                      </div>
                      <ul className="space-y-2.5 text-xs">
                        {pricing.featureList.map((feat, idx) => (
                          <li key={idx} className={`flex items-start gap-2.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Link
                      to={`/checkout?plan=${plan.id.toLowerCase()}&interval=${billingInterval}`}
                      className={`w-full py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                        isPopular
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white shadow-blue-600/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>BUY NOW & UPLOAD PAYMENT SS</span>
                    </Link>

                    <a
                      href={contact.whatsappUrl(
                        `Hello MBI Inventra! I want to activate the *${plan.name} Plan* (${pricing.durationText}, Total: Rs. ${pricing.totalPrice.toLocaleString()}). Please send payment & license details.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Order via WhatsApp</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3-DAY FREE BASIC TRIAL BANNER */}
          <div className={`max-w-3xl mx-auto rounded-3xl p-8 border text-center space-y-4 shadow-xl ${
            isDark 
              ? 'bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border-blue-500/40' 
              : 'bg-gradient-to-r from-blue-50 via-white to-indigo-50 border-blue-200'
          }`}>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>3-DAY RISK FREE TRIAL</span>
            </div>
            <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
              Try MBI Inventra Basic Free for 3 Days
            </h3>
            <p className={`text-xs max-w-xl mx-auto ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              No credit card required. Experience 0.2s Rapid POS, inventory management, and reports risk-free.
            </p>
            <div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
              >
                <span>Login Now </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          12. TESTIMONIALS (RESPONSIVE TOUCH-FRIENDLY CAROUSEL)
      ───────────────────────────────────────────────────────────── */}
      {(() => {
        const sec = getSecStyle('testimonials');
        if (sec && sec.enabled === false) return null;

        const bgImg = sec?.bgImageUrl;
        const overlayOpacity = (sec?.bgOverlayOpacity ?? 80) / 100;
        const badge = sec?.badge || 'Verified Customer Reviews';
        const title = sec?.title || 'TESTIMONIALS';
        const subtitle = sec?.subtitle || 'What reputable pharmacy owners and pharmacists say about MBI Inventra across Pakistan.';
        const testimonialsList = config.testimonials || [];

        return (
          <section 
            id="testimonials" 
            className="py-20 relative overflow-hidden transition-colors"
            onMouseEnter={() => setIsPausedTestimonials(true)}
            onMouseLeave={() => setIsPausedTestimonials(false)}
          >
            {/* Custom Background Image if set */}
            {bgImg && (
              <div 
                className="absolute inset-0 bg-cover bg-center -z-20 transition-all duration-700"
                style={{ backgroundImage: `url(${bgImg})` }}
              >
                <div 
                  className={`absolute inset-0 ${isDark ? 'bg-slate-950' : 'bg-slate-900'}`}
                  style={{ opacity: overlayOpacity }}
                />
              </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 relative z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{badge}</span>
                  </div>
                  <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${
                    bgImg ? 'text-white' : (isDark ? 'text-white' : 'text-slate-950')
                  }`}>
                    {title}
                  </h2>
                  <p className={`text-sm ${
                    bgImg ? 'text-slate-200' : (isDark ? 'text-slate-400' : 'text-slate-600')
                  }`}>
                    {subtitle}
                  </p>
                </div>

                {/* Carousel Controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePrevTestimonial}
                    aria-label="Previous testimonial"
                    className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                      isDark 
                        ? 'bg-slate-900/90 border-slate-800 text-white hover:bg-slate-800 hover:border-slate-700' 
                        : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNextTestimonial}
                    aria-label="Next testimonial"
                    className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                      isDark 
                        ? 'bg-slate-900/90 border-slate-800 text-white hover:bg-slate-800 hover:border-slate-700' 
                        : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Touch-Friendly Swipe Carousel Container */}
              <div 
                className="overflow-hidden py-2"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div 
                  className="flex transition-transform duration-500 ease-out gap-6"
                  style={{
                    transform: `translateX(-${activeTestimonialIdx * (100 / (window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1))}%)`
                  }}
                >
                  {testimonialsList.map((test, index) => {
                    const isCurrent = index === activeTestimonialIdx;

                    return (
                      <div
                        key={test.id}
                        className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] shrink-0 transition-all duration-300"
                      >
                        <div className={`h-full rounded-3xl p-7 flex flex-col justify-between space-y-6 border backdrop-blur-md shadow-md hover:-translate-y-1 transition-all ${
                          isCurrent
                            ? isDark 
                              ? 'bg-gradient-to-b from-slate-900/95 to-slate-900/80 border-blue-500/40 shadow-blue-900/20' 
                              : 'bg-white border-blue-300 shadow-blue-100 ring-2 ring-blue-100'
                            : isDark
                              ? 'bg-slate-900/70 border-slate-800'
                              : 'bg-white/90 border-slate-200/90'
                        }`}>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-amber-500">
                                {[...Array(test.rating)].map((_, i) => (
                                  <Star key={i} className="w-4 h-4 fill-amber-500" />
                                ))}
                              </div>
                              <Quote className="w-6 h-6 text-blue-500/20 dark:text-blue-400/20" />
                            </div>

                            <p className={`text-xs sm:text-sm italic leading-relaxed ${
                              isDark ? 'text-slate-200' : 'text-slate-700'
                            }`}>
                              "{test.content}"
                            </p>
                          </div>

                          <div className={`pt-4 border-t flex items-center gap-3.5 ${
                            isDark ? 'border-slate-800' : 'border-slate-100'
                          }`}>
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs">
                              {(test?.name || 'U').charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className={`text-xs font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {test.name}
                              </div>
                              <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 truncate">
                                {test.pharmacyName}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{test.city}</span>
                              </div>
                            </div>
                            <span className="p-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" title="Verified Pharmacy Customer">
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Carousel Pagination Dots */}
              <div className="flex items-center justify-center gap-2 pt-2">
                {testimonialsList.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTestimonialIdx(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`h-2.5 rounded-full transition-all cursor-pointer ${
                      activeTestimonialIdx === i
                        ? 'w-8 bg-blue-600'
                        : isDark ? 'w-2.5 bg-slate-800 hover:bg-slate-700' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────
          13. INTERACTIVE FAQ ACCORDION (CMS-DRIVEN + SEARCH & FILTER)
      ───────────────────────────────────────────────────────────── */}
      {(() => {
        const sec = getSecStyle('faq');
        if (sec && sec.enabled === false) return null;

        const bgImg = sec?.bgImageUrl;
        const overlayOpacity = (sec?.bgOverlayOpacity ?? 80) / 100;
        const badge = sec?.badge || 'Got Questions?';
        const title = sec?.title || 'Frequently Asked Questions';
        const subtitle = sec?.subtitle || 'Everything you need to know about MBI Inventra setup, licensing, offline syncing, and hardware compatibility.';

        const allFaqs = config.faqs && config.faqs.length > 0 ? config.faqs : [
          {
            id: 'faq-1',
            question: 'What is MBI Inventra and how does it help pharmacies?',
            answer: 'MBI Inventra is an enterprise-grade Pharmacy Point of Sale (POS) and Inventory Cloud ERP designed specifically for single pharmacies and multi-branch retail chains across Pakistan. It handles 0.2s ultra-fast barcode billing, Urdu speech-to-bill AI, batch FEFO expiry tracking, and financial ledgers.'
          },
          {
            id: 'faq-2',
            question: 'Does MBI Inventra work offline if internet disconnects?',
            answer: 'Yes! MBI Inventra includes local offline cache protection. You can continue scanning barcodes, generating customer bills, and issuing 80mm/58mm thermal receipts offline. As soon as connectivity returns, all sales sync automatically.'
          },
          {
            id: 'faq-3',
            question: 'What thermal printers and barcode scanners are supported?',
            answer: 'All standard ESC/POS USB, Wi-Fi, Bluetooth thermal receipt printers (80mm & 58mm) and USB/Wireless 1D/2D barcode scanners work out-of-the-box without requiring custom driver installations.'
          },
          {
            id: 'faq-4',
            question: 'Is my pharmacy inventory and customer data secure?',
            answer: 'Absolutely. All databases are protected with 256-bit SSL encryption, automated daily multi-region cloud snapshots, strict role-based access control, and cashier shift reconciliation safeguards.'
          },
          {
            id: 'faq-5',
            question: 'Can I manage multiple pharmacy branches from a single dashboard?',
            answer: 'Yes! With our Business and Premium packages, you can monitor multi-branch sales, transfer stock between warehouses, and view consolidated profit & loss statements in real-time.'
          },
          {
            id: 'faq-6',
            question: 'Can I upgrade my subscription plan later?',
            answer: 'Yes, you can easily upgrade between Basic, Business, and Premium licenses at any time. Your database records, medicine catalogue, and transaction history remain completely intact.'
          }
        ];

        // Filter FAQs by search query
        const filteredFaqs = allFaqs.filter(faq => {
          if (!faqSearchQuery.trim()) return true;
          const q = faqSearchQuery.toLowerCase();
          return faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q);
        });

        return (
          <section 
            id="faq" 
            className={`py-20 border-t relative overflow-hidden transition-colors ${
              isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-100/50 border-slate-200'
            }`}
          >
            {/* Background Image Layer if set */}
            {bgImg && (
              <div 
                className="absolute inset-0 bg-cover bg-center -z-20 transition-all duration-700"
                style={{ backgroundImage: `url(${bgImg})` }}
              >
                <div 
                  className={`absolute inset-0 ${isDark ? 'bg-slate-950' : 'bg-slate-900'}`}
                  style={{ opacity: overlayOpacity }}
                />
              </div>
            )}

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
              
              <div className="text-center space-y-3">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{badge}</span>
                </div>
                <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${
                  bgImg ? 'text-white' : (isDark ? 'text-white' : 'text-slate-950')
                }`}>
                  {title}
                </h2>
                <p className={`text-xs sm:text-sm max-w-xl mx-auto ${
                  bgImg ? 'text-slate-200' : (isDark ? 'text-slate-400' : 'text-slate-600')
                }`}>
                  {subtitle}
                </p>
              </div>

              {/* Interactive Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={faqSearchQuery}
                    onChange={(e) => setFaqSearchQuery(e.target.value)}
                    placeholder="Search question (e.g., offline, backup, thermal printer, license)..."
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      isDark 
                        ? 'bg-slate-900/90 border-slate-800 text-white placeholder-slate-500' 
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  {faqSearchQuery && (
                    <button
                      onClick={() => setFaqSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setExpandAllFaqs(!expandAllFaqs)}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl border text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isDark 
                      ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800' 
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {expandAllFaqs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{expandAllFaqs ? 'Collapse All' : 'Expand All'}</span>
                </button>
              </div>

              {/* FAQ Accordion List */}
              <div className="space-y-3">
                {filteredFaqs.length === 0 ? (
                  <div className={`p-8 rounded-2xl border text-center space-y-2 ${
                    isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                  }`}>
                    <AlertCircle className="w-6 h-6 mx-auto text-amber-500" />
                    <div className="font-bold text-xs">No questions matched your search query.</div>
                    <div className="text-[11px]">Feel free to ask our support team directly on WhatsApp.</div>
                  </div>
                ) : (
                  filteredFaqs.map((faq) => {
                    const isOpen = expandAllFaqs || openFaqId === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className={`rounded-2xl border overflow-hidden transition-all shadow-xs ${
                          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                        }`}
                      >
                        <button
                          onClick={() => {
                            if (expandAllFaqs) setExpandAllFaqs(false);
                            setOpenFaqId(isOpen && !expandAllFaqs ? null : faq.id);
                          }}
                          className={`w-full px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                            isDark ? 'hover:bg-slate-850' : 'hover:bg-slate-50'
                          }`}
                        >
                          <span className={`text-xs sm:text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {faq.question}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 shrink-0 transition-transform text-slate-400 ${
                              isOpen ? 'rotate-180 text-blue-600' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className={`px-6 pb-4 pt-1 text-xs leading-relaxed border-t ${
                            isDark ? 'text-slate-300 border-slate-800/80' : 'text-slate-600 border-slate-100'
                          }`}>
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Contact Banner */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-blue-50/80 border-blue-200'
              }`}>
                <div className="flex items-center gap-2.5 text-center sm:text-left">
                  <MessageSquare className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Still have questions?</span>
                    <span className="text-slate-500 ml-1">Our pharmacy tech team is ready to help you 24/7.</span>
                  </div>
                </div>
                <a
                  href={contact.whatsappUrl('Hello! I have a question about MBI Inventra.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Ask on WhatsApp</span>
                </a>
              </div>

            </div>
          </section>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────
          14. ABOUT & QUICK LOGIN EMBEDDED
      ───────────────────────────────────────────────────────────── */}
      {(() => {
        const sec = getSecStyle('about');
        if (sec && sec.enabled === false) return null;

        const bgImg = sec?.bgImageUrl;
        const overlayOpacity = (sec?.bgOverlayOpacity ?? 80) / 100;

        return (
          <section id="about" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            {bgImg && (
              <div 
                className="absolute inset-0 bg-cover bg-center -z-20 transition-all duration-700 rounded-3xl"
                style={{ backgroundImage: `url(${bgImg})` }}
              >
                <div 
                  className={`absolute inset-0 rounded-3xl ${isDark ? 'bg-slate-950' : 'bg-slate-900'}`}
                  style={{ opacity: overlayOpacity }}
                />
              </div>
            )}

            <div id="login" className="max-w-xl mx-auto relative z-10">
              <div className={`rounded-3xl p-8 sm:p-10 border shadow-2xl space-y-6 ${
                isDark 
                  ? 'bg-slate-900/95 border-slate-800 backdrop-blur-xl' 
                  : 'bg-white border-slate-300 shadow-slate-200'
              }`}>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto shadow-xs">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                    Sign In to Your Pharmacy Terminal
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Access your store inventory, billing counters, and financial ledgers securely.
                  </p>
                </div>

                {loginError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleQuickLogin} className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Email / Staff Username
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="admin@demo.com or username"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 border ${
                          isDark 
                            ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' 
                            : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Secure Password
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 border ${
                          isDark 
                            ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' 
                            : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loginLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying session...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Sign In & Open Workspace</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────
          15. FINAL CALL TO ACTION (RUN YOUR PHARMACY SMARTER)
      ───────────────────────────────────────────────────────────── */}
      {(() => {
        const sec = getSecStyle('cta');
        if (sec && sec.enabled === false) return null;

        const bgImg = sec?.bgImageUrl;
        const overlayOpacity = (sec?.bgOverlayOpacity ?? 80) / 100;
        const title = sec?.title || 'RUN YOUR PHARMACY SMARTER';
        const subtitle = sec?.subtitle || 'Start with MBI INVENTRA today and experience faster billing, cleaner inventory, and higher profits.';

        return (
          <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`rounded-3xl p-10 sm:p-16 border text-center space-y-6 shadow-2xl relative overflow-hidden ${
              isDark 
                ? 'bg-gradient-to-tr from-blue-950 via-slate-900 to-indigo-950 border-blue-500/30' 
                : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 text-white border-blue-500'
            }`}>
              {bgImg && (
                <div 
                  className="absolute inset-0 bg-cover bg-center -z-10"
                  style={{ backgroundImage: `url(${bgImg})` }}
                >
                  <div 
                    className="absolute inset-0 bg-slate-950"
                    style={{ opacity: overlayOpacity }}
                  />
                </div>
              )}

              <div className="max-w-2xl mx-auto space-y-4 relative z-10">
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white">
                  {title}
                </h2>
                <p className="text-sm sm:text-base text-blue-100 font-medium">
                  {subtitle}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-slate-100 text-blue-900 font-black text-xs shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
                >
                  <span>GET STARTED FREE</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href={contact.whatsappUrl('Hello! I would like to get started with MBI Inventra.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>CHAT ON WHATSAPP ({contact.displayPhone2})</span>
                </a>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────
          16. REDESIGNED ENTERPRISE FOOTER (SITEMAP, SOCIALS, NEWSLETTER)
      ───────────────────────────────────────────────────────────── */}
      {(() => {
        const sec = getSecStyle('footer');
        if (sec && sec.enabled === false) return null;

        const bgImg = sec?.bgImageUrl;
        const overlayOpacity = (sec?.bgOverlayOpacity ?? 90) / 100;
        const socials = config.socialLinks || {};

        return (
          <footer id="contact" className={`border-t py-16 text-xs relative overflow-hidden transition-colors ${
            isDark ? 'bg-slate-950 border-slate-900 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
          }`}>
            {bgImg && (
              <div 
                className="absolute inset-0 bg-cover bg-center -z-10"
                style={{ backgroundImage: `url(${bgImg})` }}
              >
                <div 
                  className={`absolute inset-0 ${isDark ? 'bg-slate-950' : 'bg-slate-900'}`}
                  style={{ opacity: overlayOpacity }}
                />
              </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
              
              {/* TOP ROW: BRAND INFO & NEWSLETTER SUBSCRIPTION BOX */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10 border-b border-slate-200 dark:border-slate-850">
                
                {/* Brand overview */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={config.brand.logoUrl || '/logo.svg'} 
                      alt={config.brand.name} 
                      className="h-8 object-contain" 
                    />
                  </div>
                  <p className="text-xs leading-relaxed max-w-lg">
                    Smart Inventory. Healthier Tomorrow. The leading cloud POS & pharmacy ERP platform built for retail chemists, hospital pharmacies, and multi-branch distribution chains across Pakistan.
                  </p>
                  
                  {/* Social Links Row */}
                  <div className="space-y-2 pt-2">
                    <div className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Official Channels & Community:
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {socials.whatsapp && (
                        <a
                          href={socials.whatsapp}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="WhatsApp Official Support & Sales"
                          className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                            isDark 
                              ? 'bg-emerald-950/40 hover:bg-emerald-600 text-emerald-400 hover:text-white border-emerald-500/30' 
                              : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-emerald-200 shadow-xs'
                          }`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-[11px] font-bold hidden sm:inline">WhatsApp</span>
                        </a>
                      )}
                      {socials.facebook && (
                        <a
                          href={socials.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Facebook Official Page"
                          className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                            isDark 
                              ? 'bg-blue-950/40 hover:bg-blue-600 text-blue-400 hover:text-white border-blue-500/30' 
                              : 'bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border-blue-200 shadow-xs'
                          }`}
                        >
                          <Globe className="w-4 h-4" />
                          <span className="text-[11px] font-bold hidden sm:inline">Facebook</span>
                        </a>
                      )}
                      {socials.twitter && (
                        <a
                          href={socials.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Twitter / X Channel"
                          className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                            isDark 
                              ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700' 
                              : 'bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white border-slate-300 shadow-xs'
                          }`}
                        >
                          <Send className="w-4 h-4" />
                          <span className="text-[11px] font-bold hidden sm:inline">Twitter</span>
                        </a>
                      )}
                      {socials.linkedin && (
                        <a
                          href={socials.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="LinkedIn Profile & Updates"
                          className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                            isDark 
                              ? 'bg-sky-950/40 hover:bg-sky-600 text-sky-400 hover:text-white border-sky-500/30' 
                              : 'bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white border-sky-200 shadow-xs'
                          }`}
                        >
                          <Briefcase className="w-4 h-4" />
                          <span className="text-[11px] font-bold hidden sm:inline">LinkedIn</span>
                        </a>
                      )}
                      {socials.youtube && (
                        <a
                          href={socials.youtube}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="YouTube Video Tutorials & Training"
                          className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                            isDark 
                              ? 'bg-rose-950/40 hover:bg-rose-600 text-rose-400 hover:text-white border-rose-500/30' 
                              : 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border-rose-200 shadow-xs'
                          }`}
                        >
                          <Play className="w-4 h-4" />
                          <span className="text-[11px] font-bold hidden sm:inline">YouTube</span>
                        </a>
                      )}
                      {socials.instagram && (
                        <a
                          href={socials.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Instagram Showcase"
                          className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                            isDark 
                              ? 'bg-pink-950/40 hover:bg-pink-600 text-pink-400 hover:text-white border-pink-500/30' 
                              : 'bg-pink-50 hover:bg-pink-600 text-pink-700 hover:text-white border-pink-200 shadow-xs'
                          }`}
                        >
                          <Camera className="w-4 h-4" />
                          <span className="text-[11px] font-bold hidden sm:inline">Instagram</span>
                        </a>
                      )}
                    </div>

                    {/* Quick 1-Click Social Sharing */}
                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Share Site:
                      </span>
                      <a
                        href="https://api.whatsapp.com/send?text=Check%20out%20MBI%20Inventra%20-%20The%20Intelligent%20Pharmacy%20ERP%20%26%20POS%20System:%20https://mbiinventra.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                          isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-emerald-400' : 'bg-white border-slate-200 text-slate-700 hover:text-emerald-700 shadow-xs'
                        }`}
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-500" /> WhatsApp
                      </a>
                      <a
                        href="https://www.facebook.com/sharer/sharer.php?u=https://mbiinventra.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                          isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-blue-400' : 'bg-white border-slate-200 text-slate-700 hover:text-blue-700 shadow-xs'
                        }`}
                      >
                        <Globe className="w-3 h-3 text-blue-500" /> Facebook
                      </a>
                      <a
                        href="https://twitter.com/intent/tweet?url=https://mbiinventra.com&text=MBI%20Inventra%20-%20Intelligent%20Cloud%20Pharmacy%20ERP%20Platform"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                          isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:text-slate-950 shadow-xs'
                        }`}
                      >
                        <Send className="w-3 h-3 text-sky-500" /> X / Twitter
                      </a>
                      <a
                        href="https://www.linkedin.com/sharing/share-offsite/?url=https://mbiinventra.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                          isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-sky-400' : 'bg-white border-slate-200 text-slate-700 hover:text-sky-700 shadow-xs'
                        }`}
                      >
                        <Briefcase className="w-3 h-3 text-sky-600" /> LinkedIn
                      </a>
                    </div>
                  </div>
                </div>

                {/* Newsletter Subscription Field */}
                <div className="lg:col-span-6 flex flex-col justify-center">
                  <div className={`p-6 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Subscribe to Product Updates & Pharma Tech Alerts
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Receive early access notifications on new POS features, tax policy updates, and release notes.
                    </p>

                    <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="email"
                          required
                          value={newsletterEmail}
                          onChange={(e) => setNewsletterEmail(e.target.value)}
                          placeholder="Enter your email address..."
                          className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDark 
                              ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' 
                              : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                          }`}
                        />
                        <button
                          type="submit"
                          disabled={newsletterStatus === 'loading'}
                          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                        >
                          {newsletterStatus === 'loading' ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Subscribe</span>
                        </button>
                      </div>

                      {newsletterMessage && (
                        <div className={`p-2.5 rounded-xl text-xs font-semibold ${
                          newsletterStatus === 'success' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}>
                          {newsletterMessage}
                        </div>
                      )}
                    </form>
                  </div>
                </div>

              </div>
              
              {/* SITEMAP GRID (4 COLUMNS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                
                {/* Column 1: Products & Modules */}
                <div className="space-y-3">
                  <div className={`font-bold uppercase tracking-wider text-[11px] ${isDark ? 'text-white' : 'text-slate-950'}`}>
                    Core Modules
                  </div>
                  <ul className="space-y-2 text-xs">
                    <li><button type="button" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-blue-600 transition-colors text-left cursor-pointer">0.2s Rapid POS Billing</button></li>
                    <li><button type="button" onClick={(e) => scrollToSection(e, 'smart-inventory')} className="hover:text-blue-600 transition-colors text-left cursor-pointer">FEFO Expiry Batch Radar</button></li>
                    <li><button type="button" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-blue-600 transition-colors text-left cursor-pointer">Urdu Speech POS Bill</button></li>
                    <li><button type="button" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-blue-600 transition-colors text-left cursor-pointer">Purchases & Supplier Credit</button></li>
                    <li><button type="button" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-blue-600 transition-colors text-left cursor-pointer">Customer Loyalty & Khata</button></li>
                    <li><button type="button" onClick={(e) => scrollToSection(e, 'dashboard-preview')} className="hover:text-blue-600 transition-colors text-left cursor-pointer">Financial Ledger & Reports</button></li>
                  </ul>
                </div>

                {/* Column 2: Solutions */}
                <div className="space-y-3">
                  <div className={`font-bold uppercase tracking-wider text-[11px] ${isDark ? 'text-white' : 'text-slate-950'}`}>
                    Pharmacy Solutions
                  </div>
                  <ul className="space-y-2 text-xs">
                    <li><button type="button" onClick={(e) => scrollToSection(e, 'solutions')} className="hover:text-blue-600 transition-colors text-left cursor-pointer">Single Retail Medical Store</button></li>
                    <li><button type="button" onClick={(e) => scrollToSection(e, 'solutions')} className="hover:text-blue-600 transition-colors text-left cursor-pointer">Multi-Branch Pharmacy Chain</button></li>
                    <li><button type="button" onClick={(e) => scrollToSection(e, 'solutions')} className="hover:text-blue-600 transition-colors text-left cursor-pointer">Hospital Chemist & Inpatient</button></li>
                    <li><button type="button" onClick={(e) => scrollToSection(e, 'solutions')} className="hover:text-blue-600 transition-colors text-left cursor-pointer">Medicine Wholesale Distributor</button></li>
                    <li><button type="button" onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-blue-600 transition-colors text-left cursor-pointer">3-Day Free Trial Activation</button></li>
                  </ul>
                </div>

                {/* Column 3: Plans & Pricing */}
                <div className="space-y-3">
                  <div className={`font-bold uppercase tracking-wider text-[11px] ${isDark ? 'text-white' : 'text-slate-950'}`}>
                    Plans & Packages
                  </div>
                  <ul className="space-y-2 text-xs">
                    <li><button type="button" onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-blue-600 transition-colors text-left cursor-pointer">Basic Plan (Rs. 1,999/mo)</button></li>
                    <li><button type="button" onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-blue-600 transition-colors text-left cursor-pointer">Business Plan (Rs. 3,999/mo)</button></li>
                    <li><button type="button" onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-blue-600 transition-colors text-left cursor-pointer">Premium Plan (Rs. 6,999/mo)</button></li>
                    <li><button type="button" onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-blue-600 transition-colors text-left cursor-pointer">1 Year & 3 Year Deals</button></li>
                    <li><button type="button" onClick={(e) => scrollToSection(e, 'faq')} className="hover:text-blue-600 transition-colors text-left cursor-pointer">FAQ & Support</button></li>
                  </ul>
                </div>

                {/* Column 4: Contact & Direct Helpline */}
                <div className="space-y-3">
                  <div className={`font-bold uppercase tracking-wider text-[11px] ${isDark ? 'text-white' : 'text-slate-950'}`}>
                    Direct Helpline & Office
                  </div>
                  <ul className="space-y-2 text-xs">
                    <li>
                      <a href={contact.callUrl(contact.phone1)} className="hover:text-blue-600 transition-colors flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                        <span>Helpline: {contact.displayPhone1}</span>
                      </a>
                    </li>
                    <li>
                      <a href={contact.whatsappUrl('Hello! I need technical support.')} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 transition-colors flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp: {contact.displayPhone2}</span>
                      </a>
                    </li>
                    <li>
                      <a href={`mailto:${contact.email}`} className="hover:text-blue-600 transition-colors flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-purple-600" />
                        <span>{contact.email}</span>
                      </a>
                    </li>
                    <li className="flex items-start gap-2 pt-1 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>{config.brand.officialAddress}</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Support Hours: Mon-Sun 9AM - 11PM PKT</span>
                    </li>
                  </ul>
                </div>

              </div>

              {/* Bottom Legal, Trust & Security Bar */}
              <div className={`pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-[11px] ${
                isDark ? 'border-slate-900 text-slate-500' : 'border-slate-100 text-slate-500'
              }`}>
                <div>
                  © {new Date().getFullYear()} {config.brand.name}. All rights reserved. Built for modern pharmacies across Pakistan.
                </div>
                
                <div className="flex items-center gap-4 flex-wrap justify-center font-medium">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>256-Bit SSL Encryption</span>
                  </span>
                  <span>•</span>
                  <span>99.9% Uptime SLA</span>
                  <span>•</span>
                  <span>Local Offline Cache Protection</span>
                  <span>•</span>
                  <button 
                    onClick={scrollToTop}
                    className="hover:text-blue-600 transition-colors flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <span>Back to Top</span>
                    <ArrowUp className="w-3 h-3" />
                  </button>
                </div>
              </div>

            </div>
          </footer>
        );
      })()}

      {/* FLOATING ACTION HELPER */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        <a
          href={contact.whatsappUrl('Hello MBI Inventra! I need instant support.')}
          target="_blank"
          rel="noopener noreferrer"
          title={`Chat on WhatsApp (${contact.displayPhone2})`}
          className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xl shadow-emerald-600/40 hover:scale-105 transition-transform"
        >
          <MessageSquare className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
};
