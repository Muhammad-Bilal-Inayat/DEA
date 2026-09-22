import React, { useState, useEffect } from 'react';
import {
  RegistrationLead,
  getAllRegistrationLeads,
  syncRegistrationLeadsFromFirestore,
  updateLeadStatus,
  deleteRegistrationLead,
  approveAndActivateLead,
  buildLeadWhatsAppInquiryUrl,
  buildCustomerReplyWhatsAppUrl,
  saveRegistrationLeadLocal,
  ADMIN_PRIMARY_WHATSAPP
} from '../../lib/registrationLeadsService';
import {
  MessageSquare,
  Phone,
  CheckCircle2,
  Clock,
  Key,
  Building2,
  User,
  MapPin,
  Search,
  ExternalLink,
  ShieldCheck,
  Send,
  Trash2,
  Sparkles,
  RefreshCw,
  Plus,
  X,
  Copy,
  Check,
  FileText,
  Lock,
  AtSign,
  Eye,
  EyeOff
} from 'lucide-react';
import { formatWhatsAppPhone } from '../../lib/whatsappService';

interface WhatsAppLeadsManagerPanelProps {
  showToast: (msg: string) => void;
}

export const WhatsAppLeadsManagerPanel: React.FC<WhatsAppLeadsManagerPanelProps> = ({ showToast }) => {
  const [leads, setLeads] = useState<RegistrationLead[]>(() => getAllRegistrationLeads());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [selectedLeadForActivation, setSelectedLeadForActivation] = useState<RegistrationLead | null>(null);
  const [assignedPlan, setAssignedPlan] = useState<string>('Standard POS');
  const [customPlanText, setCustomPlanText] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Manual Lead Entry Form State
  const [manualStore, setManualStore] = useState('');
  const [manualOwner, setManualOwner] = useState('');
  const [manualUsername, setManualUsername] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualCity, setManualCity] = useState('Lahore');
  const [manualEmail, setManualEmail] = useState('');
  const [manualPlan, setManualPlan] = useState<string>('Standard POS');
  const [manualCustomPlan, setManualCustomPlan] = useState('');

  useEffect(() => {
    // Initial sync from Firestore on mount
    syncRegistrationLeadsFromFirestore().then((synced) => {
      setLeads(synced);
    });

    const handleUpdate = () => {
      setLeads(getAllRegistrationLeads());
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'mbi_registration_leads_v2') {
        setLeads(getAllRegistrationLeads());
      }
    };

    window.addEventListener('mbi-registration-leads-updated', handleUpdate);
    window.addEventListener('storage', handleStorage);

    // Re-sync from Firestore every 5 seconds to catch new registrations from other clients
    const interval = setInterval(() => {
      syncRegistrationLeadsFromFirestore().then((synced) => {
        setLeads(synced);
      });
    }, 5000);

    return () => {
      window.removeEventListener('mbi-registration-leads-updated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const refreshLeads = async () => {
    const synced = await syncRegistrationLeadsFromFirestore();
    setLeads(synced);
    showToast('Registration leads refreshed from Cloud!');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleApprove = (lead: RegistrationLead) => {
    try {
      const finalPlan = assignedPlan === 'Custom' ? (customPlanText.trim() || 'Custom Plan') : assignedPlan;
      const { lead: updatedLead, licenseKey } = approveAndActivateLead(lead.id, finalPlan);
      setLeads(getAllRegistrationLeads());
      setSelectedLeadForActivation(null);
      setCustomPlanText('');
      showToast(`Activated ${updatedLead.storeName}! Key: ${licenseKey}`);

      // Open WhatsApp with key to send to customer
      const customerUrl = buildCustomerReplyWhatsAppUrl(updatedLead, licenseKey);
      window.open(customerUrl, '_blank');
    } catch (err: any) {
      alert(err.message || 'Failed to activate lead');
    }
  };

  const handleStatusChange = (leadId: string, status: RegistrationLead['status']) => {
    const updated = updateLeadStatus(leadId, status);
    setLeads(updated);
    showToast(`Status updated to ${status.replace('_', ' ')}`);
  };

  const handleDelete = (leadId: string, storeName: string) => {
    if (window.confirm(`Delete registration query for "${storeName}"?`)) {
      const updated = deleteRegistrationLead(leadId);
      setLeads(updated);
      showToast(`Query for ${storeName} removed.`);
    }
  };

  const handleCreateManualLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStore.trim() || !manualOwner.trim() || !manualPhone.trim()) {
      alert('Store name, owner name and phone number are required.');
      return;
    }

    const finalPlan = manualPlan === 'Custom' ? (manualCustomPlan.trim() || 'Custom Plan') : manualPlan;
    const finalUsername = manualUsername.trim().toLowerCase() || manualOwner.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const finalPassword = manualPassword.trim() || '1234';

    const lead: RegistrationLead = {
      id: `lead_manual_${Date.now()}`,
      storeName: manualStore.trim(),
      ownerName: manualOwner.trim(),
      username: finalUsername,
      password: finalPassword,
      phone: manualPhone.trim(),
      email: manualEmail.trim() || `${finalUsername}@pharma.pk`,
      city: manualCity.trim() || 'Lahore',
      address: `${manualCity.trim() || 'Lahore'}, Pakistan`,
      requestedPlan: finalPlan,
      status: 'pending_activation',
      isApproved: false,
      submittedAt: new Date().toISOString(),
    };

    saveRegistrationLeadLocal(lead);
    setLeads(getAllRegistrationLeads());
    setIsManualModalOpen(false);
    setManualStore('');
    setManualOwner('');
    setManualUsername('');
    setManualPassword('');
    setManualPhone('');
    setManualEmail('');
    setManualCustomPlan('');
    showToast('Manual lead recorded successfully with login credentials!');
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesPlan = planFilter === 'all' || lead.requestedPlan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const pendingCount = leads.filter(l => l.status === 'pending_activation').length;
  const activatedCount = leads.filter(l => l.status === 'activated').length;
  const contactedCount = leads.filter(l => l.status === 'contacted').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{leads.length}</div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total WhatsApp Leads</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-300">{pendingCount}</div>
            <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">Pending Activation</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-blue-500/30 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-blue-300">{contactedCount}</div>
            <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">Contacted / In Discussion</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-300">{activatedCount}</div>
            <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Approved & Live</div>
          </div>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 items-center gap-2 w-full flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search store name, owner, phone, city, or ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 focus:outline-none"
          >
            <option value="all">All Statuses ({leads.length})</option>
            <option value="pending_activation">Pending Activation ({pendingCount})</option>
            <option value="contacted">Contacted ({contactedCount})</option>
            <option value="activated">Activated ({activatedCount})</option>
          </select>

          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 focus:outline-none"
          >
            <option value="all">All Categories & Plans</option>
            <option value="3 Days Trial">3 Days Trial</option>
            <option value="7 Days Trial">7 Days Trial</option>
            <option value="15 Days Trial">15 Days Trial</option>
            <option value="30 Days Monthly">30 Days Monthly</option>
            <option value="Standard POS">Standard POS</option>
            <option value="Pharmacy Pro">Pharmacy Pro</option>
            <option value="Enterprise Multi-Branch">Enterprise Multi-Branch</option>
            <option value="Lifetime License">Lifetime License</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={refreshLeads}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh Leads"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Manual Lead</span>
          </button>
        </div>
      </div>

      {/* Leads Table / Grid */}
      {filteredLeads.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
          <MessageSquare className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No WhatsApp Registration Queries Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            When users register from the customer portal, their lead details and WhatsApp requests will populate here automatically for verification.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10.5px] font-black tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Store & City</th>
                  <th className="px-4 py-3.5">Owner / Contact</th>
                  <th className="px-4 py-3.5">Plan & Date</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">License Key</th>
                  <th className="px-5 py-3.5 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredLeads.map(lead => {
                  const whatsappChatUrl = `https://wa.me/${formatWhatsAppPhone(lead.phone)}?text=${encodeURIComponent(`Salam ${lead.ownerName} sb! Regarding your MBI Inventra registration for ${lead.storeName}...`)}`;
                  const dateFormatted = new Date(lead.submittedAt).toLocaleDateString('en-PK', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Store & City */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{lead.storeName}</div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              <span>{lead.city}</span>
                              {lead.drugLicenseNo && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-indigo-400 font-mono text-[10px]">DL: {lead.drugLicenseNo}</span>
                                </>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">ID: {lead.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Owner & Phone & Login Username */}
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-bold text-slate-200">{lead.ownerName}</div>
                          
                          {/* Username & Credentials Badge */}
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-950/70 border border-blue-500/40 text-blue-300 rounded-md text-[11px] font-mono font-bold" title="Login Username / ID">
                              <AtSign className="w-3 h-3 text-blue-400" />
                              <span>{lead.username || lead.email.split('@')[0]}</span>
                            </span>
                            {lead.password && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 rounded-md text-[10px] font-mono" title={`Password: ${lead.password}`}>
                                <Lock className="w-2.5 h-2.5 text-slate-400" />
                                <span>{lead.password}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mt-1">
                            <a
                              href={whatsappChatUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 rounded-lg text-[11px] font-mono font-bold transition-all"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-400" />
                              <span>{lead.phone}</span>
                            </a>
                          </div>
                          {lead.email && <div className="text-[10px] text-slate-400 mt-0.5">{lead.email}</div>}
                        </div>
                      </td>

                      {/* Plan & Date */}
                      <td className="px-4 py-4">
                        <div>
                          <span className="inline-block px-2.5 py-0.5 bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 rounded-md text-[10.5px] font-bold">
                            {lead.requestedPlan}
                          </span>
                          <div className="text-[10.5px] text-slate-400 mt-1">{dateFormatted}</div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        {lead.status === 'pending_activation' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-950/60 border border-amber-500/50 text-amber-300 rounded-full text-[11px] font-bold animate-pulse">
                            <Clock className="w-3 h-3" />
                            <span>Pending Activation</span>
                          </span>
                        )}
                        {lead.status === 'contacted' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-950/60 border border-blue-500/50 text-blue-300 rounded-full text-[11px] font-bold">
                            <Phone className="w-3 h-3" />
                            <span>In Discussion</span>
                          </span>
                        )}
                        {lead.status === 'activated' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 rounded-full text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Activated & Live</span>
                          </span>
                        )}
                        {lead.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-950/60 border border-rose-500/50 text-rose-300 rounded-full text-[11px] font-bold">
                            <X className="w-3 h-3" />
                            <span>Declined</span>
                          </span>
                        )}
                      </td>

                      {/* License Key */}
                      <td className="px-4 py-4">
                        {lead.activationKey ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-emerald-300 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-800">
                              {lead.activationKey}
                            </span>
                            <button
                              onClick={() => handleCopy(lead.activationKey!, lead.id)}
                              className="p-1 text-slate-400 hover:text-white"
                              title="Copy License Key"
                            >
                              {copiedId === lead.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">Not Generated</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Chat on WhatsApp */}
                          <a
                            href={whatsappChatUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline">WhatsApp</span>
                          </a>

                          {/* Approve & Activate */}
                          {lead.status !== 'activated' && (
                            <button
                              onClick={() => {
                                setSelectedLeadForActivation(lead);
                                setAssignedPlan(lead.requestedPlan);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-md flex items-center gap-1 cursor-pointer"
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span>Activate</span>
                            </button>
                          )}

                          {/* Mark In Discussion */}
                          {lead.status === 'pending_activation' && (
                            <button
                              onClick={() => handleStatusChange(lead.id, 'contacted')}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                              title="Mark as Contacted"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(lead.id, lead.storeName)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-xs"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ACTIVATION MODAL */}
      {selectedLeadForActivation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Approve & Generate License Key</h3>
                  <p className="text-[11px] text-slate-400">{selectedLeadForActivation.storeName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLeadForActivation(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 uppercase font-bold text-[10px] mb-1">
                  Assign Software Plan / Duration
                </label>
                <select
                  value={assignedPlan}
                  onChange={e => setAssignedPlan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-xs"
                >
                  <option value="3 Days Trial">3 Days Trial (Free Instant Activation)</option>
                  <option value="7 Days Trial">7 Days Trial (Free Instant Activation)</option>
                  <option value="15 Days Trial">15 Days Trial (Free Instant Activation)</option>
                  <option value="30 Days Monthly">30 Days Monthly (Rs. 1,999/mo)</option>
                  <option value="Standard POS">Standard POS (Rs. 1,999/mo | Rs. 19,990/yr)</option>
                  <option value="Pharmacy Pro">Pharmacy Pro (Rs. 3,999/mo | Rs. 39,990/yr)</option>
                  <option value="Enterprise Multi-Branch">Enterprise Multi-Branch (Rs. 6,999/mo | Rs. 69,990/yr)</option>
                  <option value="Lifetime License">Lifetime License (Perpetual Deal)</option>
                  <option value="Custom">Custom Duration / Plan Name...</option>
                </select>

                {assignedPlan === 'Custom' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Enter custom plan name or duration (e.g. 60 Days VIP Trial)..."
                      value={customPlanText}
                      onChange={e => setCustomPlanText(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-blue-500 rounded-xl text-white text-xs font-semibold"
                    />
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Owner Name:</span>
                  <span className="font-bold text-white">{selectedLeadForActivation.ownerName}</span>
                </div>
                <div className="flex justify-between items-center bg-blue-950/40 px-2 py-1 rounded border border-blue-500/30">
                  <span className="text-blue-400 font-bold flex items-center gap-1">
                    <AtSign className="w-3 h-3" />
                    <span>Login Username:</span>
                  </span>
                  <span className="font-mono font-black text-blue-300">
                    {selectedLeadForActivation.username || selectedLeadForActivation.email.split('@')[0]}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-900 px-2 py-1 rounded border border-slate-700">
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Password:</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {selectedLeadForActivation.password || '1234'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-mono text-emerald-400">{selectedLeadForActivation.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">City:</span>
                  <span className="font-semibold text-white">{selectedLeadForActivation.city}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-600/40 rounded-xl text-[11.5px] text-emerald-200">
                <span className="font-bold">✨ What happens next:</span>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[10.5px] text-emerald-300">
                  <li>Creates a genuine License Key and sets plan duration.</li>
                  <li>Activates Primary Admin login account with chosen username & password.</li>
                  <li>Auto-generates WhatsApp reply with username, password, and activation key to send directly to customer.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedLeadForActivation(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApprove(selectedLeadForActivation)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Send via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL LEAD ENTRY MODAL */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Record Manual Lead / Query</h3>
                  <p className="text-[11px] text-slate-400">Save incoming customer inquiry</p>
                </div>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManualLead} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 uppercase font-bold text-[10px] mb-1">
                  Pharmacy / Store Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Madina Medicos"
                  value={manualStore}
                  onChange={e => {
                    setManualStore(e.target.value);
                    if (!manualUsername) {
                      setManualUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase font-bold text-[10px] mb-1">
                  Owner / Contact Person *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mian Asad"
                  value={manualOwner}
                  onChange={e => setManualOwner(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-xs"
                />
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-blue-500/30">
                <div>
                  <label className="block text-blue-400 uppercase font-bold text-[10px] mb-1">
                    Login Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. madina_admin"
                    value={manualUsername}
                    onChange={e => setManualUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-blue-500/50 rounded-lg text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-blue-400 uppercase font-bold text-[10px] mb-1">
                    Password
                  </label>
                  <input
                    type="text"
                    placeholder="1234"
                    value={manualPassword}
                    onChange={e => setManualPassword(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-blue-500/50 rounded-lg text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 uppercase font-bold text-[10px] mb-1">
                    WhatsApp Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="03001234567"
                    value={manualPhone}
                    onChange={e => setManualPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 uppercase font-bold text-[10px] mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="Lahore"
                    value={manualCity}
                    onChange={e => setManualCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 uppercase font-bold text-[10px] mb-1">
                  Requested Software Plan / Duration
                </label>
                <select
                  value={manualPlan}
                  onChange={e => setManualPlan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-xs"
                >
                  <option value="3 Days Trial">3 Days Trial</option>
                  <option value="7 Days Trial">7 Days Trial</option>
                  <option value="15 Days Trial">15 Days Trial</option>
                  <option value="30 Days Monthly">30 Days Monthly</option>
                  <option value="Standard POS">Standard POS</option>
                  <option value="Pharmacy Pro">Pharmacy Pro</option>
                  <option value="Enterprise Multi-Branch">Enterprise Multi-Branch</option>
                  <option value="Lifetime License">Lifetime License</option>
                  <option value="Custom">Custom Duration / Plan Name...</option>
                </select>

                {manualPlan === 'Custom' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Enter custom plan name (e.g. 14 Days Custom Trial)..."
                      value={manualCustomPlan}
                      onChange={e => setManualCustomPlan(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-blue-500 rounded-xl text-white text-xs font-semibold"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
