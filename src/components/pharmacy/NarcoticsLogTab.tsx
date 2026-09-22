import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Plus, Search, Printer, Download, 
  FileText, Calendar, User, Phone, CheckCircle2,
  Trash2, Eye, ShieldAlert, Sparkles, AlertTriangle
} from 'lucide-react';
import { NarcoticsEntryRecord, Medicine } from '../../types';
import { dbNarcoticsLogs, dbMedicines } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

export const NarcoticsLogTab: React.FC = () => {
  const { business, activeRole } = useAuth();
  const [logs, setLogs] = useState<NarcoticsEntryRecord[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewLog, setPreviewLog] = useState<NarcoticsEntryRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<NarcoticsEntryRecord>>({
    patientName: '',
    patientCnicOrPhone: '',
    patientAge: 35,
    doctorName: '',
    doctorPmdc: '',
    clinicAddress: '',
    medicineName: '',
    batchNumber: '',
    quantityDispensed: 10,
    balanceRemaining: 90,
    dispensedDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [allLogs, allMeds] = await Promise.all([
        dbNarcoticsLogs.getAll(),
        dbMedicines.getAll()
      ]);
      setLogs(allLogs.sort((a, b) => new Date(b.dispensedDate).getTime() - new Date(a.dispensedDate).getTime()));
      setMedicines(allMeds);
    } catch (e) {
      console.error('Error loading narcotics logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName || !formData.doctorName || !formData.medicineName) {
      alert('Please fill in Patient Name, Doctor Name and Medicine Name');
      return;
    }

    const newLog: NarcoticsEntryRecord = {
      id: `narc-${Date.now()}`,
      patientName: formData.patientName.trim(),
      patientCnicOrPhone: formData.patientCnicOrPhone?.trim() || '',
      patientAge: Number(formData.patientAge) || 0,
      doctorName: formData.doctorName.trim(),
      doctorPmdc: formData.doctorPmdc?.trim() || 'PMDC-VERIFIED',
      clinicAddress: formData.clinicAddress?.trim() || '',
      medicineName: formData.medicineName.trim(),
      batchNumber: formData.batchNumber?.trim() || 'B-01',
      quantityDispensed: Number(formData.quantityDispensed) || 1,
      balanceRemaining: Number(formData.balanceRemaining) || 0,
      dispensedBy: activeRole,
      dispensedDate: formData.dispensedDate || new Date().toISOString(),
      notes: formData.notes?.trim() || ''
    };

    await dbNarcoticsLogs.save(newLog);
    setIsAddModalOpen(false);
    setFormData({
      patientName: '',
      patientCnicOrPhone: '',
      patientAge: 35,
      doctorName: '',
      doctorPmdc: '',
      clinicAddress: '',
      medicineName: '',
      batchNumber: '',
      quantityDispensed: 10,
      balanceRemaining: 90,
      dispensedDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    await loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this narcotics record from register?')) {
      await dbNarcoticsLogs.delete(id);
      await loadData();
    }
  };

  const handlePrintOfficialRegister = () => {
    window.print();
  };

  const filteredLogs = logs.filter(l => 
    l.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.doctorPmdc && l.doctorPmdc.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              DRAP Compliance
            </span>
            <span className="text-xs text-indigo-200">Form 8 Register</span>
          </div>
          <h2 className="text-xl font-black tracking-tight">Controlled & Narcotics Drugs Register</h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Official dispensing register for Schedule D, G, Benzodiazepines & Controlled psychoactive substances as required by Health Department & Drug Inspector inspections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintOfficialRegister}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Logbook</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Dispensing</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by patient name, doctor, PMDC registration number, medicine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
        <span className="text-xs font-bold text-slate-500">
          Showing {filteredLogs.length} Official Records
        </span>
      </div>

      {/* Official Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Patient Details</th>
                <th className="p-3">Doctor / PMDC No.</th>
                <th className="p-3">Medicine & Batch</th>
                <th className="p-3">Qty Dispensed</th>
                <th className="p-3">Balance in Stock</th>
                <th className="p-3">Dispensed By</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">Loading controlled drugs register...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <p className="font-bold text-slate-600">No controlled drugs entries found</p>
                    <p className="text-[11px] mt-1">Whenever you sell Xanax, Lexotanil, Tramadol or scheduled drugs, record them here for inspector compliance.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-medium text-slate-700 whitespace-nowrap">
                      {new Date(log.dispensedDate).toLocaleDateString('en-PK')}
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{log.patientName}</p>
                      <p className="text-[10px] text-slate-500">
                        Age: {log.patientAge || 'N/A'} {log.patientCnicOrPhone ? `• CNIC/Cell: ${log.patientCnicOrPhone}` : ''}
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-slate-800">{log.doctorName}</p>
                      <p className="text-[10px] font-mono text-blue-700">
                        PMDC: {log.doctorPmdc || 'Verified'}
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{log.medicineName}</p>
                      <p className="text-[10px] text-slate-500">Batch: {log.batchNumber}</p>
                    </td>
                    <td className="p-3 font-black text-red-600">
                      {log.quantityDispensed} Units
                    </td>
                    <td className="p-3 font-bold text-slate-700">
                      {log.balanceRemaining} Units
                    </td>
                    <td className="p-3 text-slate-600">
                      {log.dispensedBy || 'Pharmacist'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewLog(log)}
                          className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(log.id)}
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Narcotics Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Controlled Substance Dispensing</h3>
                  <p className="text-[11px] text-slate-500">Form 8 DRAP compliance register</p>
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

            <form onSubmit={handleSaveEntry} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Muhammad Aslam"
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Patient CNIC / Phone</label>
                  <input
                    type="text"
                    placeholder="35202-xxxxxxx-x / 0300-xxxxxxx"
                    value={formData.patientCnicOrPhone}
                    onChange={(e) => setFormData({ ...formData, patientCnicOrPhone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prescribing Doctor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Tariq Mahmood (FCPS)"
                    value={formData.doctorName}
                    onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Doctor PMDC / PMC Reg # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 54321-P"
                    value={formData.doctorPmdc}
                    onChange={(e) => setFormData({ ...formData, doctorPmdc: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Hospital / Clinic Name & Address</label>
                <input
                  type="text"
                  placeholder="e.g. DHQ Hospital Gujranwala / Neuro Clinic"
                  value={formData.clinicAddress}
                  onChange={(e) => setFormData({ ...formData, clinicAddress: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Medicine Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alprazolam (Xanax) 0.5mg"
                    value={formData.medicineName}
                    onChange={(e) => setFormData({ ...formData, medicineName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Batch Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B-9981"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Qty Dispensed</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantityDispensed}
                    onChange={(e) => setFormData({ ...formData, quantityDispensed: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-red-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Remaining Stock</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.balanceRemaining}
                    onChange={(e) => setFormData({ ...formData, balanceRemaining: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date Dispensed</label>
                  <input
                    type="date"
                    required
                    value={formData.dispensedDate}
                    onChange={(e) => setFormData({ ...formData, dispensedDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Prescription Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Prescribed for 10 days for anxiety disorder"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
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
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save in Form 8 Register</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Preview Modal */}
      {previewLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Controlled Substance Dispensing Slip</h3>
              <button onClick={() => setPreviewLog(null)} className="text-slate-400 font-bold p-1">✕</button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="text-slate-500">Patient:</p>
                <p className="font-bold text-slate-900 text-sm">{previewLog.patientName} (Age: {previewLog.patientAge || 'N/A'})</p>
                {previewLog.patientCnicOrPhone ? <p className="text-slate-600 font-mono">CNIC/Phone: {previewLog.patientCnicOrPhone}</p> : null}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="text-slate-500">Prescribing Doctor:</p>
                <p className="font-bold text-slate-900">{previewLog.doctorName}</p>
                <p className="text-blue-700 font-mono font-bold">PMDC Reg #: {previewLog.doctorPmdc}</p>
                {previewLog.clinicAddress ? <p className="text-slate-600">{previewLog.clinicAddress}</p> : null}
              </div>

              <div className="p-3 bg-red-50/50 rounded-xl border border-red-200 space-y-1">
                <p className="text-red-700 font-bold">Medicine Dispensed:</p>
                <p className="font-bold text-slate-900 text-sm">{previewLog.medicineName}</p>
                <p className="text-slate-600">Batch: <span className="font-mono font-bold">{previewLog.batchNumber}</span> | Qty Dispensed: <span className="font-black text-red-600">{previewLog.quantityDispensed}</span></p>
                <p className="text-slate-600">Remaining Balance: <span className="font-bold text-slate-800">{previewLog.balanceRemaining}</span></p>
              </div>

              <div className="text-[11px] text-slate-400 pt-2 flex justify-between">
                <span>Dispensed by: {previewLog.dispensedBy}</span>
                <span>Date: {new Date(previewLog.dispensedDate).toLocaleDateString('en-PK')}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewLog(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
