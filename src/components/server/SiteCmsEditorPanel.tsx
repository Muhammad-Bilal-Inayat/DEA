import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Sparkles, 
  Image as ImageIcon, 
  Edit3, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  Eye, 
  CheckCircle2, 
  Layers, 
  HelpCircle, 
  MessageSquare, 
  DollarSign, 
  Phone, 
  FileText, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  Zap, 
  Mic, 
  AlertTriangle, 
  Cloud, 
  PackageCheck, 
  ShieldCheck, 
  Download, 
  Upload, 
  ExternalLink,
  Share2,
  Mail,
  Palette,
  Sliders,
  Layout,
  BookOpen
} from 'lucide-react';
import { BlogCmsManagementPanel } from './BlogCmsManagementPanel';
import { 
  SiteCmsConfig, 
  getSiteCmsConfig, 
  saveSiteCmsConfig, 
  resetSiteCmsConfig, 
  SiteFeatureItem, 
  SiteTestimonial, 
  SiteFaqItem, 
  HeroStat,
  PRESET_BACKGROUND_IMAGES,
  DEFAULT_SECTION_STYLES,
  SectionCustomStyle,
  getNewsletterSubscribers,
  NewsletterSubscriber
} from '../../lib/siteCmsService';
import { LiveAppPreviewModal } from './LiveAppPreviewModal';

