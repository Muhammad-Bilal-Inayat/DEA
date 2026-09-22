import React, { useState } from 'react';
import { 
  X, Check, AlertTriangle, Users, DollarSign, 
  MapPin, Calendar, Trash2, ArrowRight, CheckCircle2 
} from 'lucide-react';
import { Party } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { emitToast } from '../../contexts/ToastContext';
import { dbSuppliers, dbAuditLogs, dbUserActivities } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';

interface BulkEditPartiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedParties: Party[];
  onSuccess?: () => void;
  onUpdated?: () => void;
}

type TabType = 'paymentTerms' | 'creditLimit' | 'cityArea' | 'partyType' | 'delete';

export const BulkEditPartiesModal: React.FC<BulkEditPartiesModalProps> = ({
  isOpen,
  onClose,
  selectedParties,
  onSuccess,
  onUpdated,
}) => {
  const { activeUser, activeRole } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('paymentTerms');
  const [isConfirmStep, setIsConfirmStep] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Payment terms
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 30');
  const [creditPeriodDays, setCreditPeriodDays] = useState<number>(30);

  // Credit Limit
  const [creditLimitMode, setCreditLimitMode] = useState<'PERCENT_INCREASE' | 'PERCENT_DECREASE' | 'SET_FIXED'>('SET_FIXED');
  const [creditLimitValue, setCreditLimitValue] = useState<number>(50000);

  // City & Area
  const [city, setCity] = useState<string>('');
  const [stateRegion, setStateRegion] = useState<string>('');

  // Party Type
  const [partyType, setPartyType] = useState<'Customer' | 'Supplier'>('Customer');
  const [categoryTag, setCategoryTag] = useState<string>('');

  // Delete
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  if (!isOpen) return null;

  const count = selectedParties.length;

  const handleApplyChanges = async () => {
    if (count === 0) return;
    setIsApplying(true);

    try {
      const timestamp = new Date().toISOString();
      const userName = activeUser?.name || 'Authorized Admin';

      if (activeTab === 'delete') {
        if (deleteConfirmText.toLowerCase() !== 'delete') {
          emitToast('Please type "DELETE" to confirm batch deletion', 'error');
          setIsApplying(false);
          return;
        }

        for (const party of selectedParties) {
          await dbSuppliers.delete(party.id);
        }

        await dbAuditLogs.save({
          id: 'audit_' + Date.now(),
          action: 'DELETE',
          module: 'PARTIES',
          details: `Batch deleted ${count} customer/supplier parties`,
          user: userName,
          timestamp
        } as any);

        emitToast(`Successfully deleted ${count} parties`, 'success');
        if (onSuccess) onSuccess();
        if (onUpdated) onUpdated();
        onClose();
        return;
      }

      for (const party of selectedParties) {
        const partyCopy: Party = { ...party, updatedAt: timestamp };

        if (activeTab === 'paymentTerms') {
          partyCopy.paymentTerms = paymentTerms;
          partyCopy.creditPeriod = creditPeriodDays;
        } 
        else if (activeTab === 'creditLimit') {
          let curLimit = partyCopy.creditLimit || 0;
          if (creditLimitMode === 'PERCENT_INCREASE' && creditLimitValue > 0) {
            curLimit = Math.round(curLimit * (1 + creditLimitValue / 100));
          } else if (creditLimitMode === 'PERCENT_DECREASE' && creditLimitValue > 0) {
            curLimit = Math.max(0, Math.round(curLimit * (1 - creditLimitValue / 100)));
          } else if (creditLimitMode === 'SET_FIXED') {
            curLimit = creditLimitValue;
          }
          partyCopy.creditLimit = curLimit;
        }
        else if (activeTab === 'cityArea') {
          if (city.trim()) partyCopy.city = city.trim();
          if (stateRegion.trim()) partyCopy.state = stateRegion.trim();
        }
        else if (activeTab === 'partyType') {
          partyCopy.partyType = partyType;
          partyCopy.type = partyType;
          if (categoryTag.trim()) partyCopy.category = categoryTag.trim();
        }

        await dbSuppliers.save(partyCopy);
      }

      await dbAuditLogs.save({
        id: 'audit_' + Date.now(),
        action: 'UPDATE',
        module: 'PARTIES_BULK',
        details: `Bulk updated ${count} parties in mode: ${activeTab.toUpperCase()}`,
        user: userName,
        timestamp
      } as any);

      await dbUserActivities.save({
        id: 'act_' + Date.now(),
        userName,
        userRole: activeRole,
        details: `Batch edited ${count} customer/party records (${activeTab})`,
        timestamp: Date.now()
      } as any);

      emitToast(`Batch update applied to ${count} parties successfully`, 'success');
      if (onSuccess) onSuccess();
      if (onUpdated) onUpdated();
      onClose();
    } catch (e: any) {
      console.error('Bulk party edit error:', e);
      emitToast(e?.message || 'Failed to apply bulk party update', 'error');
    } finally {
      setIsApplying(false);
      setIsConfirmStep(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Bulk Party & Customer Editor
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 font-semibold">
                  {count} selected
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Batch modify credit limits, payment terms, location, or party types.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        {!isConfirmStep && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto text-xs font-semibold">
            {[
              { id: 'paymentTerms', label: 'Payment Terms', icon: Calendar },
              { id: 'creditLimit', label: 'Credit Limit', icon: DollarSign },
              { id: 'cityArea', label: 'City & Region', icon: MapPin },
              { id: 'partyType', label: 'Party Type / Tag', icon: Users },
              { id: 'delete', label: 'Batch Delete', icon: Trash2, danger: true },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition ${
                    isActive
                      ? tab.danger 
                        ? 'border-red-600 text-red-600 bg-red-50/50 dark:bg-red-950/20'
                        : 'border-purple-600 text-purple-600 bg-purple-50/50 dark:bg-purple-950/20'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">
          {!isConfirmStep ? (
            <>
              {/* Payment Terms Tab */}
              {activeTab === 'paymentTerms' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Standard Payment Terms
                    </label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPaymentTerms(val);
                        if (val === 'Due on Receipt') setCreditPeriodDays(0);
                        else if (val === 'Net 7') setCreditPeriodDays(7);
                        else if (val === 'Net 15') setCreditPeriodDays(15);
                        else if (val === 'Net 30') setCreditPeriodDays(30);
                        else if (val === 'Net 60') setCreditPeriodDays(60);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-hidden"
                    >
                      <option value="Due on Receipt">Due on Receipt (Cash / Instant)</option>
                      <option value="Net 7">Net 7 Days</option>
                      <option value="Net 15">Net 15 Days</option>
                      <option value="Net 30">Net 30 Days (Standard)</option>
                      <option value="Net 60">Net 60 Days</option>
                      <option value="Custom">Custom Days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Credit Period (Days)
                    </label>
                    <input
                      type="number"
                      value={creditPeriodDays}
                      onChange={(e) => setCreditPeriodDays(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Credit Limit Tab */}
              {activeTab === 'creditLimit' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'SET_FIXED', label: 'Set Fixed Limit (PKR)' },
                      { id: 'PERCENT_INCREASE', label: 'Increase Limit (%)' },
                      { id: 'PERCENT_DECREASE', label: 'Decrease Limit (%)' },
                    ].map(opt => (
                      <label 
                        key={opt.id} 
                        className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                          creditLimitMode === opt.id 
                            ? 'border-purple-600 bg-purple-50/40 dark:bg-purple-950/20 ring-1 ring-purple-600' 
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="creditLimitMode" 
                            checked={creditLimitMode === opt.id} 
                            onChange={() => setCreditLimitMode(opt.id as any)}
                            className="text-purple-600" 
                          />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{opt.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {creditLimitMode.includes('PERCENT') ? 'Percentage Adjustment (%)' : 'Credit Limit Amount (Rs.)'}
                    </label>
                    <input
                      type="number"
                      value={creditLimitValue || ''}
                      onChange={(e) => setCreditLimitValue(parseFloat(e.target.value) || 0)}
                      placeholder={creditLimitMode.includes('PERCENT') ? 'e.g. 20' : 'e.g. 100000'}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-hidden font-mono"
                    />
                  </div>
                </div>
              )}

              {/* City & Region Tab */}
              {activeTab === 'cityArea' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      City / Station
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Lahore, Faisalabad"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      State / Province / Route
                    </label>
                    <input
                      type="text"
                      value={stateRegion}
                      onChange={(e) => setStateRegion(e.target.value)}
                      placeholder="e.g. Punjab - GT Road Route"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Party Type / Tag Tab */}
              {activeTab === 'partyType' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Target Party Type
                    </label>
                    <select
                      value={partyType}
                      onChange={(e) => setPartyType(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-hidden"
                    >
                      <option value="Customer">Customer (Debtor / Client)</option>
                      <option value="Supplier">Supplier (Creditor / Vendor)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Party Category / Tag
                    </label>
                    <input
                      type="text"
                      value={categoryTag}
                      onChange={(e) => setCategoryTag(e.target.value)}
                      placeholder="e.g. Wholesale Pharmacy, Hospital, Retailer"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Batch Delete Tab */}
              {activeTab === 'delete' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-xs text-red-900 dark:text-red-300 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
                    <div>
                      <strong className="font-bold text-sm block mb-1">Permanent Party Deletion Warning</strong>
                      You are about to permanently delete <span className="font-bold underline">{count} customer/supplier records</span>.
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Type <span className="text-red-600 font-mono font-bold">DELETE</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="w-full px-4 py-2.5 rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 outline-hidden font-mono"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Confirmation Step */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-purple-600 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-purple-950 dark:text-purple-200">
                    Ready to apply changes to {count} selected parties
                  </div>
                  <div className="text-xs text-purple-800 dark:text-purple-300">
                    Operation: <span className="font-bold uppercase">{activeTab}</span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <tr>
                      <th className="py-2 px-3">Party Name</th>
                      <th className="py-2 px-3">Phone</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Current Credit Limit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {selectedParties.slice(0, 10).map(p => (
                      <tr key={p.id}>
                        <td className="py-1.5 px-3 font-medium text-slate-900 dark:text-white">{p.name}</td>
                        <td className="py-1.5 px-3 text-slate-500">{p.phone || '-'}</td>
                        <td className="py-1.5 px-3">{p.type}</td>
                        <td className="py-1.5 px-3 font-mono">{formatCurrency(p.creditLimit || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selectedParties.length > 10 && (
                  <div className="py-2 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    + {selectedParties.length - 10} more parties...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={() => {
              if (isConfirmStep) {
                setIsConfirmStep(false);
              } else {
                onClose();
              }
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            {isConfirmStep ? 'Back to Options' : 'Cancel'}
          </button>

          {!isConfirmStep ? (
            <button
              type="button"
              onClick={() => setIsConfirmStep(true)}
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition shadow-md shadow-purple-500/20 flex items-center gap-2"
            >
              Review & Proceed
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isApplying}
              onClick={handleApplyChanges}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition shadow-md flex items-center gap-2 ${
                activeTab === 'delete'
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
              } disabled:opacity-50`}
            >
              {isApplying ? (
                <>Applying changes...</>
              ) : activeTab === 'delete' ? (
                <>Confirm Delete ({count} Parties)</>
              ) : (
                <>Confirm & Apply ({count} Parties)</>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
