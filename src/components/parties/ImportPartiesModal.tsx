import React, { useState, useRef } from 'react';
import { 
  X, Upload, Download, FileSpreadsheet, Users, Check, AlertCircle, 
  Smartphone, Mail, CheckCircle2, ChevronRight, RefreshCw, FileText
} from 'lucide-react';
import { 
  downloadPartyTemplateExcel, 
  parsePartiesExcel, 
  parseContactsFile, 
  ParsedPartyRow, 
  ContactItem 
} from '../../lib/excelUtils';
import { Party } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface ImportPartiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedCount: number) => void;
  onSaveParties: (parties: Party[]) => Promise<void>;
}

export const ImportPartiesModal: React.FC<ImportPartiesModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onSaveParties,
}) => {
  const [activeTab, setActiveTab] = useState<'excel' | 'contacts'>('excel');
  
  // Excel Import state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedPartyRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Contacts Import state
  const [contactsFile, setContactsFile] = useState<File | null>(null);
  const [contactsList, setContactsList] = useState<ContactItem[]>([]);
  const [defaultContactType, setDefaultContactType] = useState<'Customer' | 'Supplier'>('Customer');
  const contactsInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Excel File Selected
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const rows = await parsePartiesExcel(file);
      if (rows.length === 0) {
        setErrorMsg('No valid rows found in the uploaded file. Please make sure party names are provided.');
      } else {
        setParsedRows(rows);
      }
    } catch (err: any) {
      console.error('Error parsing Excel:', err);
      setErrorMsg('Failed to parse Excel file. Please ensure it is a valid .xlsx or .csv template.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Contacts File Selected
  const handleContactsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setContactsFile(file);
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const contacts = await parseContactsFile(file);
      if (contacts.length === 0) {
        setErrorMsg('No contacts found in this file. Supported formats: Google Contacts CSV, .vcf vCard.');
      } else {
        setContactsList(contacts);
      }
    } catch (err: any) {
      console.error('Error parsing contacts:', err);
      setErrorMsg('Failed to read contacts file. Please make sure it is a valid vCard (.vcf) or Google Contacts CSV.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Excel Import
  const handleConfirmExcelImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);
    try {
      const newParties: Party[] = validRows.map(r => ({
        id: uuidv4(),
        name: r.name,
        partyType: r.partyType,
        contactPerson: r.contactPerson,
        phone: r.phone,
        email: r.email,
        address: r.address,
        openingBalance: r.openingBalance,
        balance: r.openingBalance,
        creditLimit: r.creditLimit,
        taxNumber: r.taxNumber,
        paymentTerms: r.paymentTerms || 'Due on Receipt',
        createdAt: new Date().toISOString()
      }));

      await onSaveParties(newParties);
      onImportSuccess(newParties.length);
      handleReset();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save imported parties to database.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Contacts Import
  const handleConfirmContactsImport = async () => {
    const selectedContacts = contactsList.filter(c => c.selected);
    if (selectedContacts.length === 0) return;

    setIsProcessing(true);
    try {
      const newParties: Party[] = selectedContacts.map(c => ({
        id: uuidv4(),
        name: c.name,
        partyType: defaultContactType,
        contactPerson: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address || '',
        openingBalance: 0,
        balance: 0,
        creditLimit: 0,
        paymentTerms: 'Due on Receipt',
        createdAt: new Date().toISOString()
      }));

      await onSaveParties(newParties);
      onImportSuccess(newParties.length);
      handleReset();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save contacts.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleContact = (id: string) => {
    setContactsList(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const handleSelectAllContacts = (selectAll: boolean) => {
    setContactsList(prev => prev.map(c => ({ ...c, selected: selectAll })));
  };

  const handleReset = () => {
    setExcelFile(null);
    setParsedRows([]);
    setContactsFile(null);
    setContactsList([]);
    setErrorMsg(null);
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const selectedContactsCount = contactsList.filter(c => c.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Import Parties / Contacts</h2>
              <p className="text-xs text-slate-500">Bulk upload customers and suppliers via Excel, Gmail, or Phone</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-8 text-sm font-medium">
          <button
            onClick={() => { setActiveTab('excel'); setErrorMsg(null); }}
            className={`py-3.5 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'excel' 
                ? 'border-[#f97316] text-[#f97316] font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel / CSV Spreadsheet
          </button>
          <button
            onClick={() => { setActiveTab('contacts'); setErrorMsg(null); }}
            className={`py-3.5 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'contacts' 
                ? 'border-[#f97316] text-[#f97316] font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Phone & Gmail Contacts
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[68vh] overflow-y-auto space-y-6">

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* TAB 1: EXCEL SPREADSHEET */}
          {activeTab === 'excel' && (
            <div className="space-y-6">
              
              {/* Step 1: Download Template */}
              <div className="bg-orange-50/60 border border-orange-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Download Excel Parties Template</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Use our sample formatted file containing columns: Party Name, Type, Phone, Balance, Credit Limit, Address.
                    </p>
                  </div>
                </div>
                <button
                  onClick={downloadPartyTemplateExcel}
                  className="flex items-center justify-center gap-2 bg-white hover:bg-orange-100/60 text-orange-700 border border-orange-300 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors whitespace-nowrap"
                >
                  <Download className="w-4 h-4" /> Download Template (.xlsx)
                </button>
              </div>

              {/* Step 2: Upload Excel */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Upload Your Completed File</h4>
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-orange-50/20 cursor-pointer transition-colors"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleExcelUpload}
                    accept=".xlsx, .xls, .csv"
                    className="hidden" 
                  />
                  <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    {excelFile ? excelFile.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv)</p>
                </div>
              </div>

              {/* Step 3: Parsed Preview */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        3
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Preview Parties ({validCount} Valid / {parsedRows.length} Total)
                      </h4>
                    </div>
                    <button 
                      onClick={handleReset}
                      className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Clear / Re-upload
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-700 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Party Name</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Phone</th>
                          <th className="py-2.5 px-3">City / Address</th>
                          <th className="py-2.5 px-3 text-right">Opening Bal.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                            <td className="py-2 px-3">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                                  <Check className="w-3 h-3" /> Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-700 font-medium bg-rose-100 px-2 py-0.5 rounded text-[11px]" title={row.errors.join(', ')}>
                                  <AlertCircle className="w-3 h-3" /> Error
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{row.name}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.partyType === 'Supplier' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {row.partyType}
                              </span>
                            </td>
                            <td className="py-2 px-3">{row.phone || '-'}</td>
                            <td className="py-2 px-3 truncate max-w-[150px]">{row.address || '-'}</td>
                            <td className="py-2 px-3 text-right font-mono font-medium text-slate-800">
                              Rs {row.openingBalance.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: PHONE & GMAIL CONTACTS */}
          {activeTab === 'contacts' && (
            <div className="space-y-6">
              
              <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">How to export from Phone or Google Contacts:</h4>
                    <ul className="text-xs text-slate-600 mt-1.5 space-y-1 list-disc list-inside">
                      <li><strong>Google Contacts (Gmail)</strong>: Open <em>contacts.google.com</em> → Click <strong>Export</strong> → Choose <strong>Google CSV</strong> or <strong>vCard</strong>.</li>
                      <li><strong>Android / iPhone Contacts</strong>: In your Phone Contacts app → Select contacts → Tap <strong>Share / Export</strong> → Save as <strong>.vcf (vCard)</strong>.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Upload Contacts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-900">Upload Contacts File (.csv, .vcf, .vcard)</h4>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Import as:</span>
                    <select
                      value={defaultContactType}
                      onChange={(e: any) => setDefaultContactType(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="Customer">Customers</option>
                      <option value="Supplier">Suppliers</option>
                    </select>
                  </div>
                </div>

                <div 
                  onClick={() => contactsInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-blue-50/20 cursor-pointer transition-colors"
                >
                  <input 
                    type="file" 
                    ref={contactsInputRef}
                    onChange={handleContactsUpload}
                    accept=".csv, .vcf, .vcard"
                    className="hidden" 
                  />
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    {contactsFile ? contactsFile.name : 'Click to upload Google Contacts CSV or Phone vCard (.vcf)'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Automatic name, phone, email, and address detection</p>
                </div>
              </div>

              {/* Contacts Selection List */}
              {contactsList.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">
                      Select Contacts to Import ({selectedContactsCount} selected of {contactsList.length})
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSelectAllContacts(true)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => handleSelectAllContacts(false)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {contactsList.map((contact) => (
                      <div 
                        key={contact.id}
                        onClick={() => handleToggleContact(contact.id)}
                        className={`flex items-center justify-between p-3 cursor-pointer text-xs transition-colors ${
                          contact.selected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={contact.selected || false} 
                            onChange={() => {}} 
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" 
                          />
                          <div>
                            <div className="font-semibold text-slate-900">{contact.name}</div>
                            <div className="text-slate-400 text-[11px]">{contact.phone || 'No phone'} {contact.email && `• ${contact.email}`}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {contact.source}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>

          {activeTab === 'excel' ? (
            <button
              onClick={handleConfirmExcelImport}
              disabled={validCount === 0 || isProcessing}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                validCount === 0 || isProcessing
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-[#f97316] hover:bg-orange-600 active:scale-98'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isProcessing ? 'Importing...' : `Import ${validCount} Parties`}
            </button>
          ) : (
            <button
              onClick={handleConfirmContactsImport}
              disabled={selectedContactsCount === 0 || isProcessing}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                selectedContactsCount === 0 || isProcessing
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-98'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isProcessing ? 'Importing...' : `Import ${selectedContactsCount} Contacts`}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
