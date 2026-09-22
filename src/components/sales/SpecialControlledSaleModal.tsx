import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, ShieldAlert, Lock, CheckCircle2, AlertTriangle, 
  Search, Pill, User, UserCheck, FileText, Printer, 
  Sparkles, DollarSign, Calendar, Phone, Plus, Trash2 
} from 'lucide-react';
import { Medicine, Invoice, InvoiceItem, Party } from '../../types';
import { dbMedicines, dbInvoices, dbAuditLogs, dbUserActivities, dbSuppliers } from '../../lib/db';
import { formatCurrency } from '../../lib/utils';
import { emitToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { v4 as uuidv4 } from 'uuid';
import { InvoicePrintModal } from './InvoicePrintModal';

interface SpecialControlledSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCompleted?: (invoice: Invoice) => void;
}

export const SpecialControlledSaleModal: React.FC<SpecialControlledSaleModalProps> = ({
  isOpen,
  onClose,
  onSaleCompleted,
}) => {
  const { activeUser, activeRole, canPerform } = useAuth();
  const { settings } = useSettings();

  // Auth gate
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authPin, setAuthPin] = useState('');
  const [authError, setAuthError] = useState('');

  // Medicines list
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Cart / Items in controlled sale
  const [selectedItems, setSelectedItems] = useState<{
    medicine: Medicine;
    quantity: number;
    sellingPrice: number;
    mrp: number;
    batchNumber: string;
    expiryDate: string;
  }[]>([]);

  // Regulatory Fields
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientCnic, setPatientCnic] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorRegNo, setDoctorRegNo] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [prescriptionNo, setPrescriptionNo] = useState('');
  const [prescriptionDate, setPrescriptionDate] = useState(new Date().toISOString().split('T')[0]);
  const [authorizedNotes, setAuthorizedNotes] = useState('');
  const [approverName, setApproverName] = useState(activeUser?.name || 'Pharmacist In-Charge');

  // Print Modal
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Auto authorize if user is Primary Admin, Secondary Admin or has explicit permission
      if (activeRole === 'Primary Admin' || activeRole === 'Secondary Admin' || canPerform('canSellControlledItems')) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
      setAuthPin('');
      setAuthError('');
      loadControlledMedicines();
    }
  }, [isOpen, activeRole]);

  const loadControlledMedicines = async () => {
    try {
      const list = await dbMedicines.getAll();
      setAllMedicines(list || []);
    } catch (e) {}
  };

  // Filter controlled products
  const controlledProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allMedicines.filter(m => {
      // Include controlled items or any item explicitly marked
      const isControlled = m.isControlled || m.specialAccessRequired || m.regulatorySchedule;
      if (!isControlled) return false;

      if (!q) return true;
      return (
        (m.name || '').toLowerCase().includes(q) ||
        (m.genericName || '').toLowerCase().includes(q) ||
        (m.genericId || '').toLowerCase().includes(q) ||
        (m.manufacturer || '').toLowerCase().includes(q) ||
        (m.batchNumber || '').toLowerCase().includes(q) ||
        (m.barcode || '').toLowerCase().includes(q)
      );
    });
  }, [allMedicines, searchQuery]);

  const handleVerifyAuth = () => {
    // Check against standard pins or admin passcode
    if (authPin === '0000' || authPin === '1234' || authPin === settings.general.passcode || authPin === activeUser?.passcode) {
      setIsAuthorized(true);
      setAuthError('');
      emitToast('Controlled Sale Access Authorized', 'success');
    } else {
      setAuthError('Invalid Security Passcode or PIN. Access Denied.');
    }
  };

  const handleAddItem = (med: Medicine) => {
    const existingIndex = selectedItems.findIndex(i => i.medicine.id === med.id);
    if (existingIndex >= 0) {
      const updated = [...selectedItems];
      updated[existingIndex].quantity += 1;
      setSelectedItems(updated);
    } else {
      setSelectedItems(prev => [
        ...prev,
        {
          medicine: med,
          quantity: 1,
          sellingPrice: med.sellingPrice || 0,
          mrp: med.mrp || 0,
          batchNumber: med.batchNumber || 'DEFAULT',
          expiryDate: med.expiryDate || ''
        }
      ]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateItemQty = (index: number, qty: number) => {
    setSelectedItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, quantity: Math.max(1, qty) };
      }
      return item;
    }));
  };

  const totalAmount = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
  }, [selectedItems]);

  const handleCompleteControlledSale = async () => {
    if (selectedItems.length === 0) {
      emitToast('Please select at least one controlled product to dispense', 'error');
      return;
    }

    if (!patientName.trim()) {
      emitToast('Patient Name is mandatory for Controlled Sale registry', 'error');
      return;
    }

    if (!doctorName.trim()) {
      emitToast('Prescribing Doctor Name is mandatory for Controlled Sale registry', 'error');
      return;
    }

    if (!prescriptionNo.trim()) {
      emitToast('Prescription Reference # is mandatory for Controlled Sale registry', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const timestamp = new Date().toISOString();
      const invoiceNumber = `CTRL-${Date.now().toString().slice(-6)}`;
      const currentUserName = activeUser?.name || 'Pharmacist';

      const invoiceItems: InvoiceItem[] = selectedItems.map(item => ({
        medicineId: item.medicine.id,
        name: item.medicine.name,
        genericName: item.medicine.genericName,
        genericId: item.medicine.genericId,
        strength: item.medicine.strength,
        dosageForm: item.medicine.dosageForm,
        manufacturer: item.medicine.manufacturer,
        isControlled: true,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
        mrp: item.mrp,
        unit: item.medicine.unit || 'PCS',
        total: item.quantity * item.sellingPrice,
      }));

      const newInvoice: Invoice = {
        id: uuidv4(),
        invoiceNumber,
        date: new Date().toISOString().split('T')[0],
        customerName: patientName.trim(),
        customerPhone: patientPhone.trim() || patientCnic.trim(),
        transactionType: 'Sale',
        paymentType: 'Cash',
        paymentMethod: 'Cash',
        items: invoiceItems,
        subTotal: totalAmount,
        grandTotal: totalAmount,
        receivedAmount: totalAmount,
        balanceDue: 0,
        userName: currentUserName,
        // Regulatory Controlled fields
        isControlledSale: true,
        patientName: patientName.trim(),
        patientCnicOrPhone: (patientCnic.trim() || patientPhone.trim()),
        patientAge: patientAge.trim(),
        prescriberDoctorName: doctorName.trim(),
        prescriberDoctorRegNo: doctorRegNo.trim(),
        prescriberHospitalOrClinic: hospitalName.trim(),
        prescriptionNumber: prescriptionNo.trim(),
        prescriptionDate,
        controlledApprovalBy: approverName.trim() || currentUserName,
        controlledApprovalAt: timestamp,
        controlledAuthorizedNotes: authorizedNotes.trim(),
        controlledPrintCount: 0,
        controlledPrintHistory: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // 1. Save Invoice
      await dbInvoices.save(newInvoice);

      // 2. Deduct inventory stock
      for (const item of selectedItems) {
        const med = allMedicines.find(m => m.id === item.medicine.id);
        if (med) {
          const updatedQty = (med.quantity || 0) - item.quantity;
          await dbMedicines.save({
            ...med,
            quantity: updatedQty,
            updatedAt: timestamp
          });
        }
      }

      // 3. Save comprehensive audit log
      await dbAuditLogs.save({
        id: 'audit_ctrl_' + Date.now(),
        action: 'CONTROLLED_SALE',
        module: 'POS_CONTROLLED',
        details: `Dispensed ${selectedItems.length} controlled items (Invoice #${invoiceNumber}) to Patient ${patientName} by Doctor ${doctorName} (Reg: ${doctorRegNo || 'N/A'})`,
        user: currentUserName,
        timestamp
      } as any);

      await dbUserActivities.save({
        id: 'act_ctrl_' + Date.now(),
        userName: currentUserName,
        userRole: activeRole,
        details: `Executed Special Controlled Sale #${invoiceNumber} for Patient ${patientName}`,
        timestamp: Date.now()
      } as any);

      emitToast(`Special Controlled Sale #${invoiceNumber} completed successfully!`, 'success');
      setCreatedInvoice(newInvoice);
      setIsPrintModalOpen(true);

      if (onSaleCompleted) {
        onSaleCompleted(newInvoice);
      }
    } catch (e: any) {
      console.error('Controlled sale failed:', e);
      emitToast(e?.message || 'Failed to complete controlled sale', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-amber-300 dark:border-amber-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-amber-200 dark:border-amber-800/60 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Special Controlled Sale Mode
                  </h2>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 font-bold border border-amber-300 dark:border-amber-700">
                    Form 9 / Regulatory Register
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Protected dispense workflow for Schedule narcotics and restricted formulations.
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

          {!isAuthorized ? (
            /* Authorization Gate */
            <div className="p-8 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto mb-2 border border-amber-300 dark:border-amber-800">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Pharmacist Security Authorization Required
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dispensing controlled medicines requires authorized Pharmacist or Admin PIN verification.
              </p>

              <div className="space-y-3">
                <input
                  type="password"
                  value={authPin}
                  onChange={(e) => setAuthPin(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyAuth()}
                  placeholder="Enter Passcode / PIN (e.g. 0000)"
                  className="w-full text-center tracking-widest text-lg font-mono px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
                {authError && (
                  <div className="text-xs text-red-600 font-semibold">{authError}</div>
                )}
                <button
                  type="button"
                  onClick={handleVerifyAuth}
                  className="w-full py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-md shadow-amber-500/20"
                >
                  Authorize Controlled Sale
                </button>
              </div>
            </div>
          ) : (
            /* Controlled Sale Form */
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              
              {/* Patient & Doctor Regulatory Details */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-amber-600" />
                    Patient & Doctor Register Information
                  </h3>
                  <span className="text-[11px] text-amber-600 font-medium">Mandatory for Drug Regulatory Authority compliance</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Patient Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g. Muhammad Usman"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Patient CNIC / Phone
                    </label>
                    <input
                      type="text"
                      value={patientCnic}
                      onChange={(e) => setPatientCnic(e.target.value)}
                      placeholder="e.g. 35201-1234567-1 / 03001234567"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Patient Age
                    </label>
                    <input
                      type="text"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      placeholder="e.g. 38 Yrs"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Prescribing Doctor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      placeholder="e.g. Dr. A. K. Niazi"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Doctor PMDC / Reg No.
                    </label>
                    <input
                      type="text"
                      value={doctorRegNo}
                      onChange={(e) => setDoctorRegNo(e.target.value)}
                      placeholder="e.g. PMC-54910-P"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Prescription Ref # <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={prescriptionNo}
                      onChange={(e) => setPrescriptionNo(e.target.value)}
                      placeholder="e.g. RX-2026-891"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Controlled Item Search & Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-blue-600" />
                    Authorized Controlled Medicines in Inventory
                  </h3>
                  <span className="text-xs text-slate-500">
                    {controlledProducts.length} restricted items found
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search controlled item by Generic, Brand Name, Generic ID, Batch..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                </div>

                {/* Quick Add Grid */}
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/40 dark:bg-slate-950/40">
                  {controlledProducts.map(med => (
                    <div 
                      key={med.id}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between hover:border-amber-500 transition"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {med.name}
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 font-mono">
                            {med.strength || 'Controlled'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {med.genericName || med.manufacturer} • Batch: <span className="font-mono">{med.batchNumber || 'N/A'}</span> • Stock: <span className="font-bold text-emerald-600">{med.quantity}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddItem(med)}
                        className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 rounded-md transition"
                      >
                        + Dispense
                      </button>
                    </div>
                  ))}
                  {controlledProducts.length === 0 && (
                    <div className="col-span-2 py-4 text-center text-xs text-slate-500">
                      No controlled products found matching "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Dispense Items Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Dispensed Items List ({selectedItems.length})
                </h3>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Item / Generic</th>
                        <th className="py-2 px-3">Batch & Expiry</th>
                        <th className="py-2 px-3 text-center">Dispense Qty</th>
                        <th className="py-2 px-3 text-right">Price</th>
                        <th className="py-2 px-3 text-right">Total</th>
                        <th className="py-2 px-3 text-center">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {selectedItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-900 dark:text-white">{item.medicine.name}</div>
                            <div className="text-[10px] text-slate-400">{item.medicine.genericName || item.medicine.manufacturer}</div>
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px]">
                            <div>{item.batchNumber}</div>
                            <div className="text-[10px] text-slate-400">Exp: {item.expiryDate ? item.expiryDate.split('T')[0] : 'N/A'}</div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItemQty(idx, parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1 text-center font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {formatCurrency(item.sellingPrice)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatCurrency(item.quantity * item.sellingPrice)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {selectedItems.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                            No controlled medicines selected yet. Search and click "+ Dispense" above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {selectedItems.length > 0 && (
                  <div className="flex justify-end pt-2">
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Total Bill Amount:</div>
                      <div className="text-lg font-bold text-emerald-600 font-mono">
                        {formatCurrency(totalAmount)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Footer */}
          {isAuthorized && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
              <div className="text-xs text-slate-500">
                Authorized Dispenser: <span className="font-bold text-slate-800 dark:text-slate-200">{activeUser?.name || 'Admin'}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing || selectedItems.length === 0}
                  onClick={handleCompleteControlledSale}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4" />
                  {isProcessing ? 'Dispensing...' : 'Finalize & Record Controlled Sale'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Print Modal for created controlled sale invoice */}
      {isPrintModalOpen && createdInvoice && (
        <InvoicePrintModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            onClose();
          }}
          invoice={createdInvoice}
        />
      )}
    </>
  );
};
