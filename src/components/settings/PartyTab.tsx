import React, { useState } from 'react';
import { 
  Users, Info, ChevronRight, CheckCircle2, MessageSquare, 
  MapPin, ShieldAlert, Award, Layers, X, Sparkles 
} from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

export const PartyTab: React.FC = () => {
  const { settings, updateParty } = useSettings();

  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const partyConf = settings.party;

  const handleFieldChange = (id: string, updates: Partial<(typeof partyConf.additionalFields)[0]>) => {
    updateParty({
      additionalFields: partyConf.additionalFields.map(f => f.id === id ? { ...f, ...updates } : f)
    });
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

      {/* 2 Column Grid matching Screenshot 9 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Party Settings */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-xs tracking-wider uppercase text-slate-500 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Party Settings</span>
            </h3>
            <span className="text-[10px] text-blue-600 font-normal">Customer & Supplier Rules</span>
          </div>

          <div className="space-y-3.5">
            {/* Party Grouping */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={partyConf.partyGrouping}
                  onChange={(e) => updateParty({ partyGrouping: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">Party Grouping</span>
              </label>
              <span title="Classify parties into Retailers, Wholesalers, Distributors, Hospitals, Clinics"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

            {/* Shipping Address */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={partyConf.shippingAddress}
                  onChange={(e) => updateParty({ shippingAddress: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">Shipping Address</span>
              </label>
              <span title="Maintain separate billing and shipping destination addresses"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

            {/* Enable Payment Reminder */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={partyConf.enablePaymentReminder}
                    onChange={(e) => updateParty({ enablePaymentReminder: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-800">Enable Payment Reminder</span>
                </label>
                <span title="Automated WhatsApp and SMS payment reminders for overdue balances"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>

              {partyConf.enablePaymentReminder && (
                <div className="pl-6 space-y-2 text-xs border-l-2 border-blue-100 ml-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Remind me for payment due in:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={partyConf.reminderDays}
                        onChange={(e) => updateParty({ reminderDays: Number(e.target.value) })}
                        className="w-14 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800"
                      />
                      <span className="text-slate-500">day(s)</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsReminderModalOpen(true)}
                    className="text-[11.5px] text-blue-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <span>Reminder Message Template & Tags</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Credit Limit Warning */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={partyConf.creditLimitWarning}
                  onChange={(e) => updateParty({ creditLimitWarning: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">Credit Limit Warning & Billing Alert</span>
              </label>
              <span title="Alerts cashier if party exceeds their assigned credit limit"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

            {/* Loyalty Points System */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={partyConf.loyaltyPoints}
                  onChange={(e) => updateParty({ loyaltyPoints: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">Loyalty Points & Rewards Program</span>
              </label>
              <span title="Accumulate redeemable reward points per purchase"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

          </div>
        </div>

        {/* Right Column: Additional fields matching Screenshot 9 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-xs tracking-wider uppercase text-slate-500 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Additional Fields for Parties</span>
            </h3>
            <span className="text-[10px] text-blue-600 font-normal">Custom Metadata</span>
          </div>

          <p className="text-xs text-slate-500">
            Customize extra data fields collected for each customer / supplier and toggle print visibility on invoices.
          </p>

          <div className="space-y-3">
            {partyConf.additionalFields.map((field, idx) => (
              <div key={field.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.enabled}
                      onChange={(e) => handleFieldChange(field.id, { enabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>Additional Field {idx + 1}</span>
                  </label>

                  {/* Show in print toggle switch */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-[11px] font-semibold text-slate-600">Show In Print:</span>
                    <input
                      type="checkbox"
                      checked={field.showInPrint}
                      onChange={(e) => handleFieldChange(field.id, { showInPrint: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>
                </div>

                {field.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => handleFieldChange(field.id, { name: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    {field.type === 'date' && (
                      <select className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                        <option value="dd/mm/yy">dd/mm/yy</option>
                        <option value="mm/yy">mm/yy</option>
                        <option value="yyyy-mm-dd">yyyy-mm-dd</option>
                      </select>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* Reminder Message Modal */}
      {isReminderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <span>Payment Reminder Message Template</span>
              </h3>
              <button onClick={() => setIsReminderModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              This message will be automatically prepared for 1-click WhatsApp or SMS transmission. Use tags below to dynamically insert invoice values:
            </p>

            <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
              {['{party_name}', '{due_amount}', '{due_date}', '{firm_name}'].map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold">
                  {tag}
                </span>
              ))}
            </div>

            <textarea
              rows={4}
              value={partyConf.reminderMessage}
              onChange={(e) => updateParty({ reminderMessage: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsReminderModalOpen(false);
                  showToast('Reminder message template saved');
                }}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