export const SiteCmsEditorPanel: React.FC = () => {
  const [config, setConfig] = useState<SiteCmsConfig>(() => getSiteCmsConfig());
  const [activeSubTab, setActiveSubTab] = useState<'brand' | 'blogs' | 'section_styles' | 'hero' | 'features' | 'details' | 'pricing' | 'testimonials' | 'faqs' | 'sections' | 'subscribers'>('brand');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [selectedSectionKey, setSelectedSectionKey] = useState<string>('hero');
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>(() => getNewsletterSubscribers());
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // New item draft states
  const [editingFeature, setEditingFeature] = useState<SiteFeatureItem | null>(null);
  const [editingTestimonial, setEditingTestimonial] = useState<SiteTestimonial | null>(null);
  const [editingFaq, setEditingFaq] = useState<SiteFaqItem | null>(null);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) setConfig(e.detail);
      else setConfig(getSiteCmsConfig());
      setSubscribers(getNewsletterSubscribers());
    };
    window.addEventListener('mbi-site-cms-updated', handleUpdate);
    return () => window.removeEventListener('mbi-site-cms-updated', handleUpdate);
  }, []);

  const handleSave = (updatedPartial?: Partial<SiteCmsConfig>) => {
    const newConfig = saveSiteCmsConfig(updatedPartial || config);
    setConfig(newConfig);
    setSaveSuccessMessage('Site CMS configuration successfully published and updated live!');
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };


  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all website customizations to default settings?')) {
      const def = resetSiteCmsConfig();
      setConfig(def);
      setSaveSuccessMessage('All website settings reset to original defaults.');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    }
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mbiinventra_site_cms_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.brand && parsed.hero) {
          const saved = saveSiteCmsConfig(parsed);
          setConfig(saved);
          setSaveSuccessMessage('Custom site layout configuration imported successfully!');
          setTimeout(() => setSaveSuccessMessage(null), 3500);
        } else {
          alert('Invalid CMS configuration JSON format.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Section Ordering Helpers
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const order = [...config.sectionsOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= order.length) return;
    const temp = order[index];
    order[index] = order[targetIndex];
    order[targetIndex] = temp;
    const updated = { ...config, sectionsOrder: order };
    setConfig(updated);
    handleSave(updated);
  };

  return (
    <div className="space-y-6 animate-in fade-in" id="site-cms-editor-root">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black tracking-tight">Website & Landing Page CMS Editor</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                mbiinventra.com Live Builder
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Edit Logo, Hero Headlines, Software Feature Highlights, Pricing, Customer Reviews, FAQs & Contact details in real-time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>Live Responsive Preview</span>
          </button>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <span>Open in Tab</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <button
            onClick={() => handleSave()}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save & Publish</span>
          </button>

          <button
            onClick={handleReset}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 transition-all cursor-pointer"
            title="Reset to Factory Defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Application Preview Modal */}
      <LiveAppPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        initialRoute="/"
      />

      {/* Success Notification Alert */}
      {saveSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveSubTab('brand')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'brand'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Brand & Contact</span>
        </button>

        <button
          onClick={() => setActiveSubTab('blogs')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'blogs'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
          <span>Blogs & SEO Articles (20+)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('section_styles')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'section_styles'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          <span>Section Style Studio (Elementor Mode)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('hero')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'hero'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Hero & Banner</span>
        </button>

        <button
          onClick={() => setActiveSubTab('features')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'features'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Software Features ({config.features.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('details')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'details'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Overview & Hardware</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pricing')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'pricing'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Pricing Content</span>
        </button>

        <button
          onClick={() => setActiveSubTab('testimonials')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'testimonials'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Customer Reviews ({config.testimonials.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('faqs')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'faqs'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>FAQs ({config.faqs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('subscribers')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'subscribers'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Mail className="w-3.5 h-3.5 text-emerald-400" />
          <span>Newsletter Leads ({subscribers.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sections')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'sections'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Sections Reorder</span>
        </button>
      </div>

      {/* SUB-TAB BLOGS & SEO CONTENT CMS */}
      {activeSubTab === 'blogs' && (
        <BlogCmsManagementPanel />
      )}

      {/* SUB-TAB 1: BRAND & LOGO SETTINGS */}
      {activeSubTab === 'brand' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-200">Brand Identity & Official Contact Details</h3>
              <p className="text-xs text-slate-400">Configure logo branding, software name, support numbers, and official address.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Brand / Software Name</label>
              <input
                type="text"
                value={config.brand.name}
                onChange={(e) => setConfig({ ...config, brand: { ...config.brand, name: e.target.value } })}
                placeholder="e.g. MBI Inventra"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Brand Tagline / Slogan</label>
              <input
                type="text"
                value={config.brand.tagline}
                onChange={(e) => setConfig({ ...config, brand: { ...config.brand, tagline: e.target.value } })}
                placeholder="e.g. Next-Gen AI Pharmacy POS & Cloud ERP"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Logo Image URL / Upload */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Custom Brand Logo Image URL or SVG</label>
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={config.brand.logoUrl}
                  onChange={(e) => setConfig({ ...config, brand: { ...config.brand, logoUrl: e.target.value } })}
                  placeholder="https://example.com/logo.png or leave empty for default modern icon logo"
                  className="flex-1 px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {config.brand.logoUrl && (
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 p-1 flex items-center justify-center shrink-0">
                    <img src={config.brand.logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 flex items-center justify-between">
                <span>Primary Support Helpline (Phone 1)</span>
                <span className="text-[10px] text-blue-400 font-mono">Syncs All Sites</span>
              </label>
              <input
                type="text"
                value={config.brand.supportPhone}
                onChange={(e) => setConfig({ ...config, brand: { ...config.brand, supportPhone: e.target.value } })}
                placeholder="03364585863"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 flex items-center justify-between">
                <span>Official WhatsApp & Support (Phone 2)</span>
                <span className="text-[10px] text-emerald-400 font-mono">Syncs All Sites</span>
              </label>
              <input
                type="text"
                value={config.brand.whatsappNumber}
                onChange={(e) => setConfig({ ...config, brand: { ...config.brand, whatsappNumber: e.target.value } })}
                placeholder="03281302636"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Support Email</label>
              <input
                type="email"
                value={config.brand.supportEmail}
                onChange={(e) => setConfig({ ...config, brand: { ...config.brand, supportEmail: e.target.value } })}
                placeholder="support@mbiinventra.com"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Working Hours</label>
              <input
                type="text"
                value={config.brand.officeHours}
                onChange={(e) => setConfig({ ...config, brand: { ...config.brand, officeHours: e.target.value } })}
                placeholder="Monday - Sunday: 9:00 AM - 11:00 PM PST"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Headquarters & Office Address</label>
              <input
                type="text"
                value={config.brand.officialAddress}
                onChange={(e) => setConfig({ ...config, brand: { ...config.brand, officialAddress: e.target.value } })}
                placeholder="Plaza #4, Commercial Avenue, Lahore & Karachi, Pakistan"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Social Profiles Section */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Social Media & Public Channels</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">WhatsApp Direct Link</label>
                <input
                  type="text"
                  value={config.socialLinks?.whatsapp || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    socialLinks: { ...(config.socialLinks || {}), whatsapp: e.target.value }
                  })}
                  placeholder="https://wa.me/923281302636"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Facebook Page URL</label>
                <input
                  type="text"
                  value={config.socialLinks?.facebook || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    socialLinks: { ...(config.socialLinks || {}), facebook: e.target.value }
                  })}
                  placeholder="https://facebook.com/mbiinventra"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">LinkedIn Profile / Company</label>
                <input
                  type="text"
                  value={config.socialLinks?.linkedin || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    socialLinks: { ...(config.socialLinks || {}), linkedin: e.target.value }
                  })}
                  placeholder="https://linkedin.com/company/mbiinventra"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Twitter / X Handle URL</label>
                <input
                  type="text"
                  value={config.socialLinks?.twitter || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    socialLinks: { ...(config.socialLinks || {}), twitter: e.target.value }
                  })}
                  placeholder="https://twitter.com/mbiinventra"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">YouTube Channel URL</label>
                <input
                  type="text"
                  value={config.socialLinks?.youtube || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    socialLinks: { ...(config.socialLinks || {}), youtube: e.target.value }
                  })}
                  placeholder="https://youtube.com/@mbiinventra"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Instagram URL</label>
                <input
                  type="text"
                  value={config.socialLinks?.instagram || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    socialLinks: { ...(config.socialLinks || {}), instagram: e.target.value }
                  })}
                  placeholder="https://instagram.com/mbiinventra"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => handleSave()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Brand & Social Profiles</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB: SECTION STYLE STUDIO (ELEMENTOR / GUTENBERG MODE) */}
      {activeSubTab === 'section_styles' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-slate-200">Elementor-Style Section Customizer</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Customize background images, dark/light overlays, badges, headlines, and call-to-action links for every section of the home page.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 w-fit">
              Visual Page Builder Mode
            </span>
          </div>

          {/* Section Picker Bar */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase">Select Homepage Section to Edit</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {Object.keys(DEFAULT_SECTION_STYLES).map((secKey) => {
                const currentSec = config.sectionStyles?.[secKey] || DEFAULT_SECTION_STYLES[secKey];
                const isSelected = selectedSectionKey === secKey;
                const hasCustomBg = !!currentSec?.bgImageUrl;

                return (
                  <button
                    key={secKey}
                    onClick={() => setSelectedSectionKey(secKey)}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-600/30 border-blue-500 text-white shadow-md ring-2 ring-blue-500/20'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-[11px] font-bold truncate">
                      {currentSec?.name || secKey.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1 mt-1 text-[9px]">
                      {hasCustomBg ? (
                        <span className="text-amber-400 flex items-center gap-0.5">
                          <ImageIcon className="w-2.5 h-2.5" />
                          <span>Custom BG</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">Default BG</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Section Customizer Card */}
          {(() => {
            const sec = config.sectionStyles?.[selectedSectionKey] || DEFAULT_SECTION_STYLES[selectedSectionKey] || {
              id: selectedSectionKey,
              name: selectedSectionKey,
              enabled: true,
            };

            const updateActiveSection = (changes: Partial<SectionCustomStyle>) => {
              const currentStyles = config.sectionStyles || DEFAULT_SECTION_STYLES;
              const updatedSec: SectionCustomStyle = {
                ...sec,
                ...changes,
              };
              setConfig({
                ...config,
                sectionStyles: {
                  ...currentStyles,
                  [selectedSectionKey]: updatedSec,
                },
              });
            };

            return (
              <div className="p-5 rounded-2xl bg-slate-850 border border-slate-700/90 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <Sliders className="w-4 h-4 text-blue-400" />
                    <h4 className="text-sm font-black uppercase text-white">
                      Editing: {sec.name || selectedSectionKey}
                    </h4>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sec.enabled !== false}
                      onChange={(e) => updateActiveSection({ enabled: e.target.checked })}
                      className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={sec.enabled !== false ? 'text-emerald-400' : 'text-rose-400'}>
                      {sec.enabled !== false ? 'Section Active on Landing Page' : 'Section Hidden from Landing Page'}
                    </span>
                  </label>
                </div>

                {/* Background Image Setup */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-300 uppercase">
                      Section Background Image URL
                    </label>
                    {sec.bgImageUrl && (
                      <button
                        onClick={() => updateActiveSection({ bgImageUrl: '' })}
                        className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                      >
                        Remove Background
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={sec.bgImageUrl || ''}
                    onChange={(e) => updateActiveSection({ bgImageUrl: e.target.value })}
                    placeholder="https://example.com/pharmacy-background.jpg"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
                  />

                  {/* Preset Background Options */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Or Choose a Pro Pharmacy Preset Background:</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {PRESET_BACKGROUND_IMAGES.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => updateActiveSection({ bgImageUrl: preset.url })}
                          className={`p-2 rounded-lg border text-left text-[11px] font-medium transition-all cursor-pointer flex flex-col gap-1 ${
                            sec.bgImageUrl === preset.url
                              ? 'bg-blue-600/40 border-blue-500 text-white font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="truncate">{preset.name}</span>
                          {preset.url ? (
                            <div className="h-10 w-full rounded bg-slate-800 overflow-hidden">
                              <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="h-10 w-full rounded bg-slate-800 flex items-center justify-center text-[10px] text-slate-500">
                              Clean Pattern
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dark Overlay Opacity Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>Dark Overlay Opacity ({sec.bgOverlayOpacity ?? 80}%)</span>
                    <span className="text-[10px] text-slate-400">Controls contrast over the background image</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="95"
                    step="5"
                    value={sec.bgOverlayOpacity ?? 80}
                    onChange={(e) => updateActiveSection({ bgOverlayOpacity: Number(e.target.value) })}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                {/* Section Content Overrides */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-700/80">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Custom Section Badge Text</label>
                    <input
                      type="text"
                      value={sec.badge || ''}
                      onChange={(e) => updateActiveSection({ badge: e.target.value })}
                      placeholder="e.g. SMART PHARMACY. SMARTER BUSINESS."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Custom Section Title</label>
                    <input
                      type="text"
                      value={sec.title || ''}
                      onChange={(e) => updateActiveSection({ title: e.target.value })}
                      placeholder="e.g. MBI INVENTRA"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-bold"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Custom Section Subtitle / Paragraph</label>
                    <textarea
                      rows={2}
                      value={sec.subtitle || ''}
                      onChange={(e) => updateActiveSection({ subtitle: e.target.value })}
                      placeholder="e.g. Next-generation point of sale and batch expiry intelligence."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Action Button Text</label>
                    <input
                      type="text"
                      value={sec.customButtonText || ''}
                      onChange={(e) => updateActiveSection({ customButtonText: e.target.value })}
                      placeholder="e.g. GET STARTED FREE or ORDER NOW"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Action Button URL / Anchor</label>
                    <input
                      type="text"
                      value={sec.customButtonUrl || ''}
                      onChange={(e) => updateActiveSection({ customButtonUrl: e.target.value })}
                      placeholder="e.g. #login or #pricing or https://wa.me/..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* Visual Live Preview Box */}
                <div className="pt-3 border-t border-slate-700/80 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Live Section Visual Preview:</div>
                  <div
                    className="relative rounded-xl overflow-hidden p-6 border border-slate-700 min-h-[140px] flex flex-col justify-center text-center shadow-lg"
                    style={{
                      backgroundImage: sec.bgImageUrl ? `url(${sec.bgImageUrl})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {/* Overlay */}
                    <div
                      className="absolute inset-0 bg-slate-950"
                      style={{ opacity: (sec.bgOverlayOpacity ?? 80) / 100 }}
                    />
                    
                    {/* Content */}
                    <div className="relative z-10 space-y-2 max-w-lg mx-auto">
                      {sec.badge && (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {sec.badge}
                        </span>
                      )}
                      <h5 className="text-base font-black text-white">
                        {sec.title || sec.name}
                      </h5>
                      <p className="text-xs text-slate-300 line-clamp-2">
                        {sec.subtitle || 'Experience seamless pharmacy automation with MBI Inventra.'}
                      </p>
                      {sec.customButtonText && (
                        <div className="pt-2">
                          <span className="inline-block px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs shadow-md">
                            {sec.customButtonText}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-400">
                    Changes apply in real-time across all browser tabs.
                  </span>
                  <button
                    onClick={() => handleSave()}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save & Publish Section Styles</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}


      {/* SUB-TAB 2: HERO & ANNOUNCEMENT BANNER */}
      {activeSubTab === 'hero' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-200">Hero Section & Announcement Strip</h3>
            <p className="text-xs text-slate-400">Configure top promotional banner, main hero headline, sub-headline, and live statistic counters.</p>
          </div>

          {/* Announcement Bar Settings */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300">Top Announcement Strip</span>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.announcement.enabled}
                  onChange={(e) => setConfig({ ...config, announcement: { ...config.announcement, enabled: e.target.checked } })}
                  className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <span className={config.announcement.enabled ? 'text-emerald-400' : 'text-slate-500'}>
                  {config.announcement.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Badge Text</label>
                <input
                  type="text"
                  value={config.announcement.badge}
                  onChange={(e) => setConfig({ ...config, announcement: { ...config.announcement, badge: e.target.value } })}
                  placeholder="🚀 NEW UPDATE v4.2"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Announcement Message</label>
                <input
                  type="text"
                  value={config.announcement.text}
                  onChange={(e) => setConfig({ ...config, announcement: { ...config.announcement, text: e.target.value } })}
                  placeholder="Urdu Voice-to-Text AI POS & Realtime Multi-Branch Cloud Sync is now active!"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Hero Headlines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Hero Floating Badge</label>
              <input
                type="text"
                value={config.hero.badge}
                onChange={(e) => setConfig({ ...config, hero: { ...config.hero, badge: e.target.value } })}
                placeholder="⚡ #1 Pharmacy Cloud ERP & Thermal POS in Pakistan"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Main Hero Title</label>
              <input
                type="text"
                value={config.hero.title}
                onChange={(e) => setConfig({ ...config, hero: { ...config.hero, title: e.target.value } })}
                placeholder="The Intelligent Cloud ERP for Modern Pharmacies & Medical Stores"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Highlighted Accent Phrase (Color Gradient)</label>
              <input
                type="text"
                value={config.hero.highlightWord}
                onChange={(e) => setConfig({ ...config, hero: { ...config.hero, highlightWord: e.target.value } })}
                placeholder="Supercharged with Urdu Voice AI"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-emerald-400 font-bold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Hero Subtitle / Description</label>
              <textarea
                rows={3}
                value={config.hero.subtitle}
                onChange={(e) => setConfig({ ...config, hero: { ...config.hero, subtitle: e.target.value } })}
                placeholder="Lightning-fast 0.2s thermal billing, automated FEFO expiry alerts, double-entry accounting..."
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Primary CTA Button Text</label>
              <input
                type="text"
                value={config.hero.ctaPrimaryText}
                onChange={(e) => setConfig({ ...config, hero: { ...config.hero, ctaPrimaryText: e.target.value } })}
                placeholder="Sign In to Workspace"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Secondary CTA Button Text (WhatsApp / Demo)</label>
              <input
                type="text"
                value={config.hero.ctaSecondaryText}
                onChange={(e) => setConfig({ ...config, hero: { ...config.hero, ctaSecondaryText: e.target.value } })}
                placeholder="Book Live Demo / WhatsApp"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold"
              />
            </div>
          </div>

          {/* Hero Statistics Counters */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Hero Metrics & Proof Counters</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {config.hero.stats.map((st, idx) => (
                <div key={st.id || idx} className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2">
                  <input
                    type="text"
                    value={st.value}
                    onChange={(e) => {
                      const newStats = [...config.hero.stats];
                      newStats[idx].value = e.target.value;
                      setConfig({ ...config, hero: { ...config.hero, stats: newStats } });
                    }}
                    placeholder="e.g. 5,200+"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm font-bold text-emerald-400"
                  />
                  <input
                    type="text"
                    value={st.label}
                    onChange={(e) => {
                      const newStats = [...config.hero.stats];
                      newStats[idx].label = e.target.value;
                      setConfig({ ...config, hero: { ...config.hero, stats: newStats } });
                    }}
                    placeholder="e.g. Active Pharmacies"
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-white"
                  />
                  <input
                    type="text"
                    value={st.description || ''}
                    onChange={(e) => {
                      const newStats = [...config.hero.stats];
                      newStats[idx].description = e.target.value;
                      setConfig({ ...config, hero: { ...config.hero, stats: newStats } });
                    }}
                    placeholder="Short description"
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[10px] text-slate-400"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => handleSave()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Hero Changes</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: FEATURES SHOWCASE */}
      {activeSubTab === 'features' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-200">Software Feature Highlights & Badges</h3>
              <p className="text-xs text-slate-400">Add, edit, enable/disable, and reorder features shown on the landing page.</p>
            </div>
            <button
              onClick={() => {
                const newFeat: SiteFeatureItem = {
                  id: `feat-${Date.now()}`,
                  title: 'New Pharmacy Feature',
                  category: 'Point of Sale',
                  description: 'Detailed feature description explaining the benefit to pharmacy owners.',
                  iconName: 'Zap',
                  badge: 'New',
                  highlight: 'Fast',
                  enabled: true,
                };
                setConfig({ ...config, features: [newFeat, ...config.features] });
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Feature</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.features.map((feat, idx) => (
              <div key={feat.id} className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-3 relative group">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={feat.title}
                      onChange={(e) => {
                        const newF = [...config.features];
                        newF[idx].title = e.target.value;
                        setConfig({ ...config, features: newF });
                      }}
                      className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-xs font-bold text-white flex-1"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feat.enabled}
                        onChange={(e) => {
                          const newF = [...config.features];
                          newF[idx].enabled = e.target.checked;
                          setConfig({ ...config, features: newF });
                        }}
                        className="rounded border-slate-700 text-blue-600"
                      />
                      <span className={feat.enabled ? 'text-emerald-400' : 'text-slate-500'}>
                        {feat.enabled ? 'Active' : 'Off'}
                      </span>
                    </label>

                    <button
                      onClick={() => {
                        if (window.confirm('Delete this feature?')) {
                          const newF = config.features.filter((_, i) => i !== idx);
                          setConfig({ ...config, features: newF });
                        }
                      }}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase">Category</label>
                    <input
                      type="text"
                      value={feat.category}
                      onChange={(e) => {
                        const newF = [...config.features];
                        newF[idx].category = e.target.value;
                        setConfig({ ...config, features: newF });
                      }}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase">Badge / Highlight</label>
                    <input
                      type="text"
                      value={feat.badge || ''}
                      onChange={(e) => {
                        const newF = [...config.features];
                        newF[idx].badge = e.target.value;
                        setConfig({ ...config, features: newF });
                      }}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-amber-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={feat.description}
                    onChange={(e) => {
                      const newF = [...config.features];
                      newF[idx].description = e.target.value;
                      setConfig({ ...config, features: newF });
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 font-normal"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => handleSave()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Features</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SOFTWARE DETAILS & HARDWARE */}
      {activeSubTab === 'details' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-200">Software Overview & Hardware Integration</h3>
            <p className="text-xs text-slate-400">Manage in-depth technical details, hardware support cards, and core architectural highlights.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Section Title</label>
              <input
                type="text"
                value={config.softwareDetails.sectionTitle}
                onChange={(e) => setConfig({ ...config, softwareDetails: { ...config.softwareDetails, sectionTitle: e.target.value } })}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Section Subtitle</label>
              <input
                type="text"
                value={config.softwareDetails.sectionSubtitle}
                onChange={(e) => setConfig({ ...config, softwareDetails: { ...config.softwareDetails, sectionSubtitle: e.target.value } })}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Overview Paragraph 1</label>
              <textarea
                rows={3}
                value={config.softwareDetails.overviewParagraph1}
                onChange={(e) => setConfig({ ...config, softwareDetails: { ...config.softwareDetails, overviewParagraph1: e.target.value } })}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 font-normal"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Overview Paragraph 2</label>
              <textarea
                rows={3}
                value={config.softwareDetails.overviewParagraph2}
                onChange={(e) => setConfig({ ...config, softwareDetails: { ...config.softwareDetails, overviewParagraph2: e.target.value } })}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 font-normal"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => handleSave()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Overview Details</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: PRICING SECTION CONTENT */}
      {activeSubTab === 'pricing' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-200">Pricing Section Text & WhatsApp CTA</h3>
              <p className="text-xs text-slate-400">Customize the headers, guarantee notes, and WhatsApp pre-filled inquiry messages.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Section Title</label>
              <input
                type="text"
                value={config.pricing.sectionTitle}
                onChange={(e) => setConfig({ ...config, pricing: { ...config.pricing, sectionTitle: e.target.value } })}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Section Subtitle</label>
              <input
                type="text"
                value={config.pricing.sectionSubtitle}
                onChange={(e) => setConfig({ ...config, pricing: { ...config.pricing, sectionSubtitle: e.target.value } })}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Trust & Guarantee Note</label>
              <input
                type="text"
                value={config.pricing.guaranteeText}
                onChange={(e) => setConfig({ ...config, pricing: { ...config.pricing, guaranteeText: e.target.value } })}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-emerald-400 font-semibold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">WhatsApp Pre-filled Order / Inquiry Message</label>
              <textarea
                rows={2}
                value={config.pricing.whatsappInquiryTemplate}
                onChange={(e) => setConfig({ ...config, pricing: { ...config.pricing, whatsappInquiryTemplate: e.target.value } })}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200"
              />
            </div>
          </div>

          {/* Pricing Plans List Editor */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200">Pricing Packages & Tiers</h4>
                <p className="text-[11px] text-slate-400">Edit plan pricing, features checklist, and highlight tags displayed on the website.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newPlan = {
                    id: `plan-${Date.now()}`,
                    name: 'Custom Pharmacy Plan',
                    price: 3000,
                    period: '/month',
                    description: 'Tailored package for your store.',
                    popular: false,
                    features: ['1 POS Terminal', 'Urdu Voice AI', 'Receipt Printing', 'Standard Support'],
                    buttonText: 'Get License',
                  };
                  setConfig({
                    ...config,
                    pricing: {
                      ...config.pricing,
                      plans: [...(config.pricing.plans || []), newPlan],
                    },
                  });
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Pricing Tier</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(config.pricing.plans || []).map((plan, pIdx) => (
                <div key={plan.id} className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700 space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) => {
                        const newPlans = [...config.pricing.plans];
                        newPlans[pIdx].name = e.target.value;
                        setConfig({ ...config, pricing: { ...config.pricing, plans: newPlans } });
                      }}
                      className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-xs font-bold text-white flex-1 mr-2"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete plan ${plan.name}?`)) {
                          const newPlans = config.pricing.plans.filter((_, i) => i !== pIdx);
                          setConfig({ ...config, pricing: { ...config.pricing, plans: newPlans } });
                        }
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase">Price (Rs/mo)</label>
                      <input
                        type="number"
                        value={plan.price}
                        onChange={(e) => {
                          const newPlans = [...config.pricing.plans];
                          newPlans[pIdx].price = Number(e.target.value) || 0;
                          setConfig({ ...config, pricing: { ...config.pricing, plans: newPlans } });
                        }}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-emerald-400 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase">Badge / Popular</label>
                      <label className="flex items-center gap-1.5 pt-1 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!plan.popular}
                          onChange={(e) => {
                            const newPlans = [...config.pricing.plans];
                            newPlans[pIdx].popular = e.target.checked;
                            setConfig({ ...config, pricing: { ...config.pricing, plans: newPlans } });
                          }}
                          className="rounded border-slate-700 text-blue-600"
                        />
                        <span className={plan.popular ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                          {plan.popular ? 'Popular' : 'Standard'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-0.5">Description</label>
                    <input
                      type="text"
                      value={plan.description}
                      onChange={(e) => {
                        const newPlans = [...config.pricing.plans];
                        newPlans[pIdx].description = e.target.value;
                        setConfig({ ...config, pricing: { ...config.pricing, plans: newPlans } });
                      }}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-0.5">Features (1 per line)</label>
                    <textarea
                      rows={4}
                      value={plan.features.join('\n')}
                      onChange={(e) => {
                        const newPlans = [...config.pricing.plans];
                        newPlans[pIdx].features = e.target.value.split('\n').filter(Boolean);
                        setConfig({ ...config, pricing: { ...config.pricing, plans: newPlans } });
                      }}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-0.5">Button CTA Text</label>
                    <input
                      type="text"
                      value={plan.buttonText || 'Get License'}
                      onChange={(e) => {
                        const newPlans = [...config.pricing.plans];
                        newPlans[pIdx].buttonText = e.target.value;
                        setConfig({ ...config, pricing: { ...config.pricing, plans: newPlans } });
                      }}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white font-semibold"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => handleSave()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Pricing Content</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: TESTIMONIALS / REVIEWS */}
      {activeSubTab === 'testimonials' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-200">Customer Testimonials & Social Proof</h3>
              <p className="text-xs text-slate-400">Add authentic quotes from pharmacy owners across Pakistan to build buyer trust.</p>
            </div>
            <button
              onClick={() => {
                const newT: SiteTestimonial = {
                  id: `test-${Date.now()}`,
                  name: 'Pharmacist Name',
                  role: 'Owner / Chief Pharmacist',
                  pharmacyName: 'City Pharmacy',
                  city: 'Lahore',
                  rating: 5,
                  content: 'Great experience using MBI Inventra for our daily sales and inventory tracking.',
                };
                setConfig({ ...config, testimonials: [newT, ...config.testimonials] });
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Review</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.testimonials.map((test, idx) => (
              <div key={test.id} className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400">Review #{idx + 1}</span>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this testimonial?')) {
                        const newT = config.testimonials.filter((_, i) => i !== idx);
                        setConfig({ ...config, testimonials: newT });
                      }
                    }}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase">Customer Name</label>
                    <input
                      type="text"
                      value={test.name}
                      onChange={(e) => {
                        const newT = [...config.testimonials];
                        newT[idx].name = e.target.value;
                        setConfig({ ...config, testimonials: newT });
                      }}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase">Pharmacy Name</label>
                    <input
                      type="text"
                      value={test.pharmacyName}
                      onChange={(e) => {
                        const newT = [...config.testimonials];
                        newT[idx].pharmacyName = e.target.value;
                        setConfig({ ...config, testimonials: newT });
                      }}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-emerald-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase">City / Location</label>
                    <input
                      type="text"
                      value={test.city}
                      onChange={(e) => {
                        const newT = [...config.testimonials];
                        newT[idx].city = e.target.value;
                        setConfig({ ...config, testimonials: newT });
                      }}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase">Rating (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={test.rating}
                      onChange={(e) => {
                        const newT = [...config.testimonials];
                        newT[idx].rating = parseInt(e.target.value) || 5;
                        setConfig({ ...config, testimonials: newT });
                      }}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-amber-400 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">Customer Quote / Feedback</label>
                  <textarea
                    rows={2}
                    value={test.content}
                    onChange={(e) => {
                      const newT = [...config.testimonials];
                      newT[idx].content = e.target.value;
                      setConfig({ ...config, testimonials: newT });
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 font-normal"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => handleSave()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Reviews</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 7: FAQs MANAGER */}
      {activeSubTab === 'faqs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-200">Frequently Asked Questions (FAQs)</h3>
              <p className="text-xs text-slate-400">Answer buyer questions regarding offline mode, thermal printers, voice AI, and data backups.</p>
            </div>
            <button
              onClick={() => {
                const newF: SiteFaqItem = {
                  id: `faq-${Date.now()}`,
                  question: 'New Frequently Asked Question?',
                  answer: 'Clear and detailed answer explaining the solution.',
                  category: 'General',
                };
                setConfig({ ...config, faqs: [newF, ...config.faqs] });
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add FAQ</span>
            </button>
          </div>

          <div className="space-y-3">
            {config.faqs.map((faq, idx) => (
              <div key={faq.id} className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                      Q{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => {
                        const newF = [...config.faqs];
                        newF[idx].question = e.target.value;
                        setConfig({ ...config, faqs: newF });
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white"
                      placeholder="Question..."
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm('Delete this FAQ?')) {
                        const newF = config.faqs.filter((_, i) => i !== idx);
                        setConfig({ ...config, faqs: newF });
                      }
                    }}
                    className="p-1.5 rounded text-slate-500 hover:text-rose-400 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={faq.answer}
                    onChange={(e) => {
                      const newF = [...config.faqs];
                      newF[idx].answer = e.target.value;
                      setConfig({ ...config, faqs: newF });
                    }}
                    placeholder="Answer..."
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 font-normal"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => handleSave()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save FAQs</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB: NEWSLETTER LEADS */}
      {activeSubTab === 'subscribers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-200">Newsletter & Software Demo Inquiries</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Emails submitted by visitors via the footer subscription and updates form on mbiinventra.com.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(subscribers, null, 2));
                  const dl = document.createElement('a');
                  dl.setAttribute("href", dataStr);
                  dl.setAttribute("download", `mbi_newsletter_leads_${new Date().toISOString().slice(0, 10)}.json`);
                  dl.click();
                }}
                disabled={subscribers.length === 0}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Leads ({subscribers.length})</span>
              </button>
            </div>
          </div>

          {subscribers.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/40 rounded-xl border border-slate-800 space-y-2">
              <Mail className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-400">No newsletter subscribers collected yet.</p>
              <p className="text-[11px] text-slate-500">
                When visitors enter their email in the footer on the home page, their details appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Subscriber Email</th>
                    <th className="py-2.5 px-3">Source</th>
                    <th className="py-2.5 px-3">Subscribed Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {subscribers.map((sub, idx) => (
                    <tr key={sub.id || idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 text-white font-bold">{sub.email}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                          {sub.source || 'footer_newsletter'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {new Date(sub.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


      {/* SUB-TAB 8: SECTIONS REORDER & JSON BACKUP */}
      {activeSubTab === 'sections' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-200">Landing Page Layout & Section Hierarchy</h3>
              <p className="text-xs text-slate-400">Reorder sections up and down to customize the narrative structure of mbiinventra.com.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJson}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Export JSON</span>
              </button>
              <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Import JSON</span>
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>
            </div>
          </div>

          <div className="space-y-2 max-w-xl">
            {config.sectionsOrder.map((secId, idx) => (
              <div key={secId} className="flex items-center justify-between p-3 bg-slate-800/80 rounded-xl border border-slate-700/80">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-slate-900 text-slate-400 text-xs font-mono font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    {secId.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => moveSection(idx, 'up')}
                    className="p-1.5 rounded bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={idx === config.sectionsOrder.length - 1}
                    onClick={() => moveSection(idx, 'down')}
                    className="p-1.5 rounded bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => handleSave()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Hierarchy Order</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
