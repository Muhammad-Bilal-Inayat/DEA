import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Users, Phone, Mail, MapPin, Building2, 
  CreditCard, TrendingUp, TrendingDown, DollarSign, 
  Calendar, FileText, CheckCircle2, AlertTriangle, 
  Clock, MessageSquare, Printer, ArrowDownLeft, 
  ArrowUpRight, Receipt, Sparkles, ShieldCheck
} from 'lucide-react';
import { Supplier, Invoice, PartyPayment } from '../../types';
import { dbInvoices, dbPartyPayments } from '../../lib/db';
import { useSettings } from '../../contexts/SettingsContext';

interface Customer360ModalProps {
  party: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onRecordPayment?: (party: Supplier) => void;
  onNewSale?: (party: Supplier) => void;
}

export const Customer360Modal: React.FC<Customer360ModalProps> = ({
  party,
  isOpen,
  onClose,
  onRecordPayment,
  onNewSale,
}) => {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LEDGER' | 'AGING' | 'INVOICES' | 'PAYMENTS'>('OVERVIEW');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PartyPayment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && party) {
      loadPartyData();
    }
  }, [isOpen, party]);

  const loadPartyData = async () => {
    try {
      setLoading(true);
      const [allInvoices, allPayments] = await Promise.all([
        dbInvoices.getAll(),
        dbPartyPayments.getAll(),
      ]);

      const partyId = party?.id;
      const partyName = (party?.name || '').toLowerCase();

      // Filter invoices for this party
      const pInvoices = (allInvoices || []).filter(inv => 
        inv.partyId === partyId || 
        (inv.customerName && inv.customerName.toLowerCase() === partyName)
      );

      // Filter payments for this party
      const pPayments = (allPayments || []).filter(pay => 
        pay.partyId === partyId || 
        (pay.partyName && pay.partyName.toLowerCase() === partyName)
      );

      setInvoices(pInvoices);
      setPayments(pPayments);
    } catch (err) {
      console.error('Failed to load customer 360 data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !party) return null;

  // Real-time Calculations
  const isCustomer = party.partyType === 'Customer' || !party.partyType;
  const totalBilled = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const totalPaidInvoices = invoices.reduce((sum, inv) => sum + (inv.receivedAmount || 0), 0);
  const totalDirectPayments = payments
    .filter(p => p.type === 'PAYMENT_IN')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const currentOutstanding = party.balance !== undefined 
    ? party.balance 
    : (party.openingBalance || 0) + totalBilled - totalPaidInvoices - totalDirectPayments;

  const creditLimit = party.creditLimit || 0;
  const creditUsagePercent = creditLimit > 0 ? Math.min(100, Math.round((Math.max(0, currentOutstanding) / creditLimit) * 100)) : 0;
  const isCreditExceeded = creditLimit > 0 && currentOutstanding > creditLimit;

  // Aging Analysis Breakdown (0-30, 31-60, 61-90, 90+ days)
  const today = new Date();
  const aging = {
    current: 0,   // 0-30 days
    days30to60: 0, // 31-60 days
    days60to90: 0, // 61-90 days
    over90: 0,    // 90+ days
  };

  invoices.forEach(inv => {
    const invDate = new Date(inv.date);
    const diffDays = Math.floor((today.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));
    const balance = inv.balanceDue || 0;

    if (balance > 0) {
      if (diffDays <= 30) aging.current += balance;
      else if (diffDays <= 60) aging.days30to60 += balance;
      else if (diffDays <= 90) aging.days60to90 += balance;
      else aging.over90 += balance;
    }
  });

  // Combined Chronological Ledger
  const ledgerEntries = [
    ...(party.openingBalance ? [{
      id: 'open-bal',
      date: party.createdAt ? party.createdAt.slice(0, 10) : 'Opening',
      type: 'Opening Balance',
      refNo: 'INIT-00',
      debit: isCustomer && party.openingBalance > 0 ? party.openingBalance : 0,
      credit: !isCustomer && party.openingBalance > 0 ? party.openingBalance : 0,
      description: 'Opening balance carryover',
    }] : []),
    ...invoices.map(inv => ({
      id: inv.id,
      date: inv.date,
      type: inv.transactionType || 'Sale Invoice',
      refNo: inv.invoiceNumber,
      debit: inv.grandTotal || 0,
      credit: inv.receivedAmount || 0,
      description: `${inv.items?.length || 0} items billed`,
    })),
    ...payments.map(pay => ({
      id: pay.id,
      date: pay.date,
      type: pay.type === 'PAYMENT_IN' ? 'Receipt / Payment In' : 'Payment Out',
      refNo: pay.receiptNumber || pay.referenceNumber || 'REC',
      debit: pay.type === 'PAYMENT_OUT' ? pay.amount : 0,
      credit: pay.type === 'PAYMENT_IN' ? pay.amount : 0,
      description: `${pay.paymentMode || 'Cash'} payment`,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Running balance calculation
  let runningBal = 0;
  const ledgerWithRunningBalance = ledgerEntries.map(entry => {
    runningBal = runningBal + entry.debit - entry.credit;
    return { ...entry, runningBalance: runningBal };
  });

  // WhatsApp Message Generator
  const generateWhatsAppUrl = () => {
    const phone = (party.phone || '').replace(/\D/g, '');
    const msg = `Dear ${party.name},\nThis is a friendly statement update from ${settings.general.firms[0]?.name || 'MBI Inventra'}.\nYour current outstanding balance is Rs. ${currentOutstanding.toLocaleString()}.\nTotal Invoices: ${invoices.length}.\nThank you for your business!`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in select-none">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="h-16 bg-slate-900 text-white px-5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">{party.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {party.partyType || 'Customer'}
                </span>
                {isCreditExceeded && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> Limit Exceeded
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Customer 360° Profile • Phone: <span className="text-slate-300">{party.phone || 'N/A'}</span> • City: <span className="text-slate-300">{party.city || 'N/A'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {party.phone && (
              <a
                href={generateWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Statement</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 flex items-center gap-2 shrink-0">
          {[
            { key: 'OVERVIEW', label: '360° Summary', icon: Sparkles },
            { key: 'LEDGER', label: `Statement / Ledger (${ledgerWithRunningBalance.length})`, icon: FileText },
            { key: 'AGING', label: 'Aging Breakdown', icon: Clock },
            { key: 'INVOICES', label: `Invoices (${invoices.length})`, icon: Receipt },
            { key: 'PAYMENTS', label: `Payments (${payments.length})`, icon: CreditCard },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-5">
              {/* Top KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Outstanding</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className={`text-2xl font-black ${currentOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      Rs {Math.abs(currentOutstanding).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    {currentOutstanding > 0 ? 'Due from customer' : 'Advance / Zero balance'}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Lifetime Sales</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">Rs {totalBilled.toLocaleString()}</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    Across {invoices.length} transactions
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Credit Limit</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">
                      {creditLimit > 0 ? `Rs ${creditLimit.toLocaleString()}` : 'Unlimited'}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    {creditLimit > 0 ? `${creditUsagePercent}% utilized` : 'No limit set'}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Recovered</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-600">
                      Rs {(totalPaidInvoices + totalDirectPayments).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    Paid via receipts & invoices
                  </div>
                </div>
              </div>

              {/* Credit Limit Meter */}
              {creditLimit > 0 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Credit Limit Utilization</span>
                    <span className={`font-black ${isCreditExceeded ? 'text-red-600' : 'text-slate-700'}`}>
                      Rs {currentOutstanding.toLocaleString()} / Rs {creditLimit.toLocaleString()} ({creditUsagePercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${isCreditExceeded ? 'bg-red-500' : creditUsagePercent > 80 ? 'bg-amber-500' : 'bg-blue-600'}`}
                      style={{ width: `${Math.min(100, creditUsagePercent)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Party Contact & Business Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>Contact Information</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Company Name:</span>
                      <span className="font-bold text-slate-800">{party.company || party.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Contact Person:</span>
                      <span className="font-bold text-slate-800">{party.contactPerson || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Phone / Mobile:</span>
                      <span className="font-bold text-slate-800">{party.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Email:</span>
                      <span className="font-bold text-slate-800">{party.email || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Billing Address:</span>
                      <span className="font-bold text-slate-800 text-right">{party.address || party.city || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Tax & Banking Credentials</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Tax / NTN / GST:</span>
                      <span className="font-mono font-bold text-slate-800">{party.taxNumber || party.ntn || 'Unregistered'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Payment Terms:</span>
                      <span className="font-bold text-slate-800">{party.paymentTerms || 'Net 15 Days'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Bank Title:</span>
                      <span className="font-bold text-slate-800">{party.bankAccountTitle || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Bank Account / IBAN:</span>
                      <span className="font-mono font-bold text-slate-800">{party.bankAccountNumber || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'LEDGER' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Statement of Account</h3>
                  <p className="text-[11px] text-slate-500">Complete debit, credit, and running balance history</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Statement
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Ref No</th>
                      <th className="px-4 py-2.5">Description</th>
                      <th className="px-4 py-2.5 text-right">Debit (+)</th>
                      <th className="px-4 py-2.5 text-right">Credit (-)</th>
                      <th className="px-4 py-2.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerWithRunningBalance.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{item.date}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.type}</td>
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">{item.refNo}</td>
                        <td className="px-4 py-3 text-slate-500">{item.description}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {item.debit > 0 ? `Rs ${item.debit.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                          {item.credit > 0 ? `Rs ${item.credit.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-900">
                          Rs {item.runningBalance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'AGING' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">0 - 30 Days (Current)</span>
                  <div className="mt-1 text-xl font-black text-slate-900">Rs {aging.current.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-400">Within standard terms</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">31 - 60 Days</span>
                  <div className="mt-1 text-xl font-black text-amber-600">Rs {aging.days30to60.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-400">Follow-up advised</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600">61 - 90 Days</span>
                  <div className="mt-1 text-xl font-black text-orange-600">Rs {aging.days60to90.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-400">Overdue recovery</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">90+ Days (Critical)</span>
                  <div className="mt-1 text-xl font-black text-red-600">Rs {aging.over90.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-400">Immediate action needed</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Aging Summary & Risk Assessment</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {aging.over90 > 0 
                    ? `Warning: Customer has Rs. ${aging.over90.toLocaleString()} in invoices past 90 days. It is recommended to restrict new credit sales until overdue balance is settled.`
                    : 'Customer payment history is within acceptable parameters.'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'INVOICES' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Invoice #</th>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Grand Total</th>
                      <th className="px-4 py-2.5">Received</th>
                      <th className="px-4 py-2.5">Balance Due</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-slate-600">{inv.date}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">Rs {inv.grandTotal.toLocaleString()}</td>
                        <td className="px-4 py-3 text-emerald-600">Rs {inv.receivedAmount.toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold text-red-600">Rs {inv.balanceDue.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.balanceDue <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {inv.balanceDue <= 0 ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'PAYMENTS' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Receipt / Ref #</th>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Mode</th>
                      <th className="px-4 py-2.5">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">{p.receiptNumber || p.referenceNumber || 'REC'}</td>
                        <td className="px-4 py-3 text-slate-600">{p.date}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{p.type}</td>
                        <td className="px-4 py-3 text-slate-600">{p.paymentMode}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600">Rs {p.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div className="h-14 bg-white border-t border-slate-200 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {onRecordPayment && (
              <button
                onClick={() => {
                  onClose();
                  onRecordPayment(party);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-2xs"
              >
                Record Payment
              </button>
            )}
            {onNewSale && (
              <button
                onClick={() => {
                  onClose();
                  onNewSale(party);
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-2xs"
              >
                New Invoice
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
          >
            Close 360° View
          </button>
        </div>

      </div>
    </div>
  );
};
