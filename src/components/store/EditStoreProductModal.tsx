import React, { useState, useRef } from 'react';
import { 
  X, Upload, Image as ImageIcon, Camera, Trash2, Check, Plus, 
  Sparkles, Star, Tag, DollarSign, AlertCircle, ThermometerSnowflake, 
  FileText, Layers, Search, Eye, ExternalLink, ShieldCheck, CheckCircle2, 
  Package, ShoppingBag, ArrowUpRight, Copy, RefreshCw
} from 'lucide-react';
import { Medicine } from '../../types';
import { compressImageFile, PHARMA_STOCK_PRESETS } from '../../lib/imageUtils';

interface EditStoreProductModalProps {
  medicine: Medicine;
  onClose: () => void;
  onSave: (updatedMedicine: Medicine) => void;
}

export const EditStoreProductModal: React.FC<EditStoreProductModalProps> = ({
  medicine,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<Medicine>({
    ...medicine,
    onlineName: medicine.onlineName || medicine.name,
    onlineCategory: medicine.onlineCategory || medicine.category || 'General',
    onlineStatus: medicine.onlineStatus || 'Published',
    useMainSalePrice: medicine.useMainSalePrice ?? true,
    onlinePrice: medicine.onlinePrice ?? medicine.sellingPrice ?? 0,
    compareAtPrice: medicine.compareAtPrice ?? 0,
    isFeatured: !!medicine.isFeatured,
    onlineDescription: medicine.onlineDescription || medicine.description || '',
    onlineImages: Array.isArray(medicine.onlineImages) && medicine.onlineImages.length > 0 
      ? [...medicine.onlineImages] 
      : (medicine.description && medicine.description.startsWith('data:image') ? [medicine.description] : []),
    onlineBadge: medicine.onlineBadge || '',
    requiresPrescription: !!medicine.requiresPrescription,
    coldChain: !!medicine.coldChain,
    packSize: medicine.packSize || '',
    dosageForm: medicine.dosageForm || '',
    genericName: medicine.genericName || '',
    minOrderQuantity: medicine.minOrderQuantity || 1,
    maxOrderQuantity: medicine.maxOrderQuantity || undefined,
    onlineStockVisibility: medicine.onlineStockVisibility ?? true,
    allowBackorders: !!medicine.allowBackorders,
    searchKeywords: medicine.searchKeywords || []
  });

  const [activeTab, setActiveTab] = useState<'media' | 'pricing' | 'clinical' | 'ordering'>('media');
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Helper for prices
  const posSellingRate = medicine.sellingPrice || medicine.mrp || 0;
  const effectiveOnlineRate = formData.useMainSalePrice 
    ? posSellingRate 
    : (formData.onlinePrice || posSellingRate);
  
  const compareAtRate = formData.compareAtPrice || 0;
  const hasDiscount = compareAtRate > effectiveOnlineRate;
  const discountPercent = hasDiscount 
    ? Math.round(((compareAtRate - effectiveOnlineRate) / compareAtRate) * 100) 
    : 0;
  const discountAmount = hasDiscount ? compareAtRate - effectiveOnlineRate : 0;

  // Process and compress image file
  const processImageFile = async (file: File) => {
    try {
      setIsCompressing(true);
      setUploadFeedback(null);

      const compressed = await compressImageFile(file, {
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 0.84
      });

      const updatedImages = [...(formData.onlineImages || []), compressed.dataUrl];
      setFormData(prev => ({
        ...prev,
        onlineImages: updatedImages
      }));
      setSelectedImageIdx(updatedImages.length - 1);
      setUploadFeedback(`Photo compressed & added successfully (${compressed.sizeKb} KB, ${compressed.width}x${compressed.height}px)`);
      setTimeout(() => setUploadFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to process image file');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => processImageFile(file));
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => processImageFile(file));
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    const updatedImages = [...(formData.onlineImages || []), url];
    setFormData(prev => ({
      ...prev,
      onlineImages: updatedImages
    }));
    setSelectedImageIdx(updatedImages.length - 1);
    setUrlInput('');
    setUploadFeedback('Image URL added to gallery!');
    setTimeout(() => setUploadFeedback(null), 3000);
  };

  const handleSelectPreset = (url: string) => {
    const updatedImages = [...(formData.onlineImages || []), url];
    setFormData(prev => ({
      ...prev,
      onlineImages: updatedImages
    }));
    setSelectedImageIdx(updatedImages.length - 1);
    setShowPresets(false);
    setUploadFeedback('Preset medical stock photo added!');
    setTimeout(() => setUploadFeedback(null), 3000);
  };

  const handleRemoveImage = (idxToRemove: number) => {
    const current = formData.onlineImages || [];
    const updated = current.filter((_, idx) => idx !== idxToRemove);
    setFormData(prev => ({ ...prev, onlineImages: updated }));
    if (selectedImageIdx >= updated.length) {
      setSelectedImageIdx(Math.max(0, updated.length - 1));
    }
  };

  const handleSetPrimary = (idxToPrimary: number) => {
    const current = formData.onlineImages || [];
    if (idxToPrimary === 0 || idxToPrimary >= current.length) return;
    const selected = current[idxToPrimary];
    const filtered = current.filter((_, idx) => idx !== idxToPrimary);
    const reordered = [selected, ...filtered];
    setFormData(prev => ({ ...prev, onlineImages: reordered }));
    setSelectedImageIdx(0);
    setUploadFeedback('Primary cover photo updated!');
    setTimeout(() => setUploadFeedback(null), 2500);
  };

  const handleAddKeyword = () => {
    if (!keywordInput.trim()) return;
    const kw = keywordInput.trim().toLowerCase();
    const existing = formData.searchKeywords || [];
    if (!existing.includes(kw)) {
      setFormData(prev => ({
        ...prev,
        searchKeywords: [...existing, kw]
      }));
    }
    setKeywordInput('');
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      searchKeywords: (prev.searchKeywords || []).filter(k => k !== kwToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const isVisible = formData.onlineStatus !== 'Hidden';
    const finalProduct: Medicine = {
      ...formData,
      onlineImages: formData.onlineImages || [],
      showOnline: isVisible,
      showInOnlineStore: isVisible,
      onlineSaleAllowed: isVisible,
      updatedAt: new Date().toISOString()
    };
    onSave(finalProduct);
  };

  const currentPrimaryImage = formData.onlineImages && formData.onlineImages[selectedImageIdx] 
    ? formData.onlineImages[selectedImageIdx] 
    : (formData.onlineImages && formData.onlineImages[0]) || '';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150 text-slate-800">
        
        {/* ================= HEADER ================= */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight">Edit Online Store Product Info</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  formData.onlineStatus === 'Published' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : formData.onlineStatus === 'Draft' 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {formData.onlineStatus || 'Published'}
                </span>
                {formData.isFeatured && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    Featured
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                ERP Item: <span className="text-white font-bold">{medicine.name}</span> &bull; POS Rate: Rs. {posSellingRate} &bull; Stock: {medicine.quantity || 0} {medicine.unit || 'PCS'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= TABS NAVIGATION ================= */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 pt-2 flex gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t-2 ${
              activeTab === 'media'
                ? 'bg-white text-emerald-700 border-emerald-500 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Product Photos & Gallery</span>
            {formData.onlineImages && formData.onlineImages.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-mono font-bold">
                {formData.onlineImages.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t-2 ${
              activeTab === 'pricing'
                ? 'bg-white text-emerald-700 border-emerald-500 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Pricing & Badges</span>
            {hasDiscount && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[10px] rounded-full font-bold">
                {discountPercent}% OFF
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clinical')}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t-2 ${
              activeTab === 'clinical'
                ? 'bg-white text-emerald-700 border-emerald-500 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Clinical & Packaging</span>
            {formData.requiresPrescription && (
              <span className="ml-1 px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[10px] rounded-full font-bold">
                Rx
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ordering')}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t-2 ${
              activeTab === 'ordering'
                ? 'bg-white text-emerald-700 border-emerald-500 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Order Limits & Search</span>
          </button>
        </div>

        {/* ================= FORM BODY ================= */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          
          {/* ================= TAB 1: MEDIA & IMAGE UPLOAD ================= */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              
              {/* Top Banner Notice */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3">
                <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700 mt-0.5">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-emerald-950">Storefront Photo & Multi-Image Gallery</h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Upload crisp photos from your computer/mobile, take a live camera shot, choose curated pharma stock photos, or paste an image URL. All uploaded images are automatically compressed for high-speed loading.
                  </p>
                </div>
              </div>

              {uploadFeedback && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl font-bold text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{uploadFeedback}</span>
                </div>
              )}

              {/* Main Photo Studio: Active Preview & Upload Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* Left (5 cols): Large Active Photo Viewer */}
                <div className="lg:col-span-5 flex flex-col space-y-2">
                  <span className="font-bold text-slate-700 flex items-center justify-between">
                    <span>Active Preview</span>
                    {selectedImageIdx === 0 && formData.onlineImages && formData.onlineImages.length > 0 && (
                      <span className="px-2 py-0.5 bg-emerald-600 text-white text-[9.5px] font-black rounded-md uppercase tracking-wider">
                        ★ Primary Cover
                      </span>
                    )}
                  </span>

                  <div className="w-full h-64 sm:h-72 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center p-3 relative overflow-hidden group">
                    {currentPrimaryImage ? (
                      <>
                        <img 
                          src={currentPrimaryImage} 
                          alt="Product Preview" 
                          className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80';
                          }}
                        />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-none">
                          {selectedImageIdx === 0 && (
                            <span className="px-2 py-1 bg-emerald-700/90 backdrop-blur-xs text-white text-[10px] font-black rounded-lg shadow-sm">
                              MAIN STORE COVER
                            </span>
                          )}
                          {formData.onlineBadge && (
                            <span className="px-2 py-1 bg-rose-600 text-white text-[10px] font-black rounded-lg shadow-sm uppercase">
                              {formData.onlineBadge}
                            </span>
                          )}
                        </div>

                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                          {selectedImageIdx !== 0 && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(selectedImageIdx)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-md cursor-pointer"
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span>Make Primary</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(selectedImageIdx)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-md cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-6 space-y-2">
                        <div className="w-16 h-16 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                        <p className="font-bold text-slate-500">No Image Selected</p>
                        <p className="text-[11px] text-slate-400 max-w-xs">
                          Upload a photo from your device or pick a preset stock photo to display on the storefront.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right (7 cols): Upload Controls & Multiple Methods */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* Drag & Drop Upload Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 ${
                      isDragging 
                        ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]' 
                        : 'border-slate-300 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/30'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />

                    <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-emerald-600">
                      {isCompressing ? (
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                      ) : (
                        <Upload className="w-6 h-6" />
                      )}
                    </div>

                    <div>
                      <p className="font-bold text-slate-800 text-xs">
                        {isCompressing ? 'Compressing & Optimizing Photo...' : 'Click to Upload or Drag & Drop Photos'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Supports PNG, JPG, JPEG, WEBP &bull; Auto-optimized to lightweight web size
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg text-[11px] shadow-xs hover:bg-emerald-700 transition">
                        Browse Device Files
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          cameraInputRef.current?.click();
                        }}
                        className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px] flex items-center gap-1 transition"
                      >
                        <Camera className="w-3.5 h-3.5 text-slate-600" />
                        <span>Camera Snap</span>
                      </button>
                    </div>
                  </div>

                  {/* Alternative Image Sources: Presets & URL */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Quick Options</span>
                      <button
                        type="button"
                        onClick={() => setShowPresets(!showPresets)}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{showPresets ? 'Hide Medical Presets' : 'Browse 10 Medical Photo Presets'}</span>
                      </button>
                    </div>

                    {/* URL Input Bar */}
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Or paste an image web link (https://...)"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddUrl}
                        disabled={!urlInput.trim()}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                      >
                        Add Link
                      </button>
                    </div>

                    {/* Stock Presets Dropdown/Grid */}
                    {showPresets && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 animate-in fade-in duration-150">
                        <p className="text-[11px] font-bold text-slate-600">
                          Click any professional medical photo to add it to this product:
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto p-1">
                          {PHARMA_STOCK_PRESETS.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectPreset(preset.url)}
                              className="p-1.5 bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 rounded-xl flex flex-col items-center gap-1 transition text-left cursor-pointer group"
                            >
                              <img 
                                src={preset.url} 
                                alt={preset.title} 
                                className="w-full h-14 object-cover rounded-lg group-hover:scale-105 transition"
                              />
                              <span className="text-[9.5px] font-bold text-slate-700 truncate w-full text-center">
                                {preset.title}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Multi-Image Gallery Strip */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 flex items-center gap-1.5">
                        <span>Gallery Photos ({formData.onlineImages?.length || 0})</span>
                        <span className="text-[10.5px] text-slate-400 font-normal">First photo is storefront cover</span>
                      </label>
                      {formData.onlineImages && formData.onlineImages.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Clear all images for this product?')) {
                              setFormData(prev => ({ ...prev, onlineImages: [] }));
                              setSelectedImageIdx(0);
                            }
                          }}
                          className="text-[10.5px] text-rose-600 hover:underline font-bold cursor-pointer"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {formData.onlineImages && formData.onlineImages.length > 0 ? (
                      <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5">
                        {formData.onlineImages.map((img, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedImageIdx(idx)}
                            className={`relative w-16 h-16 rounded-xl border-2 overflow-hidden shrink-0 bg-white cursor-pointer transition ${
                              selectedImageIdx === idx 
                                ? 'border-emerald-600 ring-2 ring-emerald-500/20 scale-105 shadow-md' 
                                : 'border-slate-200 opacity-80 hover:opacity-100 hover:border-slate-300'
                            }`}
                          >
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            {idx === 0 && (
                              <span className="absolute top-0 left-0 right-0 bg-emerald-600 text-white text-[8px] font-black text-center uppercase tracking-tighter">
                                Cover
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImage(idx);
                              }}
                              className="absolute bottom-0 right-0 p-1 bg-slate-900/80 hover:bg-rose-600 text-white rounded-tl-lg transition"
                              title="Delete photo"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-700 shrink-0 transition cursor-pointer"
                          title="Add another photo"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-[9px] font-bold">Add</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-[11px]">
                        No gallery photos yet. Click above or drag images to start!
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* ================= TAB 2: STOREFRONT & PRICING ================= */}
          {activeTab === 'pricing' && (
            <div className="space-y-5">
              
              {/* Product Title on Storefront */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Display Name on Customer Storefront *</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, onlineName: medicine.name })}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy ERP Name</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Panadol 500mg Tablets (Pack of 20)"
                  value={formData.onlineName || ''}
                  onChange={(e) => setFormData({ ...formData, onlineName: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Online Category & Store Visibility */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Online Store Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Surgical Items, Pain Relief, Antibiotics"
                    value={formData.onlineCategory || ''}
                    onChange={(e) => setFormData({ ...formData, onlineCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex flex-wrap gap-1 pt-1">
                    {['Surgical Items', 'Medicines', 'Syrups', 'Injections', 'Disposables', 'Baby Care', 'Devices'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData({ ...formData, onlineCategory: cat })}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-800 text-[10px] rounded-md font-medium transition cursor-pointer"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Store Visibility Status</label>
                  <select
                    value={formData.onlineStatus || 'Published'}
                    onChange={(e) => setFormData({ ...formData, onlineStatus: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  >
                    <option value="Published">Published (Active & Visible to Customers)</option>
                    <option value="Draft">Draft (Only Admin Can Preview)</option>
                    <option value="Hidden">Hidden (Disabled from Store)</option>
                  </select>
                </div>
              </div>

              {/* Merchandising Badge & Featured Toggle */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Promotional Ribbon / Badge</span>
                  </label>
                  <select
                    value={formData.onlineBadge || ''}
                    onChange={(e) => setFormData({ ...formData, onlineBadge: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 focus:outline-none font-bold text-xs"
                  >
                    <option value="">No Badge</option>
                    <option value="🔥 BEST SELLER">🔥 BEST SELLER</option>
                    <option value="🏷️ SPECIAL DEAL">🏷️ SPECIAL DEAL</option>
                    <option value="✨ NEW ARRIVAL">✨ NEW ARRIVAL</option>
                    <option value="⭐ TOP RATED">⭐ TOP RATED</option>
                    <option value="⚡ FAST DELIVERY">⚡ FAST DELIVERY</option>
                    <option value="🩺 DOCTOR CHOICE">🩺 DOCTOR CHOICE</option>
                    <option value="LIMITED STOCK">LIMITED STOCK</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-4 sm:pt-6">
                  <input
                    type="checkbox"
                    id="featured-toggle"
                    checked={!!formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                  <div>
                    <label htmlFor="featured-toggle" className="font-bold text-slate-800 cursor-pointer block">
                      Feature on Storefront Homepage
                    </label>
                    <p className="text-[10.5px] text-slate-500">Displays this product on top recommended banners</p>
                  </div>
                </div>
              </div>

              {/* Independent Pricing Engine */}
              <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>Online Store Rate Engine</span>
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Configure custom online sale price or keep synced with POS billing rate.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600">
                      {formData.useMainSalePrice ? 'Linked to POS Rate' : 'Independent Online Price'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, useMainSalePrice: !formData.useMainSalePrice })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        formData.useMainSalePrice === false ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.useMainSalePrice === false ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-emerald-100">
                  {/* ERP POS Price Reference */}
                  <div className="space-y-1 bg-white/80 p-3 rounded-xl border border-emerald-100">
                    <label className="text-[11px] font-bold text-slate-500">ERP Counter Rate (POS)</label>
                    <div className="text-sm font-black font-mono text-slate-900">
                      Rs. {posSellingRate.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-400">Inventory selling price</span>
                  </div>

                  {/* Online Sale Price */}
                  <div className="space-y-1 bg-white p-3 rounded-xl border border-emerald-200">
                    <label className="text-[11px] font-bold text-emerald-800">
                      {formData.useMainSalePrice ? 'Effective Online Price (POS Linked)' : 'Custom Online Rate (PKR) *'}
                    </label>
                    <input
                      type="number"
                      disabled={formData.useMainSalePrice}
                      value={formData.useMainSalePrice ? posSellingRate : (formData.onlinePrice || '')}
                      onChange={(e) => setFormData({ ...formData, onlinePrice: parseFloat(e.target.value) || 0 })}
                      className={`w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold text-sm ${
                        formData.useMainSalePrice 
                          ? 'bg-slate-100 text-slate-500 border-slate-200' 
                          : 'bg-white border-emerald-300 text-emerald-900 focus:ring-2 focus:ring-emerald-500'
                      }`}
                    />
                    <span className="text-[10px] text-emerald-700">Actual amount customer pays</span>
                  </div>

                  {/* Compare-at Strike Price */}
                  <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-700">
                      Compare-at M.R.P. (Strike-through)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 250"
                      value={formData.compareAtPrice || ''}
                      onChange={(e) => setFormData({ ...formData, compareAtPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 font-mono font-bold text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400">Shows crossed original price</span>
                  </div>
                </div>

                {/* Real-time Discount & Savings Badge Calculation */}
                {hasDiscount && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-900">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-rose-600 text-white font-black rounded-md text-[10px] uppercase">
                        {discountPercent}% OFF
                      </span>
                      <span className="font-bold text-xs">
                        Customer Saves Rs. {discountAmount.toLocaleString()} per unit
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 line-through">
                      Was Rs. {compareAtRate.toLocaleString()} &rarr; Now Rs. {effectiveOnlineRate.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Online Description & Clinical Usage */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Online Description & Usage Instructions</label>
                <textarea
                  rows={4}
                  placeholder="Describe indications, recommended dosage, package contents, material grade, and quality standards for online shoppers..."
                  value={formData.onlineDescription || ''}
                  onChange={(e) => setFormData({ ...formData, onlineDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed text-xs"
                />
              </div>

            </div>
          )}

          {/* ================= TAB 3: CLINICAL & PACKAGING ================= */}
          {activeTab === 'clinical' && (
            <div className="space-y-5">
              
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-indigo-950">Pharmacy Regulatory & Packaging Specifications</h4>
                  <p className="text-[11px] text-indigo-800 mt-0.5">
                    Configure clinical attributes, prescription requirements, storage conditions, and dosage forms for customer guidance.
                  </p>
                </div>
              </div>

              {/* Regulatory Safety Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Prescription Required (Rx) */}
                <div className={`p-4 rounded-2xl border transition flex items-start gap-3 cursor-pointer ${
                  formData.requiresPrescription 
                    ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/10' 
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
                onClick={() => setFormData({ ...formData, requiresPrescription: !formData.requiresPrescription })}
                >
                  <input
                    type="checkbox"
                    checked={!!formData.requiresPrescription}
                    onChange={(e) => setFormData({ ...formData, requiresPrescription: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded mt-0.5 cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-slate-900 text-xs">Prescription Required (Rx)</span>
                      <span className="px-1.5 py-0.2 bg-indigo-600 text-white font-black text-[9px] rounded">
                        Rx
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-500 mt-0.5">
                      Prompts online customers to upload doctor's prescription during order checkout.
                    </p>
                  </div>
                </div>

                {/* Cold Chain / Temperature Sensitive */}
                <div className={`p-4 rounded-2xl border transition flex items-start gap-3 cursor-pointer ${
                  formData.coldChain 
                    ? 'bg-cyan-50 border-cyan-300 ring-2 ring-cyan-500/10' 
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
                onClick={() => setFormData({ ...formData, coldChain: !formData.coldChain })}
                >
                  <input
                    type="checkbox"
                    checked={!!formData.coldChain}
                    onChange={(e) => setFormData({ ...formData, coldChain: e.target.checked })}
                    className="w-4 h-4 text-cyan-600 rounded mt-0.5 cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-slate-900 text-xs">Cold Chain (2°C - 8°C)</span>
                      <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-600" />
                    </div>
                    <p className="text-[10.5px] text-slate-500 mt-0.5">
                      Flags product for temperature-controlled icebox packaging (e.g. Insulin, Vaccines).
                    </p>
                  </div>
                </div>

              </div>

              {/* Packaging and Clinical Attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Pack Size */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Pack Size / Presentation</label>
                  <input
                    type="text"
                    placeholder="e.g. Box of 100 Tablets / Strip of 10 / 120ml Bottle"
                    value={formData.packSize || ''}
                    onChange={(e) => setFormData({ ...formData, packSize: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Dosage Form */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Dosage Form</label>
                  <select
                    value={formData.dosageForm || ''}
                    onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  >
                    <option value="">Select Dosage Form...</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup / Suspension">Syrup / Suspension</option>
                    <option value="Injection / Ampoule">Injection / Ampoule</option>
                    <option value="Cream / Ointment">Cream / Ointment</option>
                    <option value="Eye / Ear Drops">Eye / Ear Drops</option>
                    <option value="Surgical Disposable">Surgical Disposable</option>
                    <option value="Medical Device">Medical Device</option>
                    <option value="Powder / Sachet">Powder / Sachet</option>
                    <option value="Inhaler / Respules">Inhaler / Respules</option>
                  </select>
                </div>

                {/* Active Generic Salt Composition */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700">Active Generic Salt / Formula</label>
                  <input
                    type="text"
                    placeholder="e.g. Paracetamol 500mg + Caffeine 30mg / Amoxicillin 500mg"
                    value={formData.genericName || ''}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 italic"
                  />
                  <p className="text-[10px] text-slate-400">
                    Shown to patients looking for exact medical salt replacements.
                  </p>
                </div>

              </div>

            </div>
          )}

          {/* ================= TAB 4: ORDERING & SEARCH ================= */}
          {activeTab === 'ordering' && (
            <div className="space-y-5">
              
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-900 text-xs">Customer Order Quantities & Stock Visibility</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Minimum Order Quantity (Units)</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.minOrderQuantity || 1}
                      onChange={(e) => setFormData({ ...formData, minOrderQuantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 font-mono font-bold"
                    />
                    <p className="text-[10px] text-slate-400">Minimum units customer must buy per order</p>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Maximum Order Quantity (Anti-Hoarding)</label>
                    <input
                      type="number"
                      min={1}
                      placeholder="No limit"
                      value={formData.maxOrderQuantity || ''}
                      onChange={(e) => setFormData({ ...formData, maxOrderQuantity: parseInt(e.target.value) || undefined })}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 font-mono font-bold"
                    />
                    <p className="text-[10px] text-slate-400">Prevents customers from hoarding essential medicine</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div>
                    <label className="font-bold text-slate-800">Allow Backorders When Out of Stock?</label>
                    <p className="text-[10.5px] text-slate-500">Permits customers to place an order even if ERP stock reaches 0</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!formData.allowBackorders}
                    onChange={(e) => setFormData({ ...formData, allowBackorders: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Search Keywords & Synonyms */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700">Store Search Synonyms & Keywords</label>
                <p className="text-[11px] text-slate-500">
                  Add common search terms, brand spellings, or symptoms so customers easily find this medicine.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type keyword (e.g. fever, headache, pain killer) & press Enter"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddKeyword();
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition cursor-pointer"
                  >
                    Add Tag
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(formData.searchKeywords || []).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold flex items-center gap-1.5"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(tag)}
                        className="hover:text-rose-600 cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {(!formData.searchKeywords || formData.searchKeywords.length === 0) && (
                    <span className="text-[11px] text-slate-400 italic">No search tags added yet.</span>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ================= LIVE STOREFRONT CARD PREVIEW ================= */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <span className="font-black text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>Live Storefront Card Preview (How Customers See It)</span>
            </span>

            <div className="bg-slate-100 p-4 rounded-2xl flex items-center justify-center">
              <div className="w-72 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="relative h-40 bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-100">
                  {currentPrimaryImage ? (
                    <img 
                      src={currentPrimaryImage} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-400">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                  )}

                  {hasDiscount && (
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider">
                      SAVE {discountPercent}%
                    </span>
                  )}

                  {formData.onlineBadge && (
                    <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-slate-900/90 text-white text-[9px] font-black uppercase">
                      {formData.onlineBadge}
                    </span>
                  )}

                  {formData.requiresPrescription && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[9px] font-black uppercase">
                      Rx
                    </span>
                  )}
                </div>

                <div className="p-3 space-y-2">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      {formData.onlineCategory || 'General'}
                    </span>
                    <h5 className="text-xs font-bold text-slate-900 truncate">
                      {formData.onlineName || medicine.name}
                    </h5>
                    {formData.genericName && (
                      <p className="text-[10px] text-slate-500 truncate italic">
                        {formData.genericName}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1 font-mono">
                        <span className="text-xs font-black text-slate-900">
                          Rs. {effectiveOnlineRate.toLocaleString()}
                        </span>
                        {hasDiscount && (
                          <span className="text-[9.5px] text-slate-400 line-through">
                            Rs. {compareAtRate.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400">{formData.packSize || medicine.unit || 'unit'}</span>
                    </div>

                    <span className="px-2.5 py-1 bg-slate-900 text-white font-bold rounded-lg text-[10px]">
                      + Add
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================= FOOTER ACTIONS ================= */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Store Product Info</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
