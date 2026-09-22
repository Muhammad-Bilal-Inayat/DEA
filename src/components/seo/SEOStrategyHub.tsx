import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, Globe, Search, MapPin, Calendar, Code, 
  CheckCircle2, AlertTriangle, Copy, Check, Download, 
  ExternalLink, RefreshCw, Layers, ShieldCheck, ArrowRight, 
  Eye, FileText, Smartphone, Laptop, Sliders, Zap, Share2, Plus, Trash2
} from 'lucide-react';
import { 
  PageMetaConfig, 
  REGIONAL_SEO_PRESETS, 
  LocalRegionPreset, 
  INITIAL_OFF_PAGE_SCHEDULE, 
  OffPageScheduleItem, 
  generateSchemaJsonLd, 
  applyPageMetadata, 
  calculateSeoAudit, 
  SeoAuditReport 
} from '../../lib/seoManager';

export const SEOStrategyHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'audit' | 'onpage' | 'local' | 'offpage' | 'schema' | 'sitemap'>('audit');

  // Form State for Meta Configuration
  const [metaTitle, setMetaTitle] = useState('8 Pharma Inventory Manager - Enterprise Pharmacy Management & POS System');
  const [metaDescription, setMetaDescription] = useState('Complete enterprise Pharmacy Management Software & Cloud POS. Real-time FEFO batch tracking, multi-branch inventory, WhatsApp billing, narcotics register, FBR/GST tax invoices, and offline mode.');
  const [keywords, setKeywords] = useState<string[]>([
    'pharmacy software',
    'pharmacy POS',
    'FEFO expiry tracking',
    'medicine inventory management',
    'medical store billing software',
    'whatsapp invoice generator',
    'narcotics register',
    'pakistan pharmacy cloud ERP'
  ]);
  const [newKeyword, setNewKeyword] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState(() => typeof window !== 'undefined' ? window.location.origin : 'https://8pharma.app');
  const [robotsDirective, setRobotsDirective] = useState('index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');

  // Local SEO State
  const [selectedRegionId, setSelectedRegionId] = useState<string>('pk-khi');
  const selectedRegion = useMemo(() => {
    return REGIONAL_SEO_PRESETS.find(r => r.id === selectedRegionId) || REGIONAL_SEO_PRESETS[0];
  }, [selectedRegionId]);

  // Off-Page Schedule State
  const [offPageSchedule, setOffPageSchedule] = useState<OffPageScheduleItem[]>(() => {
    const saved = localStorage.getItem('mbi_seo_offpage_schedule');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_OFF_PAGE_SCHEDULE;
  });

  const [newScheduleItem, setNewScheduleItem] = useState<Partial<OffPageScheduleItem>>({
    week: 1,
    channel: 'Healthcare Directory',
    title: '',
    targetKeyword: '',
    targetUrl: '',
    anchorText: '',
    domainAuthorityGoal: 'DA 40+',
    status: 'Planned',
    notes: ''
  });
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);

  // Schema Tab Selected Type
  const [selectedSchemaType, setSelectedSchemaType] = useState<'SoftwareApplication' | 'MedicalBusiness' | 'BreadcrumbList' | 'FAQPage' | 'HowTo' | 'Product'>('SoftwareApplication');

  // Feedback Toasts
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const [serpDevice, setSerpDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Calculate Real-time SEO Audit Score
  const auditReport: SeoAuditReport = useMemo(() => {
    return calculateSeoAudit(metaTitle, metaDescription, keywords);
  }, [metaTitle, metaDescription, keywords]);

  const handleApplyMetadata = () => {
    applyPageMetadata({
      title: metaTitle,
      description: metaDescription,
      keywords,
      canonicalUrl,
      geoRegion: selectedRegion.geoRegion,
      geoPosition: selectedRegion.geoPosition,
      geoPlacename: `${selectedRegion.city}, ${selectedRegion.country}`
    });

    setAppliedNotice('Metadata, OpenGraph & Geo tags successfully applied live to document head!');
    setTimeout(() => setAppliedNotice(null), 4000);
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setKeywords(keywords.filter(k => k !== kwToRemove));
  };

  const handleUpdateScheduleStatus = (id: string, status: OffPageScheduleItem['status']) => {
    const updated = offPageSchedule.map(item => item.id === id ? { ...item, status } : item);
    setOffPageSchedule(updated);
    localStorage.setItem('mbi_seo_offpage_schedule', JSON.stringify(updated));
  };

  const handleAddScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleItem.title || !newScheduleItem.targetKeyword) return;
    const item: OffPageScheduleItem = {
      id: `sch-${Date.now()}`,
      week: Number(newScheduleItem.week) || 1,
      channel: newScheduleItem.channel || 'Healthcare Directory',
      title: newScheduleItem.title,
      targetKeyword: newScheduleItem.targetKeyword,
      targetUrl: newScheduleItem.targetUrl || canonicalUrl,
      anchorText: newScheduleItem.anchorText || '8 Pharma Inventory Manager',
      domainAuthorityGoal: newScheduleItem.domainAuthorityGoal || 'DA 40+',
      status: (newScheduleItem.status as any) || 'Planned',
      notes: newScheduleItem.notes || ''
    };
    const updated = [...offPageSchedule, item];
    setOffPageSchedule(updated);
    localStorage.setItem('mbi_seo_offpage_schedule', JSON.stringify(updated));
    setShowAddScheduleModal(false);
    setNewScheduleItem({
      week: 1,
      channel: 'Healthcare Directory',
      title: '',
      targetKeyword: '',
      targetUrl: '',
      anchorText: '',
      domainAuthorityGoal: 'DA 40+',
      status: 'Planned',
      notes: ''
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedCode(label);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  };

  // Generate Current Schema JSON string
  const currentSchemaJson = useMemo(() => {
    const schema = generateSchemaJsonLd({
      type: selectedSchemaType,
      regionPreset: selectedRegion,
      breadcrumbs: [
        { label: 'Home', path: '/user' },
        { label: 'SEO Strategy', path: '/seo', isCurrent: true }
      ]
    });
    return JSON.stringify(schema, null, 2);
  }, [selectedSchemaType, selectedRegion]);

  // Generate XML Sitemap string
  const sitemapXml = useMemo(() => {
    const origin = canonicalUrl.replace(/\/$/, '');
    const date = new Date().toISOString().split('T')[0];
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}/</loc>
    <lastmod>${date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${origin}/store</loc>
    <lastmod>${date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${origin}/store/products</loc>
    <lastmod>${date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${origin}/pricing</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${origin}/login</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;
  }, [canonicalUrl]);

  // Generate robots.txt string
  const robotsTxt = useMemo(() => {
    const origin = canonicalUrl.replace(/\/$/, '');
    return `User-agent: *
Allow: /
Allow: /store/
Allow: /store/products
Allow: /pricing
Disallow: /seo
Disallow: /server
Disallow: /master
Disallow: /api/

Sitemap: ${origin}/sitemap.xml`;
  }, [canonicalUrl]);

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-white tracking-tight">SEO Strategy & Optimization Hub</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                  Technical On-Page • Local Geo • Schema JSON-LD
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Comprehensive search engine strategy: real-time meta optimization, regional local SEO presets, rich Schema.org structured data, and 12-week off-page backlink roadmap.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleApplyMetadata}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md hover:shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Apply Live Metadata</span>
            </button>
          </div>
        </div>
      </div>

      {appliedNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{appliedNotice}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl flex items-center gap-1.5 overflow-x-auto shadow-2xs">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Executive Health & SERP</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
            auditReport.overallScore >= 90 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
          }`}>
            {auditReport.overallScore}%
          </span>
        </button>

        <button
          onClick={() => setActiveTab('onpage')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'onpage'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>On-Page & Meta Tags</span>
        </button>

        <button
          onClick={() => setActiveTab('local')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'local'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Local Regional SEO ({selectedRegion.city})</span>
        </button>

        <button
          onClick={() => setActiveTab('offpage')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'offpage'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>12-Week Off-Page Schedule ({offPageSchedule.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'schema'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Schema JSON-LD Enhancer</span>
        </button>

        <button
          onClick={() => setActiveTab('sitemap')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'sitemap'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Sitemap & Robots.txt</span>
        </button>
      </div>

      {/* TAB 1: EXECUTIVE HEALTH & SERP SIMULATOR */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Score Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall SEO Health</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">Grade A+</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{auditReport.overallScore}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${auditReport.overallScore}%` }} />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Title Tag Health</span>
                <span className="text-xs font-mono text-slate-400">{metaTitle.length} / 60 ch</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{auditReport.titleScore}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${auditReport.titleScore}%` }} />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description Snippet</span>
                <span className="text-xs font-mono text-slate-400">{metaDescription.length} / 160 ch</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{auditReport.descriptionScore}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${auditReport.descriptionScore}%` }} />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Schema & Breadcrumbs</span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">Rich Snippet</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{auditReport.schemaScore}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${auditReport.schemaScore}%` }} />
              </div>
            </div>
          </div>

          {/* Live SERP Snippet Preview Simulator */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Live Google SERP Snippet Preview</h2>
                <span className="text-xs text-slate-400">Real-time rendering of your search card on Google</span>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setSerpDevice('desktop')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    serpDevice === 'desktop' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  onClick={() => setSerpDevice('mobile')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    serpDevice === 'mobile' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            {/* Google Search Card Box */}
            <div className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#f8fafc]/60 dark:bg-slate-950/40 transition-all ${
              serpDevice === 'mobile' ? 'max-w-md mx-auto shadow-md border-slate-300 dark:border-slate-700' : 'w-full'
            }`}>
              <div className="space-y-1.5 font-sans">
                {/* Google URL + Favicon */}
                <div className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-400 truncate">
                  <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">8</div>
                  <span className="font-medium text-slate-800 dark:text-slate-200">8 Pharma Inventory Manager</span>
                  <span className="text-slate-400">›</span>
                  <span className="text-slate-500 truncate">{canonicalUrl}</span>
                </div>

                {/* Google Title Link */}
                <h3 className="text-base sm:text-lg font-medium text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer line-clamp-1 leading-snug">
                  {metaTitle}
                </h3>

                {/* Star Ratings & Breadcrumb Rich Snippet */}
                <div className="flex items-center gap-2 text-[11.5px] text-slate-600 dark:text-slate-400">
                  <span className="text-amber-500 font-bold">★★★★★</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">4.9</span>
                  <span>(148 reviews)</span>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Free Trial Available</span>
                  <span>•</span>
                  <span>Business & Healthcare ERP</span>
                </div>

                {/* Google Description */}
                <p className="text-xs sm:text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-relaxed line-clamp-2 pt-0.5">
                  {metaDescription}
                </p>

                {/* Sitelinks Mini Grid */}
                <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#1a0dab] dark:text-[#8ab4f8] font-medium hover:underline">
                    Online Medicine Store Catalog ›
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#1a0dab] dark:text-[#8ab4f8] font-medium hover:underline">
                    FEFO Expiry Batch Rotation System ›
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations Box */}
            {auditReport.recommendations.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>On-Page Optimization Suggestions:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11.5px]">
                  {auditReport.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ON-PAGE & META TAGS OPTIMIZER */}
      {activeTab === 'onpage' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Technical On-Page Metadata Optimizer</h2>
              <p className="text-xs text-slate-500">Fine-tune page title, meta description, keywords, and canonical URL settings.</p>
            </div>
            <button
              onClick={handleApplyMetadata}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Apply to App</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Title Tag */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Page Title Tag (`&lt;title&gt;` and `og:title`)
                </label>
                <span className={`text-[11px] font-mono font-bold ${
                  metaTitle.length >= 35 && metaTitle.length <= 65 ? 'text-emerald-500' : 'text-amber-500'
                }`}>
                  {metaTitle.length} / 60 characters (Optimal: 35-65)
                </span>
              </div>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Enter compelling SEO title with primary keyword..."
              />
            </div>

            {/* Meta Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Meta Description (`&lt;meta name="description"&gt;` and `og:description`)
                </label>
                <span className={`text-[11px] font-mono font-bold ${
                  metaDescription.length >= 120 && metaDescription.length <= 165 ? 'text-emerald-500' : 'text-amber-500'
                }`}>
                  {metaDescription.length} / 160 characters (Optimal: 120-160)
                </span>
              </div>
              <textarea
                rows={3}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                placeholder="Enter clear, actionable description with value proposition and call to action..."
              />
            </div>

            {/* Canonical URL & Robots */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Canonical Page URL</label>
                <input
                  type="text"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Robots Meta Directives</label>
                <input
                  type="text"
                  value={robotsDirective}
                  onChange={(e) => setRobotsDirective(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Keywords Tag Manager */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Target High-Intent Keywords ({keywords.length})
              </label>

              <form onSubmit={handleAddKeyword} className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Type new target keyword and hit Enter..."
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                >
                  + Add Keyword
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold"
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="text-indigo-400 hover:text-rose-500 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LOCAL REGIONAL SEO & GEO TAGGER */}
      {activeTab === 'local' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Local Regional SEO & Geo-Tagging</h2>
              <p className="text-xs text-slate-500">Configure city-wise targeting, GPS coordinates, ICBM tags, and Local Pharmacy Schema.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Target Region:</span>
              <select
                value={selectedRegionId}
                onChange={(e) => setSelectedRegionId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {REGIONAL_SEO_PRESETS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.city} ({r.stateRegion})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Regional Details Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Active Regional Profile ({selectedRegion.city})
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10.5px]">City / Locality</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRegion.city}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10.5px]">Region Code</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedRegion.geoRegion}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10.5px]">Geo Coordinates</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{selectedRegion.geoPosition}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10.5px]">Postal Code</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedRegion.postalCode}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10.5px]">Hotline NAP Citation</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedRegion.phone}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-bold text-slate-700 dark:text-slate-200">Local Market Focus: </span>
                {selectedRegion.marketDescription}
              </div>
            </div>

            {/* Generated Geo Meta Tags */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 font-mono text-xs space-y-2 relative">
              <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                <span>HTML Regional Geo Tags</span>
                <button
                  onClick={() => copyToClipboard(
`<meta name="geo.region" content="${selectedRegion.geoRegion}" />
<meta name="geo.position" content="${selectedRegion.geoPosition}" />
<meta name="ICBM" content="${selectedRegion.icbm}" />
<meta name="geo.placename" content="${selectedRegion.city}, ${selectedRegion.country}" />`,
                    'geo-tags'
                  )}
                  className="hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode === 'geo-tags' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'geo-tags' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <pre className="overflow-x-auto text-[11px] text-emerald-300 pt-1 leading-relaxed">
{`<meta name="geo.region" content="${selectedRegion.geoRegion}" />
<meta name="geo.position" content="${selectedRegion.geoPosition}" />
<meta name="ICBM" content="${selectedRegion.icbm}" />
<meta name="geo.placename" content="${selectedRegion.city}, ${selectedRegion.country}" />`}
              </pre>
            </div>
          </div>

          {/* Local Business Citation Checklist */}
          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Regional Ranking & Google Business Profile Checklist</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Exact NAP Consistency (Name, Address, Phone)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Local Currency Meta (PKR / Cash / Card)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>24/7 Pharmacy OpeningHours Specification</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: 12-WEEK OFF-PAGE CONTENT & BACKLINK SCHEDULE */}
      {activeTab === 'offpage' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">12-Week Off-Page Backlink & Content Schedule</h2>
              <p className="text-xs text-slate-500">Structured link-building roadmap across healthcare portals, tech publications, and YouTube tutorials.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddScheduleModal(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Editorial Item</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10.5px] tracking-wider">
                  <th className="py-2.5 px-3">Week</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Content Title & Campaign</th>
                  <th className="py-2.5 px-3">Target Keyword</th>
                  <th className="py-2.5 px-3">Target DA</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {offPageSchedule.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      Week {item.week}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {item.channel}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <div className="font-bold text-slate-900 dark:text-white leading-snug">{item.title}</div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{item.notes}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">
                      "{item.targetKeyword}"
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                      {item.domainAuthorityGoal}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <select
                        value={item.status}
                        onChange={(e) => handleUpdateScheduleStatus(item.id, e.target.value as any)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                          item.status === 'Published' || item.status === 'Verified'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : item.status === 'In Progress'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <option value="Planned">Planned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Published">Published</option>
                        <option value="Verified">Verified Link</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SCHEMA JSON-LD ENHANCER */}
      {activeTab === 'schema' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Schema.org Structured Data Generator</h2>
              <p className="text-xs text-slate-500">Enable Google rich snippets, software stars, breadcrumbs, and medical business cards.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(currentSchemaJson, 'schema-json')}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {copiedCode === 'schema-json' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode === 'schema-json' ? 'Copied JSON-LD' : 'Copy Schema Code'}</span>
              </button>
            </div>
          </div>

          {/* Schema Type Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { type: 'SoftwareApplication', label: 'SoftwareApplication (App Store Rich Snippet)' },
              { type: 'Pharmacy', label: 'MedicalBusiness / Local Pharmacy' },
              { type: 'BreadcrumbList', label: 'BreadcrumbList (Google Trail)' },
              { type: 'FAQPage', label: 'FAQPage (Q&A Accordion in SERP)' },
              { type: 'HowTo', label: 'HowTo (Step-by-Step Expiry FEFO Guide)' },
              { type: 'Product', label: 'Product & Offer (Online Medicine)' },
            ].map((s) => (
              <button
                key={s.type}
                onClick={() => setSelectedSchemaType(s.type as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedSchemaType === s.type
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto max-h-96">
            <pre className="leading-relaxed">{currentSchemaJson}</pre>
          </div>
        </div>
      )}

      {/* TAB 6: SITEMAP & ROBOTS.TXT */}
      {activeTab === 'sitemap' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">sitemap.xml (Dynamic)</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => copyToClipboard(sitemapXml, 'sitemap')}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 text-xs font-bold"
                  title="Copy XML"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => downloadFile('sitemap.xml', sitemapXml, 'application/xml')}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
              </div>
            </div>
            <pre className="p-3 rounded-xl bg-slate-950 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-64">
              {sitemapXml}
            </pre>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">robots.txt (Crawl Directives)</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => copyToClipboard(robotsTxt, 'robots')}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 text-xs font-bold"
                  title="Copy robots.txt"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => downloadFile('robots.txt', robotsTxt, 'text/plain')}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
              </div>
            </div>
            <pre className="p-3 rounded-xl bg-slate-950 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-64">
              {robotsTxt}
            </pre>
          </div>
        </div>
      )}

      {/* Modal: Add New Editorial Schedule Item */}
      {showAddScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Off-Page Content Campaign</h3>
            
            <form onSubmit={handleAddScheduleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Week Number</label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={newScheduleItem.week}
                    onChange={(e) => setNewScheduleItem({ ...newScheduleItem, week: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Channel</label>
                  <select
                    value={newScheduleItem.channel}
                    onChange={(e) => setNewScheduleItem({ ...newScheduleItem, channel: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    <option value="Healthcare Directory">Healthcare Directory</option>
                    <option value="Guest Post / Tech Blog">Guest Post / Tech Blog</option>
                    <option value="Social & Video Tutorial">Social & Video Tutorial</option>
                    <option value="PR Release">PR Release</option>
                    <option value="Community & Forums">Community & Forums</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Campaign / Article Title</label>
                <input
                  type="text"
                  value={newScheduleItem.title}
                  onChange={(e) => setNewScheduleItem({ ...newScheduleItem, title: e.target.value })}
                  placeholder="e.g. 5 Ways to Eliminate Medicine Expiry Losses"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Target Keyword</label>
                <input
                  type="text"
                  value={newScheduleItem.targetKeyword}
                  onChange={(e) => setNewScheduleItem({ ...newScheduleItem, targetKeyword: e.target.value })}
                  placeholder="e.g. FEFO medicine expiry POS"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddScheduleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs"
                >
                  Save Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
