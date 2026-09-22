import React, { useState, useEffect } from 'react';
import { 
  Heart, Plus, Search, Send, Calendar, Phone, 
  CheckCircle2, Clock, Trash2, AlertCircle, Sparkles, User, RefreshCw
} from 'lucide-react';
import { ChronicPatientRefillRecord } from '../../types';
import { dbChronicRefills } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { sendRefillReminderViaWhatsApp } from '../common/WhatsAppReminders';
import { cn } from '../../lib/utils';

export const ChronicRefillsTab: React.FC = () => {
  const { business } = useAuth();
  const [patients, setPatients] = useState<ChronicPatientRefillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [diseaseFilter, setDiseaseFilter] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<ChronicPatientRefillRecord>>({
    patientName: '',
    patientPhone: '',
    diseaseType: 'Diabetes',
    medicinesList: '',
    refillCycleDays: 30,
    lastPurchaseDate: new Date().toISOString().split('T')[0],
    nextDueDate: '',
    status: 'Upcoming',
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const allRefills = await dbChronicRefills.getAll();
      setPatients(allRefills.sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()));
    } catch (e) {
      console.error('Error loading chronic refills:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const calculateDueDate = (startDate: string, days: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName || !formData.patientPhone || !formData.medicinesList) {
      alert('Please fill in Patient Name, Phone Number, and Medicines List');
      return;
    }

    const lastDate = formData.lastPurchaseDate || new Date().toISOString().split('T')[0];
    const cycle = Number(formData.refillCycleDays) || 30;
    const dueDate = formData.nextDueDate || calculateDueDate(lastDate, cycle);

    const newRecord: ChronicPatientRefillRecord = {
      id: `refill-${Date.now()}`,
      patientName: formData.patientName.trim(),
      patientPhone: formData.patientPhone.trim(),
      diseaseType: formData.diseaseType || 'Diabetes',
      medicinesList: formData.medicinesList.trim(),
      refillCycleDays: cycle,
      lastPurchaseDate: lastDate,
      nextDueDate: dueDate,
      status: 'Upcoming',
      notes: formData.notes?.trim() || ''
    };

    await dbChronicRefills.save(newRecord);
    setIsAddModalOpen(false);
    setFormData({
      patientName: '',
      patientPhone: '',
      diseaseType: 'Diabetes',
      medicinesList: '',
      refillCycleDays: 30,
      lastPurchaseDate: new Date().toISOString().split('T')[0],
      nextDueDate: '',
      status: 'Upcoming',
      notes: ''
    });
    await loadData();
  };

  const handleSendReminder = (patient: ChronicPatientRefillRecord) => {
    sendRefillReminderViaWhatsApp({
      patientName: patient.patientName,
      patientPhone: patient.patientPhone,
      pharmacyName: business?.name || '3 Pharma',
      medicinesList: patient.medicinesList,
      dueDate: new Date(patient.nextDueDate).toLocaleDateString('en-PK')
    });
  };

  const handleMarkRefilled = async (patient: ChronicPatientRefillRecord) => {
    const today = new Date().toISOString().split('T')[0];
    const nextDue = calculateDueDate(today, patient.refillCycleDays || 30);
    const updated: ChronicPatientRefillRecord = {
      ...patient,
      lastPurchaseDate: today,
      nextDueDate: nextDue,
      status: 'Refilled'
    };
    await dbChronicRefills.save(updated);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this patient refill profile?')) {
      await dbChronicRefills.delete(id);
      await loadData();
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const getDaysDiff = (targetDateStr: string) => {
    const target = new Date(targetDateStr).getTime();
    const today = new Date(todayStr).getTime();
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = 
      p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.patientPhone.includes(searchQuery) ||
      p.medicinesList.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDisease = diseaseFilter === 'All' || p.diseaseType === diseaseFilter;
    return matchesSearch && matchesDisease;
  });

  const dueSoonCount = patients.filter(p => {
    const diff = getDaysDiff(p.nextDueDate);
    return diff >= 0 && diff <= 5;
  }).length;

  const overdueCount = patients.filter(p => getDaysDiff(p.nextDueDate) < 0).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered Chronic Patients</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{patients.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Heart className="w-5 h-5 text-rose-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Refills Due in 5 Days</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{dueSoonCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold animate-pulse">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Overdue Refills</p>
            <p className="text-2xl font-black text-red-700 mt-1">{overdueCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patient name, phone number, medicine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={diseaseFilter}
            onChange={(e) => setDiseaseFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Categories</option>
            <option value="Diabetes">Diabetes (Sugar)</option>
            <option value="Hypertension">Hypertension (BP)</option>
            <option value="Cardiac">Cardiac / Heart</option>
            <option value="Asthma">Asthma / Lungs</option>
            <option value="Thyroid">Thyroid</option>
            <option value="General">General Chronic</option>
          </select>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Chronic Patient</span>
          </button>
        </div>
      </div>

      {/* Patients List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Patient Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Regular Medicines List</th>
                <th className="p-3">Refill Cycle</th>
                <th className="p-3">Next Due Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Loading chronic patients...</td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <p className="font-bold text-slate-600">No chronic patients found</p>
                    <p className="text-[11px] mt-1">Add regular BP, Sugar, or Heart disease patients to send them 1-click monthly refill reminders on WhatsApp!</p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  const daysDiff = getDaysDiff(patient.nextDueDate);
                  const isOverdue = daysDiff < 0;
                  const isDueSoon = daysDiff >= 0 && daysDiff <= 5;

                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-slate-900">{patient.patientName}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" /> {patient.patientPhone}
                        </p>
                      </td>
                      <td className="p-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          patient.diseaseType === 'Diabetes' ? "bg-amber-100 text-amber-800" :
                          patient.diseaseType === 'Hypertension' ? "bg-rose-100 text-rose-800" :
                          patient.diseaseType === 'Cardiac' ? "bg-red-100 text-red-800" :
                          "bg-blue-100 text-blue-800"
                        )}>
                          {patient.diseaseType}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs">
                        <p className="font-medium text-slate-800 line-clamp-2">{patient.medicinesList}</p>
                      </td>
                      <td className="p-3 font-medium text-slate-700">
                        Every {patient.refillCycleDays || 30} Days
                      </td>
                      <td className="p-3 font-bold">
                        <p className={cn(
                          isOverdue ? "text-red-600" : isDueSoon ? "text-amber-600" : "text-slate-900"
                        )}>
                          {new Date(patient.nextDueDate).toLocaleDateString('en-PK')}
                        </p>
                        <span className="text-[10px] font-normal text-slate-400">
                          {isOverdue ? `⚠️ Overdue by ${Math.abs(daysDiff)} days` :
                           daysDiff === 0 ? `🚨 Due Today!` :
                           `Due in ${daysDiff} days`}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold",
                          isOverdue ? "bg-red-100 text-red-800 animate-pulse" :
                          isDueSoon ? "bg-amber-100 text-amber-800" :
                          "bg-emerald-100 text-emerald-800"
                        )}>
                          {isOverdue ? 'Overdue' : isDueSoon ? 'Due Soon' : 'Active'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1-Click WhatsApp Refill Reminder Button */}
                          <button
                            type="button"
                            onClick={() => handleSendReminder(patient)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            title="Send WhatsApp Refill Reminder (Free)"
                          >
                            <Send className="w-3 h-3" />
                            <span>WhatsApp Reminder</span>
                          </button>

                          {/* 1-Click Renew / Refilled */}
                          <button
                            type="button"
                            onClick={() => handleMarkRefilled(patient)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Refilled Today (Reset Schedule)"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Refilled</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(patient.id)}
                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Chronic Patient Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Regular Chronic Patient</h3>
                  <p className="text-[11px] text-slate-500">Automate monthly refill schedule & WhatsApp reminder</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePatient} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Haji Muhammad Younas"
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">WhatsApp / Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="03001234567"
                    value={formData.patientPhone}
                    onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Disease Category</label>
                  <select
                    value={formData.diseaseType}
                    onChange={(e) => setFormData({ ...formData, diseaseType: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  >
                    <option value="Diabetes">Diabetes (Sugar)</option>
                    <option value="Hypertension">Hypertension (High BP)</option>
                    <option value="Cardiac">Cardiac / Heart</option>
                    <option value="Asthma">Asthma / Inhaler</option>
                    <option value="Thyroid">Thyroid</option>
                    <option value="General">General Regular Dawa</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Refill Cycle (Days)</label>
                  <select
                    value={formData.refillCycleDays}
                    onChange={(e) => setFormData({ ...formData, refillCycleDays: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  >
                    <option value={15}>Every 15 Days</option>
                    <option value={30}>Every 30 Days (1 Month)</option>
                    <option value={60}>Every 60 Days (2 Months)</option>
                    <option value={90}>Every 90 Days (3 Months)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Prescribed Medicines List *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Glucophage 500mg (2 Boxes), Concor 5mg (1 Box), Loprin 75mg (1 Box)"
                  value={formData.medicinesList}
                  onChange={(e) => setFormData({ ...formData, medicinesList: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Last Purchase Date</label>
                  <input
                    type="date"
                    value={formData.lastPurchaseDate}
                    onChange={(e) => setFormData({ ...formData, lastPurchaseDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes / Home Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Needs home delivery"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Heart className="w-4 h-4" />
                  <span>Save Chronic Patient</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
