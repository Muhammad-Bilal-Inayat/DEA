import React, { useState } from 'react';
import { 
  Plus, Edit2, Trash2, CheckCircle2, ShieldCheck, 
  Info, Percent, Layers, X, Sparkles 
} from 'lucide-react';
import { useSettings, TaxRateItem, TaxGroupItem } from '../../contexts/SettingsContext';

export const TaxesTab: React.FC = () => {
  const { settings, updateTaxes, addTaxRate, deleteTaxRate, addTaxGroup, deleteTaxGroup } = useSettings();

  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const [rateForm, setRateForm] = useState<{
    name: string;
    rate: number;
    type: 'GST' | 'IGST' | 'VAT' | 'WHT' | 'Cess';
    isDefault: boolean;
  }>({
    name: '',
    rate: 18,
    type: 'GST',
    isDefault: false,
  });

  const [groupForm, setGroupForm] = useState<{
    name: string;
    rate: number;
    subTaxes: string;
    description: string;
  }>({
    name: '',
    rate: 18,
    subTaxes: 'CGST 9%, SGST 9%',
    description: '',
  });

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateForm.name.trim()) return;
    addTaxRate(rateForm);
    setIsRateModalOpen(false);
    showToast(`Tax Rate "${rateForm.name}" added successfully`);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name.trim()) return;
    addTaxGroup({
      name: groupForm.name,
      rate: Number(groupForm.rate),
      subTaxes: groupForm.subTaxes.split(',').map(s => s.trim()).filter(Boolean),
      description: groupForm.description,
    });
    setIsGroupModalOpen(false);
    showToast(`Tax Group "${groupForm.name}" added successfully`);
  };

  const handleSetDefaultRate = (id: string) => {
    updateTaxes({
      taxRates: settings.taxes.taxRates.map(r => ({
        ...r,
        isDefault: r.id === id,
      })),
    });
    showToast('Default tax rate updated');
  };

  return (
    <div className="space-y-6 text-slate-800 text-[13px] relative">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Action Bar matching Screenshot 7 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base">GST / VAT & Tax Rates Configuration</h3>
          <p className="text-xs text-slate-500">Configure single tax rates, multi-tax splits, and RCM compliance</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRateForm({ name: '', rate: 18, type: 'GST', isDefault: false });
              setIsRateModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tax Rates (+)</span>
          </button>

          <button
            onClick={() => {
              setGroupForm({ name: '', rate: 18, subTaxes: 'CGST 9%, SGST 9%', description: '' });
              setIsGroupModalOpen(true);
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tax Group (+)</span>
          </button>
        </div>
      </div>

      {/* 2-Column Tables: Tax Rates on Left | Tax Groups & Rules on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Tax Rates Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-blue-600" />
              <span>Standard Tax Rates</span>
            </h4>
            <span className="text-[11px] text-blue-600 font-semibold">
              {settings.taxes.taxRates.length} Rates Configured
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Tax Name</th>
                  <th className="p-3 text-right">Rate (%)</th>
                  <th className="p-3 text-center">Type</th>
                  <th className="p-3 text-center">Default</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {settings.taxes.taxRates.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">{t.name}</td>
                    <td className="p-3 text-right font-bold text-slate-800">{t.rate}%</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {t.type}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {t.isDefault ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          DEFAULT
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefaultRate(t.id)}
                          className="text-[10px] text-blue-600 hover:underline"
                        >
                          Set
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Delete tax rate "${t.name}"?`)) {
                            deleteTaxRate(t.id);
                            showToast('Tax rate deleted');
                          }
                        }}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Tax Groups & Compliance */}
        <div className="space-y-6">
          
          {/* Tax Groups Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Combined Tax Groups</span>
              </h4>
              <span className="text-[11px] text-blue-600 font-semibold">
                {settings.taxes.taxGroups.length} Groups
              </span>
            </div>

            <div className="space-y-2.5">
              {settings.taxes.taxGroups.map((group) => (
                <div key={group.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{group.name}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-black rounded-md text-[10px]">
                        {group.rate}%
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {group.subTaxes.map((sub, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600 font-medium">
                          {sub}
                        </span>
                      ))}
                    </div>
                    {group.description && (
                      <p className="text-[11px] text-slate-500">{group.description}</p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Delete group "${group.name}"?`)) {
                        deleteTaxGroup(group.id);
                        showToast('Tax group deleted');
                      }
                    }}
                    className="text-rose-500 hover:text-rose-700 p-1 flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance & Rules Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
              Tax Rules & Compliance
            </h4>

            <div className="space-y-2.5 text-xs">
              <label className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-800 block">Reverse Charge Mechanism (RCM)</span>
                  <span className="text-[11px] text-slate-500">For unregistered vendor purchases where recipient pays tax</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.taxes.enableRcm}
                  onChange={(e) => updateTaxes({ enableRcm: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-800 block">Composite Tax Scheme</span>
                  <span className="text-[11px] text-slate-500">Single flat turnover tax rate for small eligible businesses</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.taxes.compositeScheme}
                  onChange={(e) => updateTaxes({ compositeScheme: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-800 block">TCS / TDS Withholding Tax</span>
                  <span className="text-[11px] text-slate-500">Auto-deduct advance tax on high volume transactions</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.taxes.enableTcsTds}
                  onChange={(e) => updateTaxes({ enableTcsTds: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </label>
            </div>
          </div>

        </div>

      </div>

      {/* Add Tax Rate Modal */}
      {isRateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add Tax Rate</h3>
              <button onClick={() => setIsRateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tax Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Tax 18% or WHT 4.5%"
                  value={rateForm.name}
                  onChange={(e) => setRateForm({ ...rateForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tax Rate (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={rateForm.rate}
                    onChange={(e) => setRateForm({ ...rateForm, rate: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tax Category</label>
                  <select
                    value={rateForm.type}
                    onChange={(e: any) => setRateForm({ ...rateForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="GST">GST</option>
                    <option value="IGST">IGST</option>
                    <option value="VAT">VAT</option>
                    <option value="WHT">WHT</option>
                    <option value="Cess">Cess</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={rateForm.isDefault}
                  onChange={(e) => setRateForm({ ...rateForm, isDefault: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="font-medium text-slate-800">Set as default rate for new items</span>
              </label>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                >
                  Add Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Tax Group Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add Combined Tax Group</h3>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Group Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GST 18% (CGST 9% + SGST 9%)"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Total Effective Rate (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={groupForm.rate}
                  onChange={(e) => setGroupForm({ ...groupForm, rate: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Sub Taxes (comma separated) *</label>
                <input
                  type="text"
                  required
                  placeholder="CGST 9%, SGST 9%"
                  value={groupForm.subTaxes}
                  onChange={(e) => setGroupForm({ ...groupForm, subTaxes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Intra-state split tax"
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                >
                  Save Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
