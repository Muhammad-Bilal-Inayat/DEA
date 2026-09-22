import React, { useState } from 'react';
import { 
  X, Settings, SlidersHorizontal, Layers, Printer, Hash, 
  Check, CheckCircle2, RotateCcw, ExternalLink, ShieldCheck,
  Eye, EyeOff, Clock, Search, Calculator, Sparkles
} from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useNavigate } from 'react-router-dom';

interface InvoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'FIELDS' | 'COLUMNS' | 'SEARCH' | 'PREFIXES' | 'PRINT' | 'ROUNDOFF';

export const InvoiceSettingsModal: React.FC<InvoiceSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const navigate = useNavigate();
  const { 
    settings, 
    updateTransactionSettings, 
    updatePrintSettings,
    updateItem,
    resetToDefaults 
  } = useSettings();

  const [activeTab, setActiveTab] = useState<TabType>('FIELDS');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleToggle = (
    category: 'transaction' | 'print' | 'tableColumns',
    key: string,
    currentVal: boolean
  ) => {
    if (category === 'transaction') {
      updateTransactionSettings({ [key]: !currentVal });
      showToast(`Transaction setting updated`);
    } else if (category === 'print') {
      updatePrintSettings({ [key]: !currentVal });
      showToast(`Print setting updated`);
    } else if (category === 'tableColumns') {
      const nextVal = !currentVal;
      updatePrintSettings({
        tableColumns: {
          ...settings.print.tableColumns,
          [key]: nextVal
        }
      });
      if (key === 'discount') {
        updateItem({ itemWiseDiscount: nextVal });
      }
      showToast(`Column visibility updated`);
    }
  };

  const handlePrefixChange = (type: string, val: string) => {
    updateTransactionSettings({
      prefixes: {
        ...settings.transaction.prefixes,
        [type]: val
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      
      {/* Modal Card Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-3xl lg:max-w-4xl overflow-hidden flex flex-col max-h-[92vh] text-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600/90 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Sales & Purchases Invoice Settings
                </h2>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Customize form fields, table columns, prefixes, print layout and round off rules
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0 ml-2"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Alert */}
        {toastMsg && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between animate-in slide-in-from-top-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-100" />
              {toastMsg}
            </span>
          </div>
        )}

        {/* Tab Navigation Bar - Styled to prevent wrapping, merging, or text clipping */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-3 sm:px-5 pt-2 select-none flex-shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
            
            <button
              type="button"
              onClick={() => setActiveTab('FIELDS')}
              className={`px-3 sm:px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'FIELDS'
                  ? 'bg-white text-blue-600 border-blue-600 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span>Form Fields</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('COLUMNS')}
              className={`px-3 sm:px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'COLUMNS'
                  ? 'bg-white text-blue-600 border-blue-600 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>Table Columns</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SEARCH')}
              className={`px-3 sm:px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'SEARCH'
                  ? 'bg-white text-blue-600 border-blue-600 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span>Search & Dropdown</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PREFIXES')}
              className={`px-3 sm:px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'PREFIXES'
                  ? 'bg-white text-blue-600 border-blue-600 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Hash className="w-3.5 h-3.5 shrink-0" />
              <span>Prefixes & Numbers</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PRINT')}
              className={`px-3 sm:px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'PRINT'
                  ? 'bg-white text-blue-600 border-blue-600 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>Print Layout</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ROUNDOFF')}
              className={`px-3 sm:px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'ROUNDOFF'
                  ? 'bg-white text-blue-600 border-blue-600 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 shrink-0" />
              <span>Round Off</span>
            </button>

          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* TAB 1: FORM FIELDS */}
          {activeTab === 'FIELDS' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 font-medium pb-1 border-b border-slate-100">
                Enable or disable optional customer and transaction inputs on the sale screen.
              </div>

              {/* Warranty Bill Button */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Warranty Bill Switch / Button</div>
                  <div className="text-[11px] text-slate-500">Show or hide the Warranty Bill mode toggle button in header</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('transaction', 'showWarrantyToggle', settings.transaction.showWarrantyToggle !== false)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.transaction.showWarrantyToggle !== false ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    settings.transaction.showWarrantyToggle !== false ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Warranty Type Field */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Warranty Type Field</div>
                  <div className="text-[11px] text-slate-500">Show or hide Warranty Type (Replacement/Repair/Service) dropdown field in Warranty panel</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('transaction', 'showWarrantyType', settings.transaction.showWarrantyType === true)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.transaction.showWarrantyType === true ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    settings.transaction.showWarrantyType === true ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Warranty Period Field */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Warranty Period Field</div>
                  <div className="text-[11px] text-slate-500">Show or hide Warranty Period (e.g. 1 Year) input field in Warranty panel</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('transaction', 'showWarrantyPeriod', settings.transaction.showWarrantyPeriod === true)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.transaction.showWarrantyPeriod === true ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    settings.transaction.showWarrantyPeriod === true ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Payment Type (Credit / Cash) */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Credit / Cash Payment Toggle</div>
                  <div className="text-[11px] text-slate-500">Show or hide the Credit vs Cash toggle pill on top of invoice</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('transaction', 'showPaymentType', settings.transaction.showPaymentType !== false)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.transaction.showPaymentType !== false ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    settings.transaction.showPaymentType !== false ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Invoice Number & Date */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Invoice Number & Date Header</div>
                  <div className="text-[11px] text-slate-500">Show or hide invoice number and invoice date input fields</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('transaction', 'showInvoiceNumberAndDate', settings.transaction.showInvoiceNumberAndDate !== false)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.transaction.showInvoiceNumberAndDate !== false ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    settings.transaction.showInvoiceNumberAndDate !== false ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Customer Add Button */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Customer "+ Add" Quick Button</div>
                  <div className="text-[11px] text-slate-500">Show "+ Add" button next to customer search bar</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('transaction', 'showCustomerAddButton', settings.transaction.showCustomerAddButton !== false)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.transaction.showCustomerAddButton !== false ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    settings.transaction.showCustomerAddButton !== false ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Party Balance Card */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Selected Party Balance / Limit Card</div>
                  <div className="text-[11px] text-slate-500">Show live current due balance and credit limit banner for selected customer</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('transaction', 'showPartyBalanceCard', settings.transaction.showPartyBalanceCard !== false)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.transaction.showPartyBalanceCard !== false ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    settings.transaction.showPartyBalanceCard !== false ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Description & Notes */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">"+ ADD DESCRIPTION" Notes Button</div>
                  <div className="text-[11px] text-slate-500">Show button to add remarks or terms at bottom of invoice</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('transaction', 'showDescriptionNotes', settings.transaction.showDescriptionNotes !== false)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.transaction.showDescriptionNotes !== false ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    settings.transaction.showDescriptionNotes !== false ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Add Image & Document */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">"+ ADD IMAGE / DOCUMENT" Buttons</div>
                  <div className="text-[11px] text-slate-500">Show attachment buttons to upload doctor prescriptions or warranty slips</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('transaction', 'showAddImageDoc', settings.transaction.showAddImageDoc !== false)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.transaction.showAddImageDoc !== false ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    settings.transaction.showAddImageDoc !== false ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Billing Name */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Billing Name for Parties</div>
                  <div className="text-[11px] text-slate-500">Show a separate billing / department name on invoices</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('transaction', 'billingNameOfParties', settings.transaction.billingNameOfParties)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.transaction.billingNameOfParties ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    settings.transaction.billingNameOfParties ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Customer Phone */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Customer Phone Number</div>
                  <div className="text-[11px] text-slate-500">Show customer phone input field on sales invoice</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('transaction', 'customerPhone', settings.transaction.customerPhone !== false)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.transaction.customerPhone !== false ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    settings.transaction.customerPhone !== false ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Rapid / Barcode Entry Bar */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Rapid / Barcode Entry Bar (⚡)</div>
                  <div className="text-[11px] text-slate-500">Show the top lightning search bar for ultra-fast barcode scanning</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('transaction', 'quickEntry', settings.transaction.quickEntry)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.transaction.quickEntry ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    settings.transaction.quickEntry ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Show Recent Rates Popover */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Recent Rates Popover (Last 5 Sales/Purchases)</div>
                  <div className="text-[11px] text-slate-500">Show last 5 historical rates underneath the price field during billing</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('transaction', 'showRecentRatesOnFocus', settings.transaction.showRecentRatesOnFocus !== false)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.transaction.showRecentRatesOnFocus !== false ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    settings.transaction.showRecentRatesOnFocus !== false ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Show Company Name in Recent Rates */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Show Company & Supplier Name in Rates</div>
                  <div className="text-[11px] text-slate-500">Display medicine manufacturer company and distributor/party name with rates</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('transaction', 'showCompanyInRecentRates', settings.transaction.showCompanyInRecentRates !== false)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.transaction.showCompanyInRecentRates !== false ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    settings.transaction.showCompanyInRecentRates !== false ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Free Item Quantity */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Free Item Quantity (10 + 1 Free Scheme)</div>
                  <div className="text-[11px] text-slate-500">Enable bonus / complimentary medicine quantities without charging</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('transaction', 'freeItemQuantity', settings.transaction.freeItemQuantity)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.transaction.freeItemQuantity ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    settings.transaction.freeItemQuantity ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Customer / Supplier PO Details */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Purchase Order (PO) Details</div>
                  <div className="text-[11px] text-slate-500">Capture PO Number and PO Date on sales and purchase transactions</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('transaction', 'customerPoDetails', settings.transaction.customerPoDetails)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.transaction.customerPoDetails ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    settings.transaction.customerPoDetails ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Due Dates and Payment Terms */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Due Dates & Payment Terms</div>
                  <div className="text-[11px] text-slate-500">Track invoice due dates (e.g. Net 15, Net 30) for credit recovery</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('transaction', 'dueDatesAndPaymentTerms', settings.transaction.dueDatesAndPaymentTerms)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.transaction.dueDatesAndPaymentTerms ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    settings.transaction.dueDatesAndPaymentTerms ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Show Profit on Sale */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Show Estimated Profit on Sale</div>
                  <div className="text-[11px] text-slate-500">Display margin calculation during sale creation</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('transaction', 'showProfitOnSale', settings.transaction.showProfitOnSale)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.transaction.showProfitOnSale ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    settings.transaction.showProfitOnSale ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: TABLE COLUMNS */}
          {activeTab === 'COLUMNS' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 font-medium pb-1 border-b border-slate-100">
                Choose which columns are active on the invoice table and print receipts.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { key: 'batchNo', label: 'Batch Number', desc: 'Batch code of medicines' },
                  { key: 'expDate', label: 'Expiry Date', desc: 'Medicine expiration date' },
                  { key: 'mrp', label: 'MRP (Max Retail Price)', desc: 'Retail price on packaging' },
                  { key: 'unit', label: 'Unit (Box, Strip, Pcs)', desc: 'Packaging measurement unit' },
                  { key: 'discount', label: 'Discount (%)', desc: 'Line item discount rate' },
                  { key: 'taxPercent', label: 'Tax / GST (%)', desc: 'Sales tax or GST rates' },
                  { key: 'hsnSac', label: 'HSN / SAC Code', desc: 'Pharma tax classification' },
                  { key: 'mfgDate', label: 'Mfg Date', desc: 'Manufacturing date' }
                ].map((col) => {
                  const isChecked = col.key === 'discount'
                    ? ((settings.print.tableColumns as any).discount !== false && settings.item?.itemWiseDiscount !== false)
                    : ((settings.print.tableColumns as any)[col.key] ?? true);
                  return (
                    <div 
                      key={col.key}
                      onClick={() => handleToggle('tableColumns', col.key, isChecked)}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-blue-50/50 hover:border-blue-200 transition-all cursor-pointer select-none"
                    >
                      <div className="pr-2">
                        <div className="text-xs font-bold text-slate-900">{col.label}</div>
                        <div className="text-[10px] text-slate-500">{col.desc}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent'
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: SEARCH & AUTOCOMPLETE DROPDOWN */}
          {activeTab === 'SEARCH' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 font-medium pb-1 border-b border-slate-100">
                Choose which item metadata appears in the rapid search bar (⚡) and table autocomplete dropdowns.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Purchase Rate Toggle */}
                <div
                  onClick={() => handleToggle('transaction', 'showPurchasePriceInAutocomplete', settings.transaction.showPurchasePriceInAutocomplete !== false)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    settings.transaction.showPurchasePriceInAutocomplete !== false
                      ? 'bg-blue-50/50 border-blue-500 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="pr-2">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Purchase Rate / Buy Price</span>
                      <span className="text-[9px] font-mono font-bold bg-amber-100 text-amber-800 px-1 rounded">
                        Pur. Rate
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">Show cost / buy rate to verify product profit margin</div>
                  </div>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                    settings.transaction.showPurchasePriceInAutocomplete !== false ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent'
                  }`}>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                {/* Batch Number Toggle */}
                <div
                  onClick={() => handleToggle('transaction', 'showBatchInAutocomplete', settings.transaction.showBatchInAutocomplete !== false)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    settings.transaction.showBatchInAutocomplete !== false
                      ? 'bg-blue-50/50 border-blue-500 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="pr-2">
                    <div className="text-xs font-bold text-slate-900">Batch Number</div>
                    <div className="text-[10px] text-slate-500">Display batch identifier in search suggestions</div>
                  </div>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                    settings.transaction.showBatchInAutocomplete !== false ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent'
                  }`}>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                {/* MRP Toggle */}
                <div
                  onClick={() => handleToggle('transaction', 'showMrpInAutocomplete', settings.transaction.showMrpInAutocomplete !== false)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    settings.transaction.showMrpInAutocomplete !== false
                      ? 'bg-blue-50/50 border-blue-500 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="pr-2">
                    <div className="text-xs font-bold text-slate-900">MRP (Max Retail Price)</div>
                    <div className="text-[10px] text-slate-500">Show printed MRP price in suggestions</div>
                  </div>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                    settings.transaction.showMrpInAutocomplete !== false ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent'
                  }`}>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                {/* Stock Quantity Toggle */}
                <div
                  onClick={() => handleToggle('transaction', 'showStockInAutocomplete', settings.transaction.showStockInAutocomplete !== false)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    settings.transaction.showStockInAutocomplete !== false
                      ? 'bg-blue-50/50 border-blue-500 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="pr-2">
                    <div className="text-xs font-bold text-slate-900">Available Stock Quantity</div>
                    <div className="text-[10px] text-slate-500">Display live on-hand stock count in suggestions</div>
                  </div>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                    settings.transaction.showStockInAutocomplete !== false ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent'
                  }`}>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                {/* Sale Price Toggle */}
                <div
                  onClick={() => handleToggle('transaction', 'showSalePriceInAutocomplete', settings.transaction.showSalePriceInAutocomplete !== false)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    settings.transaction.showSalePriceInAutocomplete !== false
                      ? 'bg-blue-50/50 border-blue-500 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="pr-2">
                    <div className="text-xs font-bold text-slate-900">Selling Price / Rate</div>
                    <div className="text-[10px] text-slate-500">Display default customer selling price</div>
                  </div>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                    settings.transaction.showSalePriceInAutocomplete !== false ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent'
                  }`}>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                {/* Expiry Date Toggle */}
                <div
                  onClick={() => handleToggle('transaction', 'showExpDateInAutocomplete', settings.transaction.showExpDateInAutocomplete === true)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    settings.transaction.showExpDateInAutocomplete === true
                      ? 'bg-blue-50/50 border-blue-500 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="pr-2">
                    <div className="text-xs font-bold text-slate-900">Expiry Date</div>
                    <div className="text-[10px] text-slate-500">Show batch expiration month and year</div>
                  </div>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                    settings.transaction.showExpDateInAutocomplete === true ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent'
                  }`}>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

              </div>

              {/* Live Preview */}
              <div className="mt-2 pt-2 border-t border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Dropdown Result Preview:
                </div>
                <div className="bg-slate-50 border border-blue-200 rounded-lg p-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900">Augmentin 625mg Tablet</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {settings.transaction.showBatchInAutocomplete !== false && (
                        <span>Batch: <span className="font-mono text-slate-700 font-medium">AG-882</span></span>
                      )}
                      {settings.transaction.showBatchInAutocomplete !== false && settings.transaction.showStockInAutocomplete !== false && <span className="text-slate-300">|</span>}
                      {settings.transaction.showStockInAutocomplete !== false && (
                        <span>Stock: <strong className="text-emerald-700 font-bold">45</strong></span>
                      )}
                      {(settings.transaction.showBatchInAutocomplete !== false || settings.transaction.showStockInAutocomplete !== false) && settings.transaction.showMrpInAutocomplete !== false && <span className="text-slate-300">|</span>}
                      {settings.transaction.showMrpInAutocomplete !== false && (
                        <span>MRP: <span className="font-mono text-slate-700">Rs 800</span></span>
                      )}
                      {settings.transaction.showPurchasePriceInAutocomplete !== false && (
                        <span className="text-amber-800 font-semibold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                          Pur. Rate: <span className="font-mono font-bold">Rs 620</span>
                        </span>
                      )}
                      {settings.transaction.showExpDateInAutocomplete && (
                        <span className="text-purple-800 font-medium bg-purple-50 px-1 py-0.2 rounded border border-purple-200">
                          Exp: <span className="font-mono">12/2027</span>
                        </span>
                      )}
                    </div>
                  </div>
                  {settings.transaction.showSalePriceInAutocomplete !== false && (
                    <div className="text-right flex-shrink-0 pl-2">
                      <span className="font-black font-mono text-blue-700 text-sm">Rs 720</span>
                      <div className="text-[9px] text-slate-400">Sale Rate</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Historical Rates & Quick Entry Bar Settings */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Historical Rates & Quick Entry Bar</span>
                </div>
                <div className="text-[11px] text-slate-500 mb-3">
                  Control automatic rate history popups, company display, and the rapid entry bar.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Auto-popup on price focus */}
                  <div
                    onClick={() => handleToggle('transaction', 'showRecentRatesOnFocus', settings.transaction.showRecentRatesOnFocus !== false)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      settings.transaction.showRecentRatesOnFocus !== false
                        ? 'bg-blue-50/50 border-blue-500 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="pr-2">
                      <div className="text-xs font-bold text-slate-900">Last 5 Rates on Price Focus</div>
                      <div className="text-[10px] text-slate-500">Auto-show previous sales/purchases rates when entering price</div>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      settings.transaction.showRecentRatesOnFocus !== false ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>

                  {/* Show Company in Historical Rates */}
                  <div
                    onClick={() => handleToggle('transaction', 'showCompanyInRecentRates', settings.transaction.showCompanyInRecentRates !== false)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      settings.transaction.showCompanyInRecentRates !== false
                        ? 'bg-blue-50/50 border-blue-500 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="pr-2">
                      <div className="text-xs font-bold text-slate-900">Company Name in Recent Rates</div>
                      <div className="text-[10px] text-slate-500">Display manufacturer/company name in historical prices</div>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      settings.transaction.showCompanyInRecentRates !== false ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>

                  {/* Quick Entry Bar (Lightning Add) */}
                  <div
                    onClick={() => handleToggle('transaction', 'quickEntry', settings.transaction.quickEntry !== false)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      settings.transaction.quickEntry !== false
                        ? 'bg-blue-50/50 border-blue-500 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="pr-2">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <span>Quick Entry Bar (Lightning Add)</span>
                        <span className="text-[10px] text-amber-600 font-bold">⚡</span>
                      </div>
                      <div className="text-[10px] text-slate-500">Enable top synchronized bar inside items table for rapid entry</div>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      settings.transaction.quickEntry !== false ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: PREFIXES & NUMBERS */}
          {activeTab === 'PREFIXES' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 font-medium pb-1 border-b border-slate-100">
                Define prefix codes for invoice numbering across transaction types.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Sale Invoice Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.transaction.prefixes?.sale || 'INV-'}
                    onChange={(e) => handlePrefixChange('sale', e.target.value)}
                    placeholder="INV-"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Estimate / Quotation Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.transaction.prefixes?.estimate || 'EST-'}
                    onChange={(e) => handlePrefixChange('estimate', e.target.value)}
                    placeholder="EST-"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Sale Order Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.transaction.prefixes?.saleOrder || 'SO-'}
                    onChange={(e) => handlePrefixChange('saleOrder', e.target.value)}
                    placeholder="SO-"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Delivery Challan Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.transaction.prefixes?.deliveryChallan || 'DC-'}
                    onChange={(e) => handlePrefixChange('deliveryChallan', e.target.value)}
                    placeholder="DC-"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Sale Return / Credit Note Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.transaction.prefixes?.creditNote || 'SR-'}
                    onChange={(e) => handlePrefixChange('creditNote', e.target.value)}
                    placeholder="SR-"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Purchase Order Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.transaction.prefixes?.purchaseOrder || 'PO-'}
                    onChange={(e) => handlePrefixChange('purchaseOrder', e.target.value)}
                    placeholder="PO-"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Purchase Bill Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.transaction.prefixes?.purchaseBill || 'BILL-'}
                    onChange={(e) => handlePrefixChange('purchaseBill', e.target.value)}
                    placeholder="BILL-"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Purchase Return / Debit Note Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.transaction.prefixes?.debitNote || 'DN-'}
                    onChange={(e) => handlePrefixChange('debitNote', e.target.value)}
                    placeholder="DN-"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRINT LAYOUT */}
          {activeTab === 'PRINT' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 font-medium pb-1 border-b border-slate-100">
                Choose default print size and footer notes for generated receipts.
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Default Paper Format
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['A4', 'A5', 'Thermal 80mm', 'Thermal 58mm'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => updatePrintSettings({ paperSize: size as any })}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                        settings.print.paperSize === size
                          ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Default Invoice Terms & Conditions
                </label>
                <textarea
                  rows={2}
                  value={settings.print.termsAndConditions || ''}
                  onChange={(e) => updatePrintSettings({ termsAndConditions: e.target.value })}
                  placeholder="Goods once sold cannot be returned without original cash receipt."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Signature Text */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Authorized Signatory Label
                </label>
                <input
                  type="text"
                  value={settings.print.signatureText || ''}
                  onChange={(e) => updatePrintSettings({ signatureText: e.target.value })}
                  placeholder="Authorized Signatory / For Pharmacist"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 5: ROUND OFF */}
          {activeTab === 'ROUNDOFF' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 font-medium pb-1 border-b border-slate-100">
                Choose automatic round off logic for invoice total amounts.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'Nearest', title: 'Nearest Rupee (Standard)', desc: 'Rounds 0.50+ up, below 0.50 down' },
                  { key: 'Up', title: 'Always Round Up (Ceil)', desc: 'Always rounds fractions up to next Re' },
                  { key: 'Down', title: 'Always Round Down (Floor)', desc: 'Always truncates fractions' },
                  { key: 'None', title: 'No Round Off (Exact Paisas)', desc: 'Calculates exact decimals' }
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => updateTransactionSettings({ roundOffType: item.key as any })}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                      settings.transaction.roundOffType === item.key
                        ? 'bg-blue-50 border-blue-600 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{item.title}</span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        settings.transaction.roundOffType === item.key
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-slate-400 bg-white'
                      }`}>
                        {settings.transaction.roundOffType === item.key && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-100 border-t border-slate-200 flex-shrink-0">
          
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/settings');
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Open All System Settings</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              Done & Close
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
