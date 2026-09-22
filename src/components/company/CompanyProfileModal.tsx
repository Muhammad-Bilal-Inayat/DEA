import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Phone, Mail, MapPin, FileText, Upload, 
  Trash2, Save, X, CheckCircle2, ShieldCheck, Globe, 
  Sparkles, CreditCard, Award, Coins
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Business } from '../../types';
import { MultiCurrencySection } from './MultiCurrencySection';
import { getMultiCurrencySettings } from '../../lib/currencyManager';

interface CompanyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({ isOpen, onClose }) => {
  const { business, updateBusiness } = useAuth();
  
  const [formData, setFormData] = useState<Partial<Business>>({
    name: '',
    logo: '',
    phone: '',
    mobile: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    taxNumber: '',
    drugLicenseNo: '',
    businessType: 'Surgical & Pharmaceutical Wholesale',
    currency: 'PKR',
    vatPercentage: 0,
    invoiceTerms: '',
    invoicePrefix: 'INV-',
  });

  const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'tax' | 'invoice' | 'currency'>('general');
  const [isSaved, setIsSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (business) {
      setFormData({
        name: business.name || '',
        logo: business.logo || '',
        phone: business.phone || '',
        mobile: business.mobile || '',
        email: business.email || '',
        website: business.website || '',
        address: business.address || '',
        city: business.city || '',
        state: business.state || '',
        pincode: business.pincode || '',
        taxNumber: business.taxNumber || '',
        drugLicenseNo: business.drugLicenseNo || '',
        businessType: business.businessType || 'Surgical & Pharmaceutical Wholesale',
        currency: business.currency || 'PKR',
        vatPercentage: business.vatPercentage || 0,
        invoiceTerms: business.invoiceTerms || '',
        invoicePrefix: business.invoicePrefix || 'INV-',
      });
      setLogoPreview(business.logo || '');
    }
  }, [business, isOpen]);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds 2MB limit. Please upload a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        setFormData(prev => ({ ...prev, logo: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setFormData(prev => ({ ...prev, logo: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      alert('Company name is required');
      return;
    }
    await updateBusiness(formData);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1a2235] text-white px-6 py-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Company / Business Settings</h2>
              <p className="text-xs text-slate-400">Edit business profile, logo, contact & tax credentials</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-2 text-sm font-medium overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'general' 
                ? 'border-blue-600 text-blue-600 font-semibold' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" /> General & Logo
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('currency')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'currency' 
                ? 'border-blue-600 text-blue-600 font-semibold' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-500" />
            <span>Currencies & Rates</span>
            <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
              Auto/Manual
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'contact' 
                ? 'border-blue-600 text-blue-600 font-semibold' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4" /> Contact & Address
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tax')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'tax' 
                ? 'border-blue-600 text-blue-600 font-semibold' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Tax & Licenses (NTN/DL)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoice')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'invoice' 
                ? 'border-blue-600 text-blue-600 font-semibold' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" /> Invoice Terms
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">
            
            {/* TAB 1: General & Logo */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Logo Section */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shadow-inner">
                      {logoPreview ? (
                        <img 
                          src={logoPreview} 
                          alt="Company Logo" 
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <div className="text-center p-2">
                          <div className="w-10 h-10 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                            {formData.name ? formData.name.substring(0, 2).toUpperCase() : 'CO'}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">No Logo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <h4 className="text-sm font-semibold text-slate-800">Business Logo</h4>
                    <p className="text-xs text-slate-500">
                      Upload your official company logo. This will appear on invoices, receipts, and the top sidebar.
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleLogoUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 shadow-sm transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-600" /> Upload Image
                      </button>
                      {logoPreview && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-semibold text-rose-700 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name & Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Company / Business Name <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. MBI INVENTRA"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Business Type / Category
                    </label>
                    <input 
                      type="text" 
                      value={formData.businessType || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
                      placeholder="e.g. Surgical Store / Pharmacy / Wholesale"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Currency & Base */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Company Base Currency
                      </label>
                      <div className="text-sm font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-amber-500" />
                        <span>{formData.currency || getMultiCurrencySettings().baseCurrency || 'PKR'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('currency')}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold transition-colors"
                    >
                      Exchange Rates (Auto/Manual) →
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Website / Online Portal
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input 
                        type="text" 
                        value={formData.website || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="e.g. www.mypharma.com"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Currencies & Exchange Rates */}
            {activeTab === 'currency' && (
              <div>
                <MultiCurrencySection 
                  onSettingsChange={(newSettings) => {
                    setFormData(prev => ({ ...prev, currency: newSettings.baseCurrency }));
                  }}
                />
              </div>
            )}

            {/* TAB 2: Contact & Address */}
            {activeTab === 'contact' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Phone Number (Landline / Official)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input 
                        type="text" 
                        value={formData.phone || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="e.g. 03364585863"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Mobile / WhatsApp Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-emerald-500 absolute left-3 top-3" />
                      <input 
                        type="text" 
                        value={formData.mobile || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                        placeholder="e.g. 03281302636"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input 
                      type="email" 
                      value={formData.email || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="e.g. support@mbinventra.com"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Shop / Building / Street Address
                  </label>
                  <textarea 
                    rows={2}
                    value={formData.address || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="e.g. Shop # 14, Main Medical Complex, Kot Momin"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      City
                    </label>
                    <input 
                      type="text" 
                      value={formData.city || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Kot Momin / Lahore"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      State / Province
                    </label>
                    <input 
                      type="text" 
                      value={formData.state || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="Punjab / Sindh / KPK"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Postal Code / Pincode
                    </label>
                    <input 
                      type="text" 
                      value={formData.pincode || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                      placeholder="40150"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Tax & Licenses */}
            {activeTab === 'tax' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span>These legal registration numbers will be printed on sales tax invoices, bills, and regulatory compliance receipts.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      NTN / GST Number (Tax ID)
                    </label>
                    <input 
                      type="text" 
                      value={formData.taxNumber || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, taxNumber: e.target.value }))}
                      placeholder="e.g. PK-NTN-4928172-9"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Drug License Number (DL No.)
                    </label>
                    <input 
                      type="text" 
                      value={formData.drugLicenseNo || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, drugLicenseNo: e.target.value }))}
                      placeholder="e.g. DL-09-2024-KTM / Form 9"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Invoice & Print Terms */}
            {activeTab === 'invoice' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Default Invoice Prefix
                  </label>
                  <input 
                    type="text" 
                    value={formData.invoicePrefix || 'INV-'}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoicePrefix: e.target.value }))}
                    placeholder="INV-"
                    className="w-48 px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Terms & Conditions / Footer Notes (Printed on Invoices)
                  </label>
                  <textarea 
                    rows={4}
                    value={formData.invoiceTerms || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoiceTerms: e.target.value }))}
                    placeholder="1. Goods once sold will not be returned without original bill.&#10;2. Expiry claims must be informed 60 days in advance.&#10;3. Thank you for your business!"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xs"
                  />
                </div>
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {isSaved ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Company details saved successfully!
                </span>
              ) : (
                <span>All changes update immediately across the entire system.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-md transition-colors"
              >
                <Save className="w-4 h-4" /> Save Details
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
