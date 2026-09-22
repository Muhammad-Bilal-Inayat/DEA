import React, { useState, useEffect } from 'react';
import { 
  X, Scan, ShieldAlert, Sparkles, Check, AlertTriangle, 
  Layers, DollarSign, Package, Eye, EyeOff, Lock, Unlock, 
  FileText, Image as ImageIcon, ShoppingBag, Info, CheckCircle2,
  Sliders, ArrowRight, ArrowLeft, RefreshCw, Upload, ShieldCheck
} from 'lucide-react';
import { Medicine, AuditLog, GenericMaster } from '../../types';
import { dbMedicines, dbAuditLogs } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { emitToast } from '../../contexts/ToastContext';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { DEFAULT_GENERIC_MASTERS } from '../../lib/genericMaster';
import { useHardwareBarcodeScanner } from '../../hooks/useHardwareBarcodeScanner';
import { playScannerBeep } from '../../lib/barcodeAudio';

interface AddEditMedicineModalProps {
  isOpen: boolean;
  medicine?: Medicine | null;
  onClose: () => void;
  onSaved: (savedMedicine: Medicine) => void;
}

type TabType = 'GENERAL' | 'PRICING' | 'CONTROLLED' | 'IMAGES' | 'ONLINE_STORE';

export const AddEditMedicineModal: React.FC<AddEditMedicineModalProps> = ({
  isOpen,
  medicine,
  onClose,
  onSaved
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('GENERAL');
  const isEditing = Boolean(medicine && medicine.id);

  // Core Form State
  const [formData, setFormData] = useState<Partial<Medicine>>({
    name: '',
    genericName: '',
    genericId: '',
    saltComposition: '',
    strength: '',
    dosageForm: 'Tablet',
    barcode: '',
    batchNumber: '',
    manufacturer: '',
    category: 'Surgical Items',
    unit: 'PCS',
    packSize: '',
    rackLocation: 'Rack A-1',
    hsnCode: '3004.9090',
    description: '',
    quantity: 100,
    lowStockThreshold: 20,
    purchasePrice: 0,
    mrp: 0,
    sellingPrice: 0,
    gstPercentage: 0,
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10),
    manufacturingDate: '',
    // Controlled / Restricted Substance & Granular Visibility Controls
    isControlled: false,
    showInNormalPOS: true,
    showInNormalSearch: true,
    showInOnlineStore: true,
    specialAccessRequired: false,
    regulatorySchedule: 'Schedule D - Prescription Only Medicine (POM)',
    // Online Store fields
    showOnline: true,
    onlineStatus: 'Published',
    onlinePrice: 0,
    compareAtPrice: 0,
    onlineCategory: 'Surgical Items',
    onlineDescription: '',
    onlineImages: [],
    requiresPrescription: false,
    coldChain: false,
  });

  const [isScanningBarcode, setIsScanningBarcode] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'url' | 'file'>('url');
  const [genericSearchOpen, setGenericSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hardware scanner listener: if user pulls trigger while modal is open, fill barcode field
  useHardwareBarcodeScanner({
    enabled: isOpen && !isScanningBarcode,
    onScan: (scannedBarcode) => {
      setFormData(prev => ({ ...prev, barcode: scannedBarcode.trim() }));
      playScannerBeep('success');
      emitToast(`Barcode scanned & assigned: ${scannedBarcode.trim()}`, 'success');
    }
  });

  // Initialize or reset form when modal opens or target medicine changes
  useEffect(() => {
    if (medicine) {
      setFormData({
        ...medicine,
        name: medicine.name || '',
        genericName: medicine.genericName || medicine.saltComposition || '',
        genericId: medicine.genericId || '',
        saltComposition: medicine.saltComposition || medicine.genericName || '',
        strength: medicine.strength || '',
        dosageForm: medicine.dosageForm || 'Tablet',
        barcode: medicine.barcode || '',
        batchNumber: medicine.batchNumber || '',
        manufacturer: medicine.manufacturer || '',
        category: medicine.category || 'Surgical Items',
        unit: medicine.unit || 'PCS',
        packSize: medicine.packSize || '',
        rackLocation: medicine.rackLocation || 'Rack A-1',
        hsnCode: medicine.hsnCode || '3004.9090',
        description: medicine.description || '',
        quantity: medicine.quantity ?? 100,
        lowStockThreshold: medicine.lowStockThreshold ?? 20,
        purchasePrice: medicine.purchasePrice ?? 0,
        mrp: medicine.mrp ?? 0,
        sellingPrice: medicine.sellingPrice ?? 0,
        gstPercentage: medicine.gstPercentage ?? 0,
        expiryDate: medicine.expiryDate ? medicine.expiryDate.slice(0, 10) : '',
        manufacturingDate: medicine.manufacturingDate ? medicine.manufacturingDate.slice(0, 10) : '',
        // Controlled & Visibility state
        isControlled: Boolean(medicine.isControlled),
        showInNormalPOS: medicine.showInNormalPOS !== undefined ? Boolean(medicine.showInNormalPOS) : !medicine.isControlled,
        showInNormalSearch: medicine.showInNormalSearch !== undefined ? Boolean(medicine.showInNormalSearch) : !medicine.isControlled,
        showInOnlineStore: medicine.showInOnlineStore !== undefined ? Boolean(medicine.showInOnlineStore) : !medicine.isControlled,
        specialAccessRequired: medicine.specialAccessRequired !== undefined ? Boolean(medicine.specialAccessRequired) : Boolean(medicine.isControlled),
        regulatorySchedule: medicine.regulatorySchedule || (medicine.isControlled ? 'Schedule G - Controlled Narcotic / Psychotropic' : 'Schedule D - Prescription Only Medicine (POM)'),
        // Online Store
        showOnline: medicine.showOnline !== undefined ? Boolean(medicine.showOnline) : true,
        onlineStatus: medicine.onlineStatus || 'Published',
        onlinePrice: medicine.onlinePrice ?? medicine.sellingPrice ?? 0,
        compareAtPrice: medicine.compareAtPrice ?? 0,
        onlineCategory: medicine.onlineCategory || medicine.category || 'Surgical Items',
        onlineDescription: medicine.onlineDescription || medicine.description || '',
        onlineImages: Array.isArray(medicine.onlineImages) && medicine.onlineImages.length > 0 
          ? medicine.onlineImages 
          : (medicine.description && medicine.description.startsWith('data:image') ? [medicine.description] : []),
        requiresPrescription: Boolean(medicine.requiresPrescription || medicine.isControlled),
        coldChain: Boolean(medicine.coldChain),
      });
    } else {
      setFormData({
        name: '',
        genericName: '',
        genericId: '',
        saltComposition: '',
        strength: '',
        dosageForm: 'Tablet',
        barcode: `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
        batchNumber: `BATCH-${Math.floor(100 + Math.random() * 900)}`,
        manufacturer: '',
        category: 'Surgical Items',
        unit: 'PCS',
        packSize: '',
        rackLocation: 'Rack A-1',
        hsnCode: '3004.9090',
        description: '',
        quantity: 100,
        lowStockThreshold: 20,
        purchasePrice: 0,
        mrp: 0,
        sellingPrice: 0,
        gstPercentage: 0,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10),
        manufacturingDate: '',
        isControlled: false,
        showInNormalPOS: true,
        showInNormalSearch: true,
        showInOnlineStore: true,
        specialAccessRequired: false,
        regulatorySchedule: 'Schedule D - Prescription Only Medicine (POM)',
        showOnline: true,
        onlineStatus: 'Published',
        onlinePrice: 0,
        compareAtPrice: 0,
        onlineCategory: 'Surgical Items',
        onlineDescription: '',
        onlineImages: [],
        requiresPrescription: false,
        coldChain: false,
      });
    }
  }, [medicine, isOpen]);

  if (!isOpen) return null;

  // Margin calculation helper
  const purchasePrice = formData.purchasePrice || 0;
  const sellingPrice = formData.sellingPrice || 0;
  const profitMarginPercent = purchasePrice > 0 
    ? Math.round(((sellingPrice - purchasePrice) / purchasePrice) * 100) 
    : 0;

  // Controlled Substance Toggle Handler with smart regulatory defaults
  const handleToggleControlled = (enable: boolean) => {
    if (enable) {
      setFormData((prev) => ({
        ...prev,
        isControlled: true,
        showInNormalPOS: false, // Hide from standard checkout by default
        showInNormalSearch: false, // Hide from universal search by default
        showInOnlineStore: false, // Hide from public patient store by default
        specialAccessRequired: true, // Enforce Doctor PMDC & CNIC validation
        requiresPrescription: true,
        regulatorySchedule: prev.regulatorySchedule || 'Schedule G - Controlled Narcotic / Psychotropic'
      }));
      emitToast('Controlled mode enabled: Visibility set to restricted by default.', 'info');
    } else {
      setFormData((prev) => ({
        ...prev,
        isControlled: false,
        showInNormalPOS: true,
        showInNormalSearch: true,
        showInOnlineStore: true,
        specialAccessRequired: false,
        regulatorySchedule: 'Schedule D - Prescription Only Medicine (POM)'
      }));
    }
  };

  // Image Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const currentImages = formData.onlineImages || [];
      setFormData((prev) => ({
        ...prev,
        onlineImages: [result, ...currentImages],
      }));
      emitToast('Image attached successfully', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Generic Master Selection
  const handleSelectGenericMaster = (gen: GenericMaster) => {
    setFormData((prev) => ({
      ...prev,
      genericId: gen.id,
      genericName: gen.genericName,
      saltComposition: gen.genericName,
      strength: gen.strength?.split('/')[0]?.trim() || prev.strength,
      dosageForm: gen.dosageForm?.split('/')[0]?.trim() || prev.dosageForm,
      isControlled: gen.isControlled ? true : prev.isControlled,
      showInNormalPOS: gen.isControlled ? false : prev.showInNormalPOS,
      showInNormalSearch: gen.isControlled ? false : prev.showInNormalSearch,
      showInOnlineStore: gen.isControlled ? false : prev.showInOnlineStore,
      specialAccessRequired: gen.isControlled ? true : prev.specialAccessRequired,
    }));
    setGenericSearchOpen(false);
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.name.trim()) {
      emitToast('Please enter a product name', 'error');
      setActiveTab('GENERAL');
      return;
    }

    try {
      setIsSubmitting(true);
      const isNew = !medicine?.id;
      const finalId = medicine?.id || uuidv4();
      
      const savedMed: Medicine = {
        ...(formData as Medicine),
        id: finalId,
        name: (formData.name || '').trim().toUpperCase(),
        barcode: formData.barcode || `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
        category: formData.category || 'Surgical Items',
        unit: formData.unit || 'PCS',
        purchasePrice: Number(formData.purchasePrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        mrp: Number(formData.mrp) || Number(formData.sellingPrice) || 0,
        quantity: Number(formData.quantity) || 0,
        lowStockThreshold: Number(formData.lowStockThreshold) || 10,
        gstPercentage: Number(formData.gstPercentage) || 0,
        onlinePrice: Number(formData.onlinePrice) || Number(formData.sellingPrice) || 0,
        compareAtPrice: Number(formData.compareAtPrice) || 0,
        isControlled: Boolean(formData.isControlled),
        showInNormalPOS: formData.isControlled ? Boolean(formData.showInNormalPOS) : true,
        showInNormalSearch: formData.isControlled ? Boolean(formData.showInNormalSearch) : true,
        showInOnlineStore: formData.isControlled ? Boolean(formData.showInOnlineStore) : Boolean(formData.showOnline),
        specialAccessRequired: Boolean(formData.specialAccessRequired),
        regulatorySchedule: formData.regulatorySchedule || (formData.isControlled ? 'Schedule G - Controlled Narcotic / Psychotropic' : 'Standard'),
        showOnline: Boolean(formData.showOnline),
        onlineStatus: formData.onlineStatus || 'Published',
        createdAt: medicine?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dbMedicines.save(savedMed);

      // Create Audit Log
      const audit: AuditLog = {
        id: uuidv4(),
        date: new Date().toISOString(),
        action: isNew ? 'ADD_STOCK' : 'ADJUST_STOCK',
        medicineId: savedMed.id,
        medicineName: savedMed.name,
        quantityChanged: savedMed.quantity,
        userId: 'admin',
        notes: `${isNew ? 'Added new product master' : 'Updated product master'}: ${savedMed.name} [Controlled: ${savedMed.isControlled ? 'YES' : 'NO'}, Normal POS: ${savedMed.showInNormalPOS ? 'ON' : 'OFF'}, Normal Search: ${savedMed.showInNormalSearch ? 'ON' : 'OFF'}, Online Store: ${savedMed.showInOnlineStore ? 'ON' : 'OFF'}]`,
      };
      await dbAuditLogs.save(audit);

      emitToast(isNew ? 'Product added successfully!' : 'Product updated successfully!', 'success');
      onSaved(savedMed);
      onClose();
    } catch (err) {
      console.error('Failed to save medicine:', err);
      emitToast('Failed to save product. Please check fields.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${formData.isControlled ? 'bg-purple-950/80 text-purple-400 border border-purple-700/50' : 'bg-blue-950/80 text-blue-400 border border-blue-700/50'}`}>
              {formData.isControlled ? <ShieldAlert className="w-5 h-5" /> : <Package className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Pharma Product Master
                </span>
                {formData.isControlled && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    CONTROLLED ITEM
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                {isEditing ? `Edit: ${formData.name || medicine?.name}` : 'Add New Product Master'}
              </h2>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-lg font-bold transition-colors cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Tab / Page Stepper Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-3 pt-2 gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('GENERAL')}
            className={`px-3.5 py-2 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'GENERAL'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-black">1</span>
            <span>General & Identity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PRICING')}
            className={`px-3.5 py-2 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'PRICING'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-black">2</span>
            <span>Pricing & Batches</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CONTROLLED')}
            className={`px-3.5 py-2 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'CONTROLLED'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${
              formData.isControlled ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'
            }`}>3</span>
            <span className="flex items-center gap-1.5">
              <span>Controlled & Visibility</span>
              {formData.isControlled && (
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('IMAGES')}
            className={`px-3.5 py-2 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'IMAGES'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-black">4</span>
            <span>Images & Gallery</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ONLINE_STORE')}
            className={`px-3.5 py-2 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ONLINE_STORE'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] flex items-center justify-center font-black">5</span>
            <span>Online Store</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-white">
          <form id="add-edit-med-form" onSubmit={handleSubmit} className="space-y-5">

            {/* ================= TAB 1: GENERAL & IDENTITY ================= */}
            {activeTab === 'GENERAL' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-center justify-between">
                  <div>
                    <strong>Page 1 of 5: Core Product Identity & Generic Formulation</strong>
                    <p className="text-[11px] text-blue-700 mt-0.5">Specify brand name, active salt composition, dosage form, packaging, and classification.</p>
                  </div>
                  <span className="hidden sm:inline-block text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                    Required Fields marked *
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Product Name */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">Product / Item Brand Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. PANADOL 500MG TABLETS or BLUE TEX GAUZE PAD"
                      value={formData.name || ''}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs uppercase font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  {/* Generic Salt Formula */}
                  <div className="sm:col-span-2 space-y-1 relative">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span>Generic Formula / Salt Composition</span>
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      </label>
                      <button
                        type="button"
                        onClick={() => setGenericSearchOpen(!genericSearchOpen)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        {genericSearchOpen ? 'Close Salt Suggestions' : 'Pick from Salt Master'}
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="e.g. Paracetamol / Amoxicillin + Clavulanic Acid"
                      value={formData.genericName || ''}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      onChange={(e) => setFormData({ ...formData, genericName: e.target.value, saltComposition: e.target.value })}
                    />

                    {/* Salt Master Suggestions Dropdown */}
                    {genericSearchOpen && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-indigo-200 p-2 max-h-48 overflow-y-auto space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                          Standard Generic Salts Database
                        </div>
                        {DEFAULT_GENERIC_MASTERS.map((gen) => (
                          <button
                            key={gen.id}
                            type="button"
                            onClick={() => handleSelectGenericMaster(gen)}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-indigo-50 text-xs flex items-center justify-between transition cursor-pointer"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{gen.genericName}</div>
                              <div className="text-[10px] text-slate-500">{gen.therapeuticClass} • {gen.strength}</div>
                            </div>
                            {gen.isControlled && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-700 font-bold rounded">
                                Controlled
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Strength & Dosage Form */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Strength / Potency</label>
                    <input
                      type="text"
                      placeholder="e.g. 500mg, 10mg/2ml, 250mg/5ml"
                      value={formData.strength || ''}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Dosage Form</label>
                    <select
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.dosageForm || 'Tablet'}
                      onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                    >
                      <option value="Tablet">Tablet</option>
                      <option value="Capsule">Capsule</option>
                      <option value="Syrup">Syrup</option>
                      <option value="Suspension">Suspension</option>
                      <option value="Injection">Injection</option>
                      <option value="IV Infusion">IV Infusion</option>
                      <option value="Drops">Eye/Ear Drops</option>
                      <option value="Cream/Ointment">Cream / Ointment</option>
                      <option value="Inhaler">Inhaler / Nebulizer</option>
                      <option value="Surgical Disposable">Surgical Disposable</option>
                      <option value="Diagnostic Device">Diagnostic Device</option>
                      <option value="Other">Other Medical Supply</option>
                    </select>
                  </div>

                  {/* Category & Unit */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Category *</label>
                    <select
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.category || 'Surgical Items'}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="Surgical Items">Surgical Items</option>
                      <option value="Syringes">Syringes</option>
                      <option value="IV Infusions">IV Infusions</option>
                      <option value="Diagnostic Devices">Diagnostic Devices</option>
                      <option value="General Medicines">General Medicines</option>
                      <option value="Antibiotics">Antibiotics</option>
                      <option value="Bandages & Dressing">Bandages & Dressing</option>
                      <option value="Hospital Disposables">Hospital Disposables</option>
                      <option value="Orthopedic Support">Orthopedic Support</option>
                      <option value="Narcotics & Controlled">Narcotics & Controlled</option>
                      <option value="Eye & Ear Care">Eye & Ear Care</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Unit of Measurement *</label>
                    <select
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.unit || 'PCS'}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    >
                      <option value="PCS">PCS (Pieces)</option>
                      <option value="BOX">BOX</option>
                      <option value="PACK">PACK</option>
                      <option value="STRIP">STRIP</option>
                      <option value="BOTTLE">BOTTLE</option>
                      <option value="SET">SET</option>
                      <option value="VIAL">VIAL</option>
                      <option value="AMP">AMPOULE</option>
                      <option value="ROLL">ROLL</option>
                      <option value="KG">KG</option>
                      <option value="LITRE">LITRE</option>
                    </select>
                  </div>

                  {/* Barcode & Live Scan */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Barcode / SKU</label>
                      <button
                        type="button"
                        onClick={() => setIsScanningBarcode(true)}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Scan className="w-3 h-3 text-emerald-600" />
                        <span>Scan (Gun / Camera)</span>
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="Scan with gun or type barcode..."
                        value={formData.barcode || ''}
                        className="w-full rounded-xl border border-slate-300 p-2 pr-9 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setIsScanningBarcode(true)}
                        title="Open Barcode Scanner (Gun / Camera)"
                        className="absolute right-2 text-slate-400 hover:text-emerald-600 p-1 cursor-pointer"
                      >
                        <Scan className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Pull your USB/Wireless scanner trigger anytime to auto-populate barcode.
                    </p>
                  </div>

                  {/* Manufacturer */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Manufacturer / Pharma Company</label>
                    <input
                      type="text"
                      placeholder="e.g. GSK / Pfizer / Surgical Care Pakistan"
                      value={formData.manufacturer || ''}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    />
                  </div>

                  {/* Rack Location */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Warehouse Shelf / Rack Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Rack A-3, Shelf 2"
                      value={formData.rackLocation || ''}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs uppercase"
                      onChange={(e) => setFormData({ ...formData, rackLocation: e.target.value })}
                    />
                  </div>

                  {/* HSN / Tariff Code */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">HSN / Drug Tariff Code</label>
                    <input
                      type="text"
                      placeholder="3004.9090"
                      value={formData.hsnCode || ''}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono"
                      onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    />
                  </div>
                </div>

                {/* Stepper Next Button */}
                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab('PRICING')}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition active:scale-95"
                  >
                    <span>Next: Pricing & Batches</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ================= TAB 2: PRICING & BATCHES ================= */}
            {activeTab === 'PRICING' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
                  <div>
                    <strong>Page 2 of 5: Pricing, Profit Margin & Batch Stock Levels</strong>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Define purchase cost, MRP, selling price, initial quantity, and expiry date.</p>
                  </div>
                  {profitMarginPercent !== 0 && (
                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg border ${
                      profitMarginPercent > 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      Margin: {profitMarginPercent > 0 ? `+${profitMarginPercent}%` : `${profitMarginPercent}%`}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Purchase Cost */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Purchase / Cost Price (Rs) *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={formData.purchasePrice ?? 0}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold font-mono text-slate-800"
                      onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  {/* MRP */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Maximum Retail Price / MRP (Rs)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.mrp ?? 0}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold font-mono text-slate-800"
                      onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  {/* Standard Sale Price */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Standard POS / Counter Sale Price (Rs) *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={formData.sellingPrice ?? 0}
                      className="w-full rounded-xl border border-emerald-300 p-2 text-xs font-black font-mono text-emerald-700 bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData({ 
                          ...formData, 
                          sellingPrice: val,
                          onlinePrice: formData.onlinePrice || val 
                        });
                      }}
                    />
                  </div>

                  {/* GST % */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Tax / GST Percentage (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.gstPercentage ?? 0}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono"
                      onChange={(e) => setFormData({ ...formData, gstPercentage: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  {/* Initial Quantity */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Current Stock Quantity *</label>
                    <input
                      required
                      type="number"
                      value={formData.quantity ?? 100}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold font-mono"
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  {/* Low Stock Alert */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Low Stock Alert Threshold</label>
                    <input
                      type="number"
                      value={formData.lowStockThreshold ?? 20}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono"
                      onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  {/* Batch Number */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Batch Number</label>
                    <input
                      type="text"
                      placeholder="e.g. BATCH-990"
                      value={formData.batchNumber || ''}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs uppercase font-mono"
                      onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    />
                  </div>

                  {/* Expiry Date */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Expiry Date</label>
                    <input
                      type="date"
                      value={formData.expiryDate ? formData.expiryDate.slice(0, 10) : ''}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    />
                  </div>

                  {/* Description */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">Description & Clinical Usage Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Enter specifications, usage instructions, packaging notes..."
                      value={formData.description || ''}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab('GENERAL')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back: General</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('CONTROLLED')}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition active:scale-95"
                  >
                    <span>Next: Controlled & Visibility</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ================= TAB 3: CONTROLLED & VISIBILITY CONTROLS ================= */}
            {activeTab === 'CONTROLLED' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                
                {/* Page Intro Banner */}
                <div className="bg-purple-50/90 border border-purple-200 rounded-2xl p-4 text-xs text-purple-950 space-y-1.5">
                  <div className="flex items-center gap-2 font-black text-purple-950 text-sm">
                    <ShieldAlert className="w-5 h-5 text-purple-700 shrink-0" />
                    <span>Page 3 of 5: DRAP Form-7 & Controlled Substance Governance</span>
                  </div>
                  <p className="text-purple-800 text-[11.5px] leading-relaxed">
                    Configure strict regulatory scheduling and granular visibility across sales channels. Hiding items from Normal POS, Search, or Online Store blocks unauthorized dispensing while <strong>preserving 100% of audit and inventory history</strong>.
                  </p>
                </div>

                {/* Master Controlled / Restricted Substance Switch Card */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  formData.isControlled 
                    ? 'bg-purple-50/40 border-purple-300 shadow-sm ring-2 ring-purple-500/20' 
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">
                          Controlled / Restricted Substance Toggle
                        </span>
                        {formData.isControlled ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-600 text-white uppercase tracking-wider">
                            RESTRICTED ACTIVE
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 uppercase tracking-wider">
                            STANDARD OTC / NON-RESTRICTED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">
                        Designates this product as a schedule/narcotic drug subject to statutory DRAP Form-7 registers and controlled dispensing protocols.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.isControlled)}
                        onChange={(e) => handleToggleControlled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-6.5 after:transition-all peer-checked:bg-purple-600 shadow-inner"></div>
                    </label>
                  </div>
                </div>

                {/* Regulatory Details & Granular Visibility Switches */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Regulatory Classification Schedule */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Regulatory Schedule / Classification</label>
                      <select
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold text-slate-800"
                        value={formData.regulatorySchedule || 'Schedule D - Prescription Only Medicine (POM)'}
                        onChange={(e) => setFormData({ ...formData, regulatorySchedule: e.target.value })}
                      >
                        <option value="Schedule G - Controlled Narcotic / Psychotropic">Schedule G - Controlled Narcotic & Psychotropic (Form-7)</option>
                        <option value="Schedule D - Prescription Only Medicine (POM)">Schedule D - Prescription Only Medicine (POM)</option>
                        <option value="Form-7 Restricted Substance">Form-7 Restricted Substance</option>
                        <option value="Special Antibiotic Stewardship Restricted">Special Antibiotic Stewardship Restricted</option>
                        <option value="Cold-Chain Biological & Vaccine (2°C - 8°C)">Cold-Chain Biological & Vaccine (2°C - 8°C)</option>
                        <option value="Institutional / Hospital Supply Only">Institutional / Hospital Supply Only</option>
                      </select>
                    </div>

                    {/* Require Prescriber PMDC & CNIC validation */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Doctor PMDC & Patient CNIC Validation</label>
                      <select
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold text-slate-800"
                        value={formData.specialAccessRequired ? 'REQUIRED' : 'OPTIONAL'}
                        onChange={(e) => setFormData({ ...formData, specialAccessRequired: e.target.value === 'REQUIRED' })}
                      >
                        <option value="REQUIRED">Mandatory Prescriber PMDC & Patient CNIC</option>
                        <option value="OPTIONAL">Optional / Standard Verification</option>
                      </select>
                    </div>
                  </div>

                  {/* GRANULAR CHANNEL VISIBILITY TOGGLES SECTION */}
                  <div className="pt-2">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-slate-700" />
                      <span>Granular Channel Visibility Controls</span>
                    </h3>

                    <div className="space-y-3">
                      
                      {/* TOGGLE 1: NORMAL POS COUNTER */}
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-between gap-4 shadow-2xs">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg mt-0.5 ${formData.showInNormalPOS ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {formData.showInNormalPOS ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">Show in Normal POS Counter</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                formData.showInNormalPOS ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {formData.showInNormalPOS ? 'VISIBLE IN POS' : 'HIDDEN FROM POS'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {formData.showInNormalPOS 
                                ? 'Regular cashiers can select and bill this product during routine POS sales.'
                                : 'Hidden from regular POS. Can ONLY be billed via the authorized "Special Controlled Sale" module with PMDC audit log.'}
                            </p>
                          </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={Boolean(formData.showInNormalPOS)}
                            onChange={(e) => setFormData({ ...formData, showInNormalPOS: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>

                      {/* TOGGLE 2: NORMAL ITEM SEARCH */}
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-between gap-4 shadow-2xs">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg mt-0.5 ${formData.showInNormalSearch ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {formData.showInNormalSearch ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">Show in Normal Item Search</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                formData.showInNormalSearch ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {formData.showInNormalSearch ? 'SEARCHABLE' : 'HIDDEN FROM SEARCH'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {formData.showInNormalSearch
                                ? 'Item appears in global universal search, item dropdowns, and quick lookup dialogs.'
                                : 'Product is hidden from standard global search bars, preventing inadvertent selection by staff.'}
                            </p>
                          </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={Boolean(formData.showInNormalSearch)}
                            onChange={(e) => setFormData({ ...formData, showInNormalSearch: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>

                      {/* TOGGLE 3: ONLINE STORE */}
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-between gap-4 shadow-2xs">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg mt-0.5 ${formData.showInOnlineStore ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {formData.showInOnlineStore ? <ShoppingBag className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">Show in Online Customer Store</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                formData.showInOnlineStore ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {formData.showInOnlineStore ? 'ONLINE CATALOG VISIBLE' : 'HIDDEN FROM ONLINE STORE'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {formData.showInOnlineStore
                                ? 'Published to the public e-commerce store catalog for online customers to browse.'
                                : 'Completely hidden from public customer online store to strictly prevent unauthorized online checkout of restricted drugs.'}
                            </p>
                          </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={Boolean(formData.showInOnlineStore)}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              showInOnlineStore: e.target.checked,
                              showOnline: e.target.checked 
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>

                    </div>
                  </div>

                  {/* AUDIT & INVENTORY PRESERVATION GUARANTEE CARD */}
                  <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2 border border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-black text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Audit & Historical Record Preservation Guarantee</span>
                    </div>
                    <p className="text-[11.5px] text-slate-300 leading-relaxed">
                      Toggling visibility OFF for POS, Search, or Online Store will <strong>never delete, mutate, or hide</strong> past sales invoices, supplier purchase bills, batch stock logs, or DRAP Form-7 statutory registers. The item’s financial records and ledger traceability remain 100% intact and auditable.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab('PRICING')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back: Pricing</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('IMAGES')}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition active:scale-95"
                  >
                    <span>Next: Images & Media</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ================= TAB 4: IMAGES & GALLERY ================= */}
            {activeTab === 'IMAGES' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
                  <strong>Page 4 of 5: Product Media, Photos & Attachments</strong>
                  <p className="text-[11px] text-blue-700 mt-0.5">Attach high-resolution product photos. Images are used on POS receipts, stock cards, and the online catalog.</p>
                </div>

                {/* Primary Image Preview */}
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="w-32 h-32 rounded-xl bg-white border border-slate-300 flex items-center justify-center overflow-hidden shadow-inner shrink-0 bg-slate-100">
                    {formData.onlineImages && formData.onlineImages.length > 0 && formData.onlineImages[0] ? (
                      <img 
                        src={formData.onlineImages[0]} 
                        alt="Product Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80'; }}
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400 text-[11px] flex flex-col items-center gap-1">
                        <ImageIcon className="w-6 h-6 text-slate-300" />
                        <span>No Photo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3 w-full">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setImageInputMode('url')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                          imageInputMode === 'url' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-700'
                        }`}
                      >
                        Image URL Link
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageInputMode('file')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                          imageInputMode === 'file' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-700'
                        }`}
                      >
                        Upload Local Image File
                      </button>
                    </div>

                    {imageInputMode === 'url' ? (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Image Web URL</label>
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/photo-..."
                          value={formData.onlineImages?.[0] || ''}
                          className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono"
                          onChange={(e) => {
                            const val = e.target.value;
                            const imgs = [...(formData.onlineImages || [])];
                            imgs[0] = val;
                            setFormData({ ...formData, onlineImages: imgs });
                          }}
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Choose File from Computer / Phone</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Sample Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Or Pick a Standard Pharma Photo Preset</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { name: 'Surgical Pad', url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80' },
                      { name: 'Medical Syringe', url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=300&auto=format&fit=crop&q=80' },
                      { name: 'IV Infusion', url: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=300&auto=format&fit=crop&q=80' },
                      { name: 'Pharmacy Pills', url: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&auto=format&fit=crop&q=80' },
                    ].map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const imgs = [sample.url, ...(formData.onlineImages || [])];
                          setFormData({ ...formData, onlineImages: imgs });
                        }}
                        className="p-2 border border-slate-200 hover:border-blue-500 rounded-xl bg-slate-50 hover:bg-blue-50 flex flex-col items-center gap-1.5 transition-all cursor-pointer group"
                      >
                        <img src={sample.url} alt={sample.name} className="w-14 h-14 rounded-lg object-cover shadow-2xs group-hover:scale-105 transition-transform" />
                        <span className="text-[11px] font-bold text-slate-700">{sample.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab('CONTROLLED')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back: Controlled</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ONLINE_STORE')}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition active:scale-95"
                  >
                    <span>Next: Online Store</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ================= TAB 5: ONLINE STORE RATES ================= */}
            {activeTab === 'ONLINE_STORE' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                    <ShoppingBag className="w-4 h-4 text-emerald-700" />
                    <span>Page 5 of 5: Online Storefront Rates & E-Commerce Control</span>
                  </div>
                  <p className="text-emerald-800 leading-relaxed text-[11px]">
                    Configure dedicated online store retail pricing, promotional discounts, publishing status, and rich descriptions.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                  {/* Publish Toggle */}
                  <div className="sm:col-span-2 flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Publish on Customer Online Store</span>
                      <span className="text-[11px] text-slate-500">Enable customers to browse and purchase this item via your e-commerce storefront</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.showOnline ?? true)}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          showOnline: e.target.checked,
                          showInOnlineStore: e.target.checked 
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {/* Online Status */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Online Publishing Status</label>
                    <select
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                      value={formData.onlineStatus || 'Published'}
                      onChange={(e) => setFormData({ ...formData, onlineStatus: e.target.value as any })}
                    >
                      <option value="Published">Published (Active in Store)</option>
                      <option value="Draft">Draft (Hidden from Catalog)</option>
                      <option value="Hidden">Hidden</option>
                      <option value="Out of Stock">Mark Out of Stock Online</option>
                    </select>
                  </div>

                  {/* Online Price */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Online Store Price (Rs)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 190.00"
                      value={formData.onlinePrice ?? formData.sellingPrice ?? 0}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold font-mono text-emerald-700 bg-white"
                      onChange={(e) => setFormData({ ...formData, onlinePrice: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  {/* Compare at Price */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Compare-At / Strike-Through Price (Rs)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 250.00 (Crossed out)"
                      value={formData.compareAtPrice ?? 0}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono"
                      onChange={(e) => setFormData({ ...formData, compareAtPrice: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  {/* Online Category */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Online Store Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Medical Care & Emergency"
                      value={formData.onlineCategory || formData.category || ''}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      onChange={(e) => setFormData({ ...formData, onlineCategory: e.target.value })}
                    />
                  </div>

                  {/* Online Description */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">Online Promotional Rich Description</label>
                    <textarea
                      rows={2}
                      placeholder="Compelling promotional description for online buyers..."
                      value={formData.onlineDescription || ''}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      onChange={(e) => setFormData({ ...formData, onlineDescription: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab('IMAGES')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back: Images</span>
                  </button>
                  <button
                    type="submit"
                    form="add-edit-med-form"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2 transition active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update & Save Product Master' : 'Publish & Save New Product'}</span>
                  </button>
                </div>
              </div>
            )}

          </form>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              Active Page:
            </span>
            <span className="text-[11px] font-black uppercase text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-md">
              {activeTab}
            </span>
            {formData.isControlled && (
              <span className="text-[11px] font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                <span>Restricted</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-edit-med-form"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update Product' : 'Save Product'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Barcode Camera Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScanningBarcode}
        onClose={() => setIsScanningBarcode(false)}
        onScanSuccess={(scannedCode) => {
          setFormData((prev) => ({ ...prev, barcode: scannedCode }));
          setIsScanningBarcode(false);
          emitToast(`Barcode scanned: ${scannedCode}`, 'success');
        }}
        title="Scan Barcode for Product"
      />

    </div>
  );
};
