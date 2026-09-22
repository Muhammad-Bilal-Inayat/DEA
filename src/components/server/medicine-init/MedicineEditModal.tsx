import React, { useState, useEffect } from 'react';
import { CentralMedicine } from '../../../types';
import { X, Save, Pill, Building2, Tag, Layers, Check } from 'lucide-react';

interface MedicineEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<CentralMedicine> & { name: string; category: string }) => void;
  initialData?: CentralMedicine | null;
  existingCategories: string[];
}

export const MedicineEditModal: React.FC<MedicineEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingCategories
}) => {
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState('General Pharmacy');
  const [customCategory, setCustomCategory] = useState('');
  const [dosageForm, setDosageForm] = useState('Tablet');
  const [strength, setStrength] = useState('');
  const [unit, setUnit] = useState('Strip');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setBrandName(initialData.brandName || '');
      setGenericName(initialData.genericName || '');
      setCompany(initialData.company || '');
      setCategory(initialData.category || 'General Pharmacy');
      setDosageForm(initialData.dosageForm || 'Tablet');
      setStrength(initialData.strength || '');
      setUnit(initialData.unit || 'Strip');
    } else {
      setName('');
      setBrandName('');
      setGenericName('');
      setCompany('');
      setCategory(existingCategories[0] || 'General Pharmacy');
      setCustomCategory('');
      setDosageForm('Tablet');
      setStrength('');
      setUnit('Strip');
    }
  }, [initialData, isOpen, existingCategories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter medicine name.');
      return;
    }

    const finalCategory = category === '__NEW__' ? customCategory.trim() : category.trim();
    if (!finalCategory) {
      alert('Please select or specify a category.');
      return;
    }

    onSave({
      id: initialData?.id,
      name: name.trim(),
      brandName: brandName.trim() || undefined,
      genericName: genericName.trim() || undefined,
      company: company.trim() || undefined,
      category: finalCategory,
      dosageForm,
      strength: strength.trim() || undefined,
      unit,
      source: initialData?.source || 'MASTER_MANUAL'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {initialData ? 'Edit Central Medicine' : 'Add Central Medicine'}
              </h3>
              <p className="text-xs text-slate-400">
                Centralized /server master medicine catalog record
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Item / Medicine Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Panadol 500mg, Bone Rongeurs, Ciproxin"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Brand / Product Name</label>
              <input
                type="text"
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                placeholder="e.g. Panadol, Endo Tech, Augmentin"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Company / Manufacturer</label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="e.g. GSK, Abbott, Getz Pharma, BBraze"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Generic Formula / Salt</label>
              <input
                type="text"
                value={genericName}
                onChange={e => setGenericName(e.target.value)}
                placeholder="e.g. Paracetamol, Ciprofloxacin"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Strength / Spec</label>
              <input
                type="text"
                value={strength}
                onChange={e => setStrength(e.target.value)}
                placeholder="e.g. 500mg, 1g, 4.5mm x 30mm"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Category <span className="text-rose-400">*</span></label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                {existingCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__NEW__">+ Create New Category...</option>
              </select>
            </div>

            {category === '__NEW__' ? (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">New Category Name <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  placeholder="e.g. Spinal Implants, ENT Instruments"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Dosage Form / Packaging</label>
                <select
                  value={dosageForm}
                  onChange={e => setDosageForm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup">Syrup / Suspension</option>
                  <option value="Injection">Injection / Vial</option>
                  <option value="Cream">Cream / Ointment</option>
                  <option value="Drops">Eye / Ear Drops</option>
                  <option value="Inhaler">Inhaler / Spray</option>
                  <option value="Instrument">Surgical Instrument</option>
                  <option value="Implant">Orthopedic Implant</option>
                  <option value="Consumable">Consumable / Support</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Unit of Measure</label>
            <select
              value={unit}
              onChange={e => setUnit(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="Strip">Strip</option>
              <option value="Box">Box</option>
              <option value="Bottle">Bottle</option>
              <option value="Vial">Vial / Ampoule</option>
              <option value="Piece">Piece / Set</option>
              <option value="Tube">Tube</option>
              <option value="Pack">Pack</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg text-sm shadow-md shadow-sky-600/20 transition-colors"
            >
              <Save className="w-4 h-4" />
              {initialData ? 'Update Record' : 'Save to Central Database'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
