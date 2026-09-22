/**
 * MBI Inventra - Landing Page & Portfolio Website CMS Service
 * Allows Admin to edit A-to-Z of the public landing page (mbiinventra.com)
 * from the /server Command Center: Logo, Hero, Features, Pricing, Testimonials,
 * FAQs, Support details, and Custom Section Order.
 */

export interface HeroStat {
  id: string;
  label: string;
  value: string;
  description?: string;
}

export interface SiteFeatureItem {
  id: string;
  title: string;
  category: string;
  description: string;
  iconName: string;
  badge?: string;
  highlight?: string;
  enabled: boolean;
}

export interface SiteTestimonial {
  id: string;
  name: string;
  role: string;
  pharmacyName: string;
  city: string;
  rating: number;
  content: string;
  avatarUrl?: string;
}

export interface SiteFaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface SiteSectionConfig {
  id: string;
  name: string;
  enabled: boolean;
}

export interface SitePricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  popular?: boolean;
  features: string[];
  buttonText: string;
}

export interface SectionCustomStyle {
  id: string;
  name: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  bgImageUrl?: string;
  bgOverlayOpacity?: number; // 0 to 95
  bgGradient?: string;
  customButtonText?: string;
  customButtonUrl?: string;
  enabled?: boolean;
}

export interface SiteSocialLinks {
  whatsapp?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  instagram?: string;
  github?: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribedAt: string;
  createdAt?: string;
  source?: string;
}

export interface SiteCmsConfig {
  version: string;
  brand: {
    name: string;
    tagline: string;
    logoUrl: string; // Custom image url or SVG data URI
    faviconUrl?: string;
    supportPhone: string;
    whatsappNumber: string;
    supportEmail: string;
    officialAddress: string;
    officeHours: string;
  };
  socialLinks: SiteSocialLinks;
  sectionStyles: Record<string, SectionCustomStyle>;
  announcement: {
    enabled: boolean;
    badge: string;
    text: string;
    linkUrl: string;
    linkText: string;
  };
  hero: {
    badge: string;
    title: string;
    highlightWord: string;
    subtitle: string;
    ctaPrimaryText: string;
    ctaSecondaryText: string;
    ctaSecondaryUrl: string;
    heroImageUrl?: string;
    stats: HeroStat[];
  };
  softwareDetails: {
    sectionBadge: string;
    sectionTitle: string;
    sectionSubtitle: string;
    overviewParagraph1: string;
    overviewParagraph2: string;
    highlights: string[];
    hardwareSupported: { title: string; desc: string; icon: string }[];
  };
  features: SiteFeatureItem[];
  pricing: {
    sectionBadge: string;
    sectionTitle: string;
    sectionSubtitle: string;
    guaranteeText: string;
    whatsappInquiryTemplate: string;
    customNote: string;
    plans: SitePricingPlan[];
  };
  testimonials: SiteTestimonial[];
  faqs: SiteFaqItem[];
  sectionsOrder: string[]; // Order of section IDs
  customCss?: string;
  lastUpdated: string;
}

