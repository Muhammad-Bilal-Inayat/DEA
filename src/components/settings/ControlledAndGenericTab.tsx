import React from 'react';
import { 
  ShieldAlert, Sparkles, Pill, Search, Lock, 
  FileText, CheckCircle2, AlertTriangle, Eye, EyeOff, 
  Printer, Layers, ShieldCheck, ToggleLeft, ToggleRight, Check, X
} from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

export const ControlledAndGenericTab: React.FC = () => {
  const { settings, updateControlledAndGeneric } = useSettings();

  const config = settings.controlledAndGeneric || {
    masterEnabled: true,
    genericSystemEnabled: true,
    genericSearchEnabled: true,
    showAllBrandsByGeneric: true,
    controlledItemsEnabled: true,
    hideControlledFromNormalPOS: true,
    hideControlledFromNormalSearch: true,
    specialControlledSaleEnabled: true,
    controlledSaleAuthRequired: true,
    controlledPrescriptionRequired: true,
    controlledRegisterReportEnabled: true,
    form7PrintTemplateEnabled: true,
    controlledInvoicePrintEnabled: true,
    controlledReprintEnabled: true,
    controlledOnlineSaleAllowed: false,
  };

  const handleToggle = (key: keyof typeof config) => {
    updateControlledAndGeneric({ [key]: !config[key] });
  };

  const handleToggleAll = (enable: boolean) => {
    updateControlledAndGeneric({
      masterEnabled: enable,
      genericSystemEnabled: enable,
      genericSearchEnabled: enable,
      showAllBrandsByGeneric: enable,
      controlledItemsEnabled: enable,
      hideControlledFromNormalPOS: enable,
      hideControlledFromNormalSearch: enable,
      specialControlledSaleEnabled: enable,
      controlledSaleAuthRequired: enable,
      controlledPrescriptionRequired: enable,
      controlledRegisterReportEnabled: enable,
      form7PrintTemplateEnabled: enable,
      controlledInvoicePrintEnabled: enable,
      controlledReprintEnabled: enable,
      controlledOnlineSaleAllowed: false, // Security default
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in select-none">
      
      {/* Master Switch Banner */}
      <div className={`p-5 rounded-2xl border transition-all shadow-sm ${
        config.masterEnabled 
          ? 'bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white border-purple-700/50'
          : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              config.masterEnabled ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">
                  Controlled Substances & Generic Master Suite
                </h2>
                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md ${
                  config.masterEnabled ? 'bg-purple-500/30 text-purple-200 border border-purple-400/40' : 'bg-slate-200 text-slate-600'
                }`}>
                  {config.masterEnabled ? 'System Active' : 'Disabled'}
                </span>
              </div>
              <p className={`text-xs mt-1 leading-relaxed max-w-2xl ${
                config.masterEnabled ? 'text-purple-200/80' : 'text-slate-500'
              }`}>
                Master control center for DRAP / Regulatory Drug Laws, Schedule G / Controlled narcotics compliance, Form-7 register, Generic/Salt linkage, and special PIN-authorized billing workflows.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => handleToggleAll(false)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-700/40 hover:bg-slate-700/60 text-slate-200 border border-slate-600/50 transition cursor-pointer"
            >
              Turn All OFF
            </button>
            <button
              type="button"
              onClick={() => handleToggleAll(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md transition cursor-pointer"
            >
              Turn All ON
            </button>
          </div>
        </div>
      </div>

      {/* Module 1: Generic / Salt Master Entity & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Module 1: Generic / Salt Master & Multi-Brand Discovery
              </h3>
              <p className="text-[11px] text-slate-500">Manage chemical active formulations and intelligent substitute discovery</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('genericSystemEnabled')}
            className={`text-xs font-bold px-3 py-1 rounded-lg transition border ${
              config.genericSystemEnabled 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {config.genericSystemEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="p-5 divide-y divide-slate-100 space-y-4">
          
          {/* Sub-feature 1.1 */}
          <div className="flex items-center justify-between pt-2 first:pt-0">
            <div className="pr-4">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Generic / Salt Master Classification Entity</span>
                <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">Core Master</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Enables dedicated Generic/Salt master catalog with synonyms, therapeutic classes, default dosage forms, and DRAP approved classification.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.genericSystemEnabled}
              onChange={() => handleToggle('genericSystemEnabled')}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* Sub-feature 1.2 */}
          <div className="flex items-center justify-between pt-4">
            <div className="pr-4">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-600" />
                <span>Search by Generic / Chemical Salt Name in Billing & Inventory</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Allows cashiers and pharmacists to type chemical names (e.g. &apos;Paracetamol&apos;, &apos;Amoxicillin&apos;) in search boxes to instantly surface all brand formulations.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.genericSearchEnabled}
              onChange={() => handleToggle('genericSearchEnabled')}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* Sub-feature 1.3 */}
          <div className="flex items-center justify-between pt-4">
            <div className="pr-4">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Grouped Multi-Brand & Manufacturer Inventory Matrix</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                When searching a generic, presents an intelligent grouped breakdown displaying all linked commercial brands, manufacturers, pack sizes, and available stock levels.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.showAllBrandsByGeneric}
              onChange={() => handleToggle('showAllBrandsByGeneric')}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
          </div>

        </div>
      </div>

      {/* Module 2: Controlled Substances, Narcotics & Visibility Rules */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-200">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Module 2: Controlled / Restricted Item Rules & Visibility
              </h3>
              <p className="text-[11px] text-slate-500">Security flags, hiding rules, and special restricted sales channels</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('controlledItemsEnabled')}
            className={`text-xs font-bold px-3 py-1 rounded-lg transition border ${
              config.controlledItemsEnabled 
                ? 'bg-purple-50 text-purple-700 border-purple-200' 
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {config.controlledItemsEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="p-5 divide-y divide-slate-100 space-y-4">
          
          {/* Sub-feature 2.1 */}
          <div className="flex items-center justify-between pt-2 first:pt-0">
            <div className="pr-4">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Controlled / Restricted Product Classification Flag (ON/OFF)</span>
                <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">Product Master</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Enables the regulatory Controlled item switch inside product creation, edit, and bulk master modals.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.controlledItemsEnabled}
              onChange={() => handleToggle('controlledItemsEnabled')}
              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
            />
          </div>

          {/* Sub-feature 2.2 */}
          <div className="flex items-center justify-between pt-4">
            <div className="pr-4">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                <span>Hide Controlled Drugs from Standard POS / Billing Screen</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Prevents accidental OTC over-the-counter sale of restricted items. These products will not show up in regular cashier billing autocomplete.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.hideControlledFromNormalPOS}
              onChange={() => handleToggle('hideControlledFromNormalPOS')}
              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
            />
          </div>

          {/* Sub-feature 2.3 */}
          <div className="flex items-center justify-between pt-4">
            <div className="pr-4">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                <span>Hide Controlled Drugs from General Catalog Search</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Restricts viewing of narcotic inventories from unauthorized general searches, preserving batch traceability and audit confidentiality.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.hideControlledFromNormalSearch}
              onChange={() => handleToggle('hideControlledFromNormalSearch')}
              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
            />
          </div>

          {/* Sub-feature 2.4 */}
          <div className="flex items-center justify-between pt-4">
            <div className="pr-4">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Special Controlled Sale Action Button in POS / Billing</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Enables the dedicated &apos;Controlled Sale&apos; regulatory mode for capturing prescriber PMDC, patient CNIC, dosage, and Form-7 data.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.specialControlledSaleEnabled}
              onChange={() => handleToggle('specialControlledSaleEnabled')}
              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
            />
          </div>

          {/* Sub-feature 2.5 */}
          <div className="flex items-center justify-between pt-4">
            <div className="pr-4">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-red-600" />
                <span>Mandatory Pharmacist PIN / Security Authorization</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Requires entering the authorized Pharmacist or Admin security PIN before completing any restricted sale transaction.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.controlledSaleAuthRequired}
              onChange={() => handleToggle('controlledSaleAuthRequired')}
              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
            />
          </div>

          {/* Sub-feature 2.6 */}
          <div className="flex items-center justify-between pt-4">
            <div className="pr-4">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Mandatory Patient CNIC & Doctor PMDC Number Validation</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Enforces strict validation on patient CNIC, doctor registration number, and prescription serial before saving.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.controlledPrescriptionRequired}
              onChange={() => handleToggle('controlledPrescriptionRequired')}
              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
            />
          </div>

        </div>
      </div>

      {/* Module 3: Form-7 Register & Regulatory Audit Reporting */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Module 3: Controlled Items Register & Audit Reporting
              </h3>
              <p className="text-[11px] text-slate-500">Government inspection audit reports, returns, adjustments and Form-7 prints</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('controlledRegisterReportEnabled')}
            className={`text-xs font-bold px-3 py-1 rounded-lg transition border ${
              config.controlledRegisterReportEnabled 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {config.controlledRegisterReportEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="p-5 divide-y divide-slate-100 space-y-4">
          
          {/* Sub-feature 3.1 */}
          <div className="flex items-center justify-between pt-2 first:pt-0">
            <div className="pr-4">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>&apos;Controlled Items Register&apos; Report in Reports Module</span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Audit Ready</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Displays a dedicated regulatory report in the Reports dashboard with multi-criteria filtering by date range, generic/salt, pharmacist user, and patient.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.controlledRegisterReportEnabled}
              onChange={() => handleToggle('controlledRegisterReportEnabled')}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          {/* Sub-feature 3.2 */}
          <div className="flex items-center justify-between pt-4">
            <div className="pr-4">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>Form-7 / Form-8 Official Regulatory Print Format</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Includes specialized print templates with Drug Inspector / Pharmacist signature blocks and patient identification headers.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.form7PrintTemplateEnabled}
              onChange={() => handleToggle('form7PrintTemplateEnabled')}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          {/* Sub-feature 3.3 */}
          <div className="flex items-center justify-between pt-4">
            <div className="pr-4">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                <span>Prohibit Online / Remote Delivery for Controlled Items</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Enforces compliance by blocking restricted medicines from being added to online cart orders without physical prescription presentation.
              </p>
            </div>
            <input
              type="checkbox"
              checked={!config.controlledOnlineSaleAllowed}
              onChange={() => updateControlledAndGeneric({ controlledOnlineSaleAllowed: !config.controlledOnlineSaleAllowed })}
              className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
            />
          </div>

        </div>
      </div>

    </div>
  );
};