export const PRESET_BACKGROUND_IMAGES = [
  { id: 'none', name: 'None (Clean Minimalist)', url: '' },
  { id: 'pharmacy-modern', name: 'Modern Pharmacy Counter', url: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=1600&q=80' },
  { id: 'medical-lab', name: 'Clinical Laboratory & R&D', url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1600&q=80' },
  { id: 'dark-cyber', name: 'High-Tech Dark Grid Pattern', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1600&q=80' },
  { id: 'abstract-blue', name: 'Sleek Blue Gradient Flow', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80' },
  { id: 'clean-store', name: 'Bright Retail Store Shelves', url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1600&q=80' },
];

export const DEFAULT_SECTION_STYLES: Record<string, SectionCustomStyle> = {
  hero: {
    id: 'hero',
    name: 'Hero Section',
    badge: 'SMART PHARMACY. SMARTER BUSINESS.',
    title: 'MBI INVENTRA',
    subtitle: 'Pharmacy & Inventory Management Platform',
    bgImageUrl: '',
    bgOverlayOpacity: 85,
    bgGradient: 'from-blue-600/10 via-indigo-600/5 to-transparent',
    customButtonText: 'START FREE TRIAL',
    customButtonUrl: '#login',
    enabled: true,
  },
  trust_bar: {
    id: 'trust_bar',
    name: 'Trust & Speed Bar',
    enabled: true,
    bgImageUrl: '',
    bgOverlayOpacity: 0,
  },
  solutions: {
    id: 'solutions',
    name: 'Problem vs Solution Section',
    badge: 'The Modern Pharmacy Shift',
    title: 'Why Traditional Methods Are Costing You Money',
    subtitle: 'See how MBI Inventra replaces chaotic manual bookkeeping with precision digital intelligence.',
    bgImageUrl: '',
    bgOverlayOpacity: 80,
    enabled: true,
  },
  features: {
    id: 'features',
    name: 'Core Features (6 3D Cards)',
    badge: 'Modular Architecture',
    title: '6 Core Engines Engineered for Pharmacy Excellence',
    subtitle: 'Every module is designed to run in sync, providing effortless operations from retail counter to accounting.',
    bgImageUrl: '',
    bgOverlayOpacity: 85,
    enabled: true,
  },
  smart_inventory: {
    id: 'smart_inventory',
    name: 'Smart Inventory Deep-Dive',
    badge: 'Pharmaceutical Precision',
    title: 'SMART INVENTORY',
    subtitle: 'Avoid medicine expiry losses, stock shrinkage, and manual stocktaking errors with intelligent algorithmic stock management.',
    bgImageUrl: '',
    bgOverlayOpacity: 80,
    enabled: true,
  },
  dashboard_preview: {
    id: 'dashboard_preview',
    name: 'Powerful Dashboard Preview',
    badge: 'Executive Control',
    title: 'POWERFUL DASHBOARD',
    subtitle: 'Total Sales, Gross Profit, Stock Levels, Recent Invoices, and Critical Low-Stock Alerts all in one view.',
    bgImageUrl: '',
    bgOverlayOpacity: 80,
    enabled: true,
  },
  business_management: {
    id: 'business_management',
    name: 'Business Management Ecosystem',
    badge: 'Full Enterprise Control',
    title: 'BUSINESS MANAGEMENT',
    subtitle: 'Customers • Suppliers • Staff & Shifts • Granular Roles • Multi-Branch Firms • Audit Trail',
    bgImageUrl: '',
    bgOverlayOpacity: 80,
    enabled: true,
  },
  why_inventra: {
    id: 'why_inventra',
    name: 'Why Inventra Benefits',
    badge: 'Verified Business Value',
    title: 'WHY INVENTRA',
    subtitle: 'Experience measurable business growth and lightning fast operations across your stores.',
    bgImageUrl: '',
    bgOverlayOpacity: 80,
    enabled: true,
  },
  how_it_works: {
    id: 'how_it_works',
    name: 'How It Works (01 to 05 Roadmap)',
    badge: 'Fast Onboarding',
    title: 'HOW IT WORKS',
    subtitle: 'Get your pharmacy running on MBI Inventra in less than 15 minutes with our guided setup.',
    bgImageUrl: '',
    bgOverlayOpacity: 80,
    enabled: true,
  },
  pricing: {
    id: 'pricing',
    name: 'Pricing & Licensing Plans',
    badge: 'Transparent Software Pricing',
    title: 'PRICING',
    subtitle: 'Flexible software license plans with 30-day money-back guarantee and zero hidden fees.',
    bgImageUrl: '',
    bgOverlayOpacity: 80,
    enabled: true,
  },
  testimonials: {
    id: 'testimonials',
    name: 'Customer Testimonials Carousel',
    badge: 'Proven Track Record',
    title: 'TESTIMONIALS',
    subtitle: 'Trusted by over 5,200+ pharmacists, medical store proprietors, and retail chains across Pakistan.',
    bgImageUrl: '',
    bgOverlayOpacity: 80,
    enabled: true,
  },
  faq: {
    id: 'faq',
    name: 'Interactive FAQ Section',
    badge: 'Knowledge & Answers',
    title: 'FREQUENTLY ASKED QUESTIONS',
    subtitle: 'Everything you need to know about MBI Inventra licensing, hardware, security, and offline usage.',
    bgImageUrl: '',
    bgOverlayOpacity: 80,
    enabled: true,
  },
  cta_banner: {
    id: 'cta_banner',
    name: 'Final Call To Action Banner',
    badge: 'Instant Digital Transformation',
    title: 'RUN YOUR PHARMACY SMARTER',
    subtitle: 'Start with MBI INVENTRA today. Experience frictionless billing and automated batch management.',
    bgImageUrl: '',
    bgOverlayOpacity: 80,
    customButtonText: 'GET STARTED FREE',
    customButtonUrl: '#login',
    enabled: true,
  },
  footer: {
    id: 'footer',
    name: 'Footer & Sitemap',
    enabled: true,
    bgImageUrl: '',
    bgOverlayOpacity: 0,
  }
};

export const DEFAULT_SITE_CMS_CONFIG: SiteCmsConfig = {
  version: '1.0.0',
  brand: {
    name: 'MBI Inventra',
    tagline: 'Smart Inventory. Healthier Tomorrow.',
    logoUrl: '',
    supportPhone: '03364585863',
    whatsappNumber: '03281302636',
    supportEmail: 'support@mbiinventra.com',
    officialAddress: 'Sargodha',
    officeHours: 'Monday - Sunday: 9:00 AM - 11:00 PM PST',
  },
  socialLinks: {
    whatsapp: 'https://wa.me/923281302636',
    facebook: 'https://facebook.com/mbiinventra',
    twitter: 'https://twitter.com/mbiinventra',
    linkedin: 'https://linkedin.com/company/mbiinventra',
    youtube: 'https://youtube.com/@mbiinventra',
    instagram: 'https://instagram.com/mbiinventra',
    github: 'https://github.com/mbiinventra',
  },
  sectionStyles: DEFAULT_SECTION_STYLES,
  announcement: {
    enabled: true,
    badge: '🚀 NEW UPDATE v4.2',
    text: 'Rapid Thermal POS & Realtime Multi-Branch Cloud Sync is now active!',
    linkUrl: '#features',
    linkText: 'Explore Features →',
  },
  hero: {
    badge: '⚡ #1 Pharmacy Cloud ERP & Thermal POS in Pakistan',
    title: 'The Intelligent Cloud ERP for Modern Pharmacies & Medical Stores',
    highlightWord: 'Rapid POS & Smart Cloud Sync',
    subtitle: 'Lightning-fast 0.2s thermal billing, automated FEFO expiry alerts, double-entry accounting, and offline-first cloud multi-terminal synchronization.',
    ctaPrimaryText: 'Sign In to Workspace',
    ctaSecondaryText: 'Book Live Demo / WhatsApp',
    ctaSecondaryUrl: 'https://wa.me/923281302636?text=Hello%20MBI%20Inventra%20Team%2C%20I%20want%20a%20live%20demo%20and%20pricing%20details.',
    heroImageUrl: '',
    stats: [
      { id: '1', label: 'Active Pharmacies', value: '5,200+', description: 'Across Pakistan & UAE' },
      { id: '2', label: 'POS Billing Speed', value: '0.2s', description: 'Lightning Fast F2 Checkout' },
      { id: '3', label: 'Batch FEFO Precision', value: '100%', description: 'Expiry Loss Protection' },
      { id: '4', label: 'Cloud Sync SLA', value: '99.99%', description: '100% Offline-First Architecture' },
    ],
  },
  softwareDetails: {
    sectionBadge: 'Comprehensive Pharmacy Architecture',
    sectionTitle: 'Engineered Specifically for Retail Pharmacies & Distributors',
    sectionSubtitle: 'Built from the ground up to solve the real everyday pain points of Pakistani pharmacies: power outages, complex batch expiries, rapid peak-hour queues, and staff accountability.',
    overviewParagraph1: 'MBI Inventra is a robust, enterprise-grade cloud ERP platform designed specifically for medical stores, multi-branch pharmacy chains, and wholesale distributors. It combines the rapid speed of offline desktop point-of-sale software with the limitless scalability of real-time cloud data synchronization.',
    overviewParagraph2: 'With zero internet dependency during internet disconnections, your sales counters continue billing smoothly without stopping. Once internet connects, all invoices, stock shifts, and ledgers automatically sync to the secure central server.',
    highlights: [
      'Instant F2 Rapid Medicine Lookup & Barcode Gun Scanner Support',
      'Universal Barcode Gun & Camera Scanning Integration',
      'Automated FEFO (First-Expiry-First-Out) Batch Allocation',
      'Integrated 1-Click WhatsApp PDF Invoices for Customers',
      'Full Double-Entry Accounting: Profit & Loss, Balance Sheets, Cash in Hand',
      'Multi-User Shift Closing with Physical vs. System Cash Reconciliation',
    ],
    hardwareSupported: [
      { title: 'Thermal Receipt Printers', desc: '58mm & 80mm ESC/POS USB, LAN, Bluetooth & Laser A4/A5', icon: 'Printer' },
      { title: 'Barcode Scanners', desc: '1D / 2D QR Code Guns, Omnidirectional & Bluetooth Scanners', icon: 'QrCode' },
      { title: 'Cash Drawers & Scales', desc: 'RJ11 automated kick-out cash drawers and digital weighing scales', icon: 'HardDrive' },
      { title: 'Tablets, PCs & Touch Screens', desc: 'Full responsive support for POS touch screens, laptops and Android', icon: 'Smartphone' },
    ],
  },
  features: [
    {
      id: 'feat-1',
      title: 'Lightning Rapid POS & Thermal Invoicing',
      category: 'Point of Sale',
      description: 'Finish customer checkouts in under 0.2 seconds. Full support for F2 quick-search, barcode scanners, fractional loose tablets/capsules, and custom 80mm/58mm thermal bills.',
      iconName: 'Zap',
      badge: '0.2s Speed',
      highlight: 'Ultra Fast',
      enabled: true,
    },
    {
      id: 'feat-2',
      title: 'Universal Barcode & Fast Scanner POS',
      category: 'Scanning & POS',
      description: 'Plug-and-play USB barcode guns, 2D QR scanners, and device camera scanning with zero latency lookup and multi-item auto-addition.',
      iconName: 'Scan',
      badge: 'Hardware Sync',
      highlight: 'High Speed',
      enabled: true,
    },
    {
      id: 'feat-3',
      title: 'Smart FEFO Expiry & Batch Management',
      category: 'Inventory & Stock',
      description: 'Automatic First-Expiry-First-Out batch selection. Early warning dashboard for 30, 60, 90, and 180 days expiries to eliminate pharmacy stock wastage.',
      iconName: 'AlertTriangle',
      badge: 'FEFO Engine',
      highlight: 'Zero Loss',
      enabled: true,
    },
    {
      id: 'feat-4',
      title: 'Multi-Branch & Live Cloud Sync',
      category: 'Cloud & Network',
      description: 'Connect all your pharmacy branches, central warehouse, and admin laptops together. Monitor sales, stock levels, and staff shifts in real-time from anywhere.',
      iconName: 'CloudCheck',
      badge: 'Multi-Store',
      highlight: 'Real-Time',
      enabled: true,
    },
    {
      id: 'feat-5',
      title: 'WhatsApp Invoicing & Customer CRM',
      category: 'Customer CRM',
      description: 'Send professional digital receipts directly to customer WhatsApp in 1 click. Maintain customer credit ledgers with automated balance payment reminders.',
      iconName: 'MessageSquare',
      badge: '1-Click Send',
      highlight: 'Customer CRM',
      enabled: true,
    },
    {
      id: 'feat-6',
      title: 'Double-Entry Accounting & P&L Statements',
      category: 'Financials',
      description: 'Comprehensive financial reporting: Daily Profit & Loss, Balance Sheets, Supplier Payables, Expense Registry, and Bank Account reconciliations.',
      iconName: 'DollarSign',
      badge: 'Audit Ready',
      highlight: 'Complete Ledger',
      enabled: true,
    },
    {
      id: 'feat-7',
      title: 'Shortage Registry & Auto Purchase Orders',
      category: 'Procurement',
      description: 'Auto-logs medicines requested by customers that are out of stock. Generate 1-click supplier purchase orders based on minimum stock reorder levels.',
      iconName: 'PackageCheck',
      badge: 'Never Out of Stock',
      highlight: 'Auto PO',
      enabled: true,
    },
    {
      id: 'feat-8',
      title: '100% Offline-First Architecture',
      category: 'Reliability',
      description: 'Never worry about load shedding or broadband failures. Works 100% locally with offline IndexedDB storage and syncs automatically when connection restores.',
      iconName: 'ShieldCheck',
      badge: 'Offline Mode',
      highlight: '100% Uptime',
      enabled: true,
    },
  ],
  pricing: {
    sectionBadge: 'Transparent Software Pricing',
    sectionTitle: 'Simple, Affordable Pricing for Every Pharmacy',
    sectionSubtitle: 'Choose the plan that fits your pharmacy store, clinic, or wholesale business. All plans include full offline mode, rapid POS billing, and dedicated technical support.',
    guaranteeText: '30-Day Money Back Guarantee • No Hidden Charges • Free Data Migration Support',
    whatsappInquiryTemplate: 'Hello MBI Inventra! I am interested in getting a license for my pharmacy. Please share current activation offers.',
    customNote: 'Need custom multi-branch chain server hosting or enterprise on-premise installation? Contact our direct engineering line.',
    plans: [
      {
        id: 'starter',
        name: 'Single Pharmacy Starter',
        price: 1999,
        period: '/month',
        description: 'Ideal for independent medical stores & retail chemist shops.',
        popular: false,
        features: [
          '1 Terminal POS Billing with Instant F2 Search',
          'Universal Barcode Gun & Camera Scanning',
          'Universal Barcode & Generic Medicine Master',
          'FEFO Batch Expiry Tracker with 30-180 Days Alerts',
          'Thermal Receipt Printing (58mm/80mm ESC/POS)',
          '1-Click WhatsApp PDF Invoicing',
          'Offline IndexedDB Engine & Automatic Cloud Sync',
          'Standard Support via WhatsApp & Phone',
        ],
        buttonText: 'Get Starter License',
      },
      {
        id: 'professional',
        name: 'Pharmacy Pro & Multi-User',
        price: 3999,
        period: '/month',
        description: 'Perfect for high-volume pharmacies and 2-3 counter retail stores.',
        popular: true,
        features: [
          'Up to 3 Simultaneous POS Counter Terminals',
          'Lightning Fast Barcode Gun Scanner Support',
          'Cashier Shift Management & End-of-Day Float Close',
          'Shortage Medicine Registry & Auto Supplier POs',
          'Complete Double-Entry Accounting & P&L Statements',
          'Customer Credit Ledgers with Automated WhatsApp Reminders',
          'Realtime Central Server Multi-Terminal Sync',
          'Priority VIP WhatsApp & Remote AnyDesk Support',
        ],
        buttonText: 'Get Professional License',
      },
      {
        id: 'enterprise',
        name: 'Multi-Branch Pharmacy Chain',
        price: 6999,
        period: '/month',
        description: 'For pharmacy chains, hospital pharmacies & wholesale distributors.',
        popular: false,
        features: [
          'Unlimited POS Counters & Multi-Branch Inter-Store Transfers',
          'Central Warehouse Stock Requisitions & Batch Tracking',
          'Role-Based Granular Permissions (Cashier, Pharmacist, Admin)',
          'Automated Nightly Cloud & Local DB Backups',
          'Custom Branding, Custom Receipt Logo & Invoice Header',
          'Full REST API & Online Storefront Catalog Support',
          'Dedicated Account Manager & 24/7 SLA Engineering Support',
          'Free On-Site or Remote Staff Training Included',
        ],
        buttonText: 'Get Enterprise Chain License',
      },
    ],
  },
  testimonials: [
    {
      id: 'test-1',
      name: 'Dr. Muhammad Tariq',
      role: 'Chief Pharmacist & Owner',
      pharmacyName: 'Al-Shifa Medicos',
      city: 'Lahore (DHA Phase 5)',
      rating: 5,
      content: 'MBI Inventra transformed our busy pharmacy. The 0.2-second thermal billing and instant F2 medicine search cut customer checkout lines by more than 70%. Expiry tracking saved us thousands of rupees every single month.',
    },
    {
      id: 'test-2',
      name: 'Usman Ali Qureshi',
      role: 'Managing Director',
      pharmacyName: 'CarePlus Pharmacy Chain',
      city: 'Karachi (Clifton)',
      rating: 5,
      content: 'We run 4 branches across Karachi. MBI Inventra’s cloud synchronization lets me check live sales and inventory transfers from my smartphone in real-time. Offline mode is a lifesaver during network glitches!',
    },
    {
      id: 'test-3',
      name: 'Sardar Khurram Shah',
      role: 'Proprietor',
      pharmacyName: 'Khyber Medicos',
      city: 'Islamabad (Blue Area)',
      rating: 5,
      content: 'MBI Inventra transformed our dispensary workflow! We were billing customers within 15 minutes of setting up. Their WhatsApp support team is exceptionally fast and polite.',
    },
    {
      id: 'test-4',
      name: 'Hafiz Bilal Ahmed',
      role: 'Operations Head',
      pharmacyName: 'Madina Pharmacy & Surgicals',
      city: 'Faisalabad (Satyana Road)',
      rating: 5,
      content: 'Best pharmacy ERP software in Pakistan without a doubt. The batch expiry alerts and F2 rapid search make staff training super easy. Highly recommended for any medical store owner!',
    },
  ],
  faqs: [
    {
      id: 'faq-1',
      question: 'What is MBI Inventra?',
      answer: 'MBI Inventra is a comprehensive, enterprise-grade cloud ERP platform designed specifically for medical stores, pharmacies, and pharmaceutical distributors. It integrates rapid 0.2s POS billing, automated FEFO expiry tracking, inventory management, double-entry accounting, and multi-branch cloud sync in a single unified interface.',
      category: 'General',
    },
    {
      id: 'faq-2',
      question: 'Is my pharmacy patient and sales data safe and encrypted?',
      answer: 'Yes, 100%! All data is safeguarded with bank-grade 256-Bit SSL encryption, encrypted local cache, automated cloud snapshots, and strict role-based access control. You also have 1-click full offline export capabilities.',
      category: 'Security',
    },
    {
      id: 'faq-3',
      question: 'Does it support multiple users and staff shift balancing?',
      answer: 'Yes! You can add unlimited cashiers, pharmacists, and managers with granular permissions. It includes automated cashier shift opening/closing with physical vs system cash reconciliation and anti-leakage audit logs.',
      category: 'Features',
    },
    {
      id: 'faq-4',
      question: 'Does it work offline without internet connection?',
      answer: 'Yes, 100%! MBI Inventra utilizes advanced offline-first IndexedDB architecture. All sales counters, barcode scanning, and receipt printing function flawlessly with zero internet. Once connection restores, everything syncs to the central cloud automatically.',
      category: 'Reliability',
    },
    {
      id: 'faq-5',
      question: 'Can I upgrade my license plan or add branches later?',
      answer: 'Absolutely. You can seamlessly upgrade from Basic to Business or Premium at any time without losing any data or interrupting your active billing counters.',
      category: 'Billing',
    },
    {
      id: 'faq-6',
      question: 'Which thermal printers and barcode scanners are compatible?',
      answer: 'Universally compatible with all 58mm & 80mm ESC/POS thermal printers (USB, Bluetooth, LAN, Wi-Fi) and all standard 1D/2D barcode scanners and QR code guns.',
      category: 'Hardware',
    },
  ],
  sectionsOrder: [
    'hero',
    'trust_bar',
    'solutions',
    'features',
    'smart_inventory',
    'dashboard_preview',
    'business_management',
    'why_inventra',
    'how_it_works',
    'pricing',
    'testimonials',
    'faq',
    'cta_banner',
    'footer',
  ],
  lastUpdated: new Date().toISOString(),
};


const STORAGE_KEY = 'mbi_site_cms_config';

export function getBrandContact() {
  const config = getSiteCmsConfig();
  let masterPhone = '';
  let masterWhatsapp = '';
  let masterEmail = '';
  try {
    const rawMaster = localStorage.getItem('mbi_master_support_helpline_config');
    if (rawMaster) {
      const parsed = JSON.parse(rawMaster);
      if (parsed.phone) masterPhone = parsed.phone;
      if (parsed.whatsappNumber) masterWhatsapp = parsed.whatsappNumber;
      if (parsed.email) masterEmail = parsed.email;
    }
  } catch (e) {}

  const phone1 = masterPhone || config.brand.supportPhone || '03364585863';
  const phone2 = masterWhatsapp || config.brand.whatsappNumber || '03281302636';
  const whatsappNumber = masterWhatsapp || config.brand.whatsappNumber || '03281302636';
  const email = masterEmail || config.brand.supportEmail || 'support@mbiinventra.com';
  const address = config.brand.officialAddress || 'Sargodha';
  const officeHours = config.brand.officeHours || 'Monday - Sunday: 9:00 AM - 11:00 PM PST';
  
  const cleanPhone = (p: string) => (p || '').replace(/[^0-9]/g, '');
  const cleanPhone1 = cleanPhone(phone1);
  const cleanPhone2 = cleanPhone(phone2);
  const cleanWhatsApp = cleanPhone2.startsWith('0') 
    ? '92' + cleanPhone2.slice(1) 
    : cleanPhone2.startsWith('92') 
    ? cleanPhone2 
    : cleanPhone1.startsWith('0') 
    ? '92' + cleanPhone1.slice(1) 
    : '923281302636';

  const formatDisplayPhone = (p: string) => {
    const c = cleanPhone(p);
    if (c.length === 11 && c.startsWith('03')) {
      return `${c.slice(0, 4)}-${c.slice(4)}`;
    }
    return p;
  };

  return {
    phone1,
    phone2,
    displayPhone1: formatDisplayPhone(phone1),
    displayPhone2: formatDisplayPhone(phone2),
    whatsappNumber,
    email,
    address,
    officeHours,
    cleanPhone1,
    cleanPhone2,
    cleanWhatsApp,
    whatsappUrl: (msg?: string) => `https://wa.me/${cleanWhatsApp}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`,
    callUrl: (num?: string) => `tel:${cleanPhone(num || phone1)}`
  };
}

const NEWSLETTER_STORAGE_KEY = 'mbi_newsletter_subscribers';

export function getNewsletterSubscribers(): NewsletterSubscriber[] {
  try {
    const raw = localStorage.getItem(NEWSLETTER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [
      { id: 'sub-1', email: 'pharmacare.lahore@gmail.com', subscribedAt: new Date(Date.now() - 86400000 * 3).toISOString(), source: 'Landing Footer' },
      { id: 'sub-2', email: 'dr.usman.medicos@yahoo.com', subscribedAt: new Date(Date.now() - 86400000 * 7).toISOString(), source: 'Landing Footer' }
    ];
  } catch {
    return [];
  }
}

export function saveNewsletterSubscriber(email: string, source: string = 'Landing Footer'): { success: boolean; message: string } {
  if (!email || !email.includes('@') || !email.includes('.')) {
    return { success: false, message: 'Please enter a valid email address.' };
  }
  try {
    const current = getNewsletterSubscribers();
    const cleanEmail = email.trim().toLowerCase();
    if (current.some(s => s.email.toLowerCase() === cleanEmail)) {
      return { success: true, message: 'You are already subscribed to our newsletter!' };
    }
    const nowIso = new Date().toISOString();
    const newSub: NewsletterSubscriber = {
      id: 'sub-' + Date.now(),
      email: cleanEmail,
      subscribedAt: nowIso,
      createdAt: nowIso,
      source: source || 'Landing Footer'
    };
    const updated = [newSub, ...current];
    localStorage.setItem(NEWSLETTER_STORAGE_KEY, JSON.stringify(updated));
    return { success: true, message: 'Thank you for subscribing! Check your inbox for updates.' };
  } catch (err) {
    return { success: false, message: 'Failed to save subscription. Please try again.' };
  }
}

/**
 * Retrieve current Site CMS configuration
 */
export function getSiteCmsConfig(): SiteCmsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SITE_CMS_CONFIG;
    const parsed = JSON.parse(raw);
    const configHero = { ...DEFAULT_SITE_CMS_CONFIG.hero, ...(parsed.hero || {}) };
    
    // Auto-clean any legacy cached 50,000+ pre-indexed stats
    if (Array.isArray(configHero.stats)) {
      configHero.stats = configHero.stats.map(s => {
        if (s.label?.toLowerCase().includes('pre-indexed') || s.label?.toLowerCase().includes('indexed')) {
          return { id: s.id || '3', label: 'Batch FEFO Precision', value: '100%', description: 'Expiry Loss Protection' };
        }
        return s;
      });
    }

    if (configHero.subtitle?.includes('50,000+')) {
      configHero.subtitle = configHero.subtitle.replace('50,000+ pre-indexed medicines, ', '');
    }

    return {
      ...DEFAULT_SITE_CMS_CONFIG,
      ...parsed,
      brand: { ...DEFAULT_SITE_CMS_CONFIG.brand, ...(parsed.brand || {}) },
      socialLinks: { ...DEFAULT_SITE_CMS_CONFIG.socialLinks, ...(parsed.socialLinks || {}) },
      sectionStyles: { ...DEFAULT_SITE_CMS_CONFIG.sectionStyles, ...(parsed.sectionStyles || {}) },
      announcement: { ...DEFAULT_SITE_CMS_CONFIG.announcement, ...(parsed.announcement || {}) },
      hero: configHero,
      softwareDetails: { ...DEFAULT_SITE_CMS_CONFIG.softwareDetails, ...(parsed.softwareDetails || {}) },
      pricing: {
        ...DEFAULT_SITE_CMS_CONFIG.pricing,
        ...(parsed.pricing || {}),
        plans: parsed.pricing?.plans?.length ? parsed.pricing.plans : DEFAULT_SITE_CMS_CONFIG.pricing.plans,
      },
      features: parsed.features?.length ? parsed.features : DEFAULT_SITE_CMS_CONFIG.features,
      testimonials: parsed.testimonials?.length ? parsed.testimonials : DEFAULT_SITE_CMS_CONFIG.testimonials,
      faqs: parsed.faqs?.length ? parsed.faqs : DEFAULT_SITE_CMS_CONFIG.faqs,
      sectionsOrder: parsed.sectionsOrder?.length ? parsed.sectionsOrder : DEFAULT_SITE_CMS_CONFIG.sectionsOrder,
    };
  } catch (err) {
    console.error('[SiteCMS] Failed to read config from localStorage:', err);
    return DEFAULT_SITE_CMS_CONFIG;
  }
}

/**
 * Save Site CMS configuration & broadcast live update event
 */
export function saveSiteCmsConfig(config: Partial<SiteCmsConfig>): SiteCmsConfig {
  try {
    const current = getSiteCmsConfig();
    const merged: SiteCmsConfig = {
      ...current,
      ...config,
      brand: { ...current.brand, ...(config.brand || {}) },
      socialLinks: { ...current.socialLinks, ...(config.socialLinks || {}) },
      sectionStyles: { ...current.sectionStyles, ...(config.sectionStyles || {}) },
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('mbi-site-cms-updated', { detail: merged }));
    return merged;
  } catch (err) {
    console.error('[SiteCMS] Failed to save config to localStorage:', err);
    return getSiteCmsConfig();
  }
}

/**
 * Reset Site CMS configuration to original defaults
 */
export function resetSiteCmsConfig(): SiteCmsConfig {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('mbi-site-cms-updated', { detail: DEFAULT_SITE_CMS_CONFIG }));
  return DEFAULT_SITE_CMS_CONFIG;
}

export interface UserFeedbackRecord {
  id: string;
  senderName: string;
  pharmacyName: string;
  city: string;
  emailOrPhone: string;
  category: 'Suggestion' | 'Feature Request' | 'Bug Report' | 'Appreciation' | 'Support';
  rating: number;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
}

const FEEDBACK_STORAGE_KEY = 'mbi_user_feedbacks_queue';

export function getUserFeedbacks(): UserFeedbackRecord[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function submitUserFeedbackRecord(data: Omit<UserFeedbackRecord, 'id' | 'status' | 'createdAt'>): UserFeedbackRecord {
  const current = getUserFeedbacks();
  const newItem: UserFeedbackRecord = {
    id: 'fb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    ...data,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  const updated = [newItem, ...current];
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('mbi-feedback-updated', { detail: updated }));
  return newItem;
}

export function approveUserFeedback(feedbackId: string): boolean {
  const currentFeedbacks = getUserFeedbacks();
  const index = currentFeedbacks.findIndex(f => f.id === feedbackId);
  if (index === -1) return false;

  const fb = currentFeedbacks[index];
  fb.status = 'approved';
  fb.approvedAt = new Date().toISOString();
  currentFeedbacks[index] = fb;
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(currentFeedbacks));

  // Transform into live testimonial for site CMS
  const currentCms = getSiteCmsConfig();
  const newTestimonial: SiteTestimonial = {
    id: 'test-user-' + Date.now(),
    name: fb.senderName || 'Verified Pharmacist',
    role: 'Pharmacy Proprietor',
    pharmacyName: fb.pharmacyName || 'Medical Store',
    city: fb.city || 'Pakistan',
    rating: fb.rating || 5,
    content: fb.message
  };

  const updatedTestimonials = [newTestimonial, ...currentCms.testimonials];
  saveSiteCmsConfig({ testimonials: updatedTestimonials });
  window.dispatchEvent(new CustomEvent('mbi-feedback-updated', { detail: currentFeedbacks }));
  return true;
}

export function rejectUserFeedback(feedbackId: string): boolean {
  const currentFeedbacks = getUserFeedbacks();
  const index = currentFeedbacks.findIndex(f => f.id === feedbackId);
  if (index === -1) return false;

  currentFeedbacks[index].status = 'rejected';
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(currentFeedbacks));
  window.dispatchEvent(new CustomEvent('mbi-feedback-updated', { detail: currentFeedbacks }));
  return true;
}


