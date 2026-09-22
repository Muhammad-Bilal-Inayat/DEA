import React, { useEffect, useState, useRef } from 'react';
import { dbInvoices, dbPurchaseOrders, dbMedicines } from '../../lib/db';
import { Clock, Check, Building2, User, FileText, Settings, X, TrendingUp, TrendingDown } from 'lucide-react';
import { getDetailedRecentPurchaseRates, getDetailedRecentSaleRates, RecentRateDetail } from '../../lib/inventoryCosting';
import { useSettings } from '../../contexts/SettingsContext';

interface HistoricalPriceDropdownProps {
  medicineId?: string;
  itemName: string;
  companyName?: string;
  transactionType: 'Sale' | 'Purchase';
  currentPrice: number;
  onSelectPrice: (price: number) => void;
  isOpen: boolean;
  onClose: () => void;
  showCompany?: boolean;
  onOpenSettings?: () => void;
}

export const HistoricalPriceDropdown: React.FC<HistoricalPriceDropdownProps> = ({
  medicineId,
  itemName,
  companyName: propCompanyName,
  transactionType,
  currentPrice,
  onSelectPrice,
  isOpen,
  onClose,
  showCompany: propShowCompany,
  onOpenSettings,
}) => {
  const { settings, updateTransaction } = useSettings();
  const [recentRecords, setRecentRecords] = useState<RecentRateDetail[]>([]);
  const [resolvedCompany, setResolvedCompany] = useState<string>(propCompanyName || '');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const shouldShowCompany = propShowCompany !== undefined 
    ? propShowCompany 
    : (settings.transaction?.showCompanyInRecentRates !== false);

  useEffect(() => {
    if (!isOpen || (!medicineId && !itemName)) return;

    let isMounted = true;

    const fetchHistoricalRecords = async () => {
      setLoading(true);
      try {
        let detectedCompany = propCompanyName || '';
        
        // If no company passed, try to fetch medicine manufacturer
        if (!detectedCompany && (medicineId || itemName)) {
          const allMeds = await dbMedicines.getAll();
          const qName = itemName.toLowerCase().trim();
          const foundMed = allMeds.find(m => (medicineId && m.id === medicineId) || (m.name && m.name.toLowerCase().trim() === qName));
          if (foundMed) {
            detectedCompany = foundMed.manufacturer || '';
          }
        }

        if (isMounted) {
          setResolvedCompany(detectedCompany);
        }

        if (transactionType === 'Sale') {
          const invoices = await dbInvoices.getAll();
          if (isMounted) {
            const records = getDetailedRecentSaleRates(medicineId || '', itemName, invoices, detectedCompany);
            setRecentRecords(records);
          }
        } else {
          const purchaseOrders = await dbPurchaseOrders.getAll();
          if (isMounted) {
            const records = getDetailedRecentPurchaseRates(medicineId || '', itemName, purchaseOrders, detectedCompany);
            setRecentRecords(records);
          }
        }
      } catch (err) {
        console.error('Failed to fetch historical rates:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchHistoricalRecords();

    return () => {
      isMounted = false;
    };
  }, [isOpen, medicineId, itemName, transactionType, propCompanyName]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || (!medicineId && !itemName)) return null;

  const handleToggleAutoPopup = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTransaction({ showRecentRatesOnFocus: false });
    onClose();
  };

  return (
    <div 
      ref={containerRef}
      className="absolute right-0 top-full mt-1.5 bg-white border border-slate-300 rounded-xl shadow-2xl z-50 p-2.5 w-72 sm:w-80 text-left animate-in fade-in zoom-in-95 duration-150"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="text-[11px] font-bold text-slate-700 pb-2 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Last 5 {transactionType === 'Sale' ? 'Sales' : 'Purchases'} Rates</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Close"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Item & Company Context Pill */}
      {itemName && (
        <div className="my-2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-[11px]">
          <span className="font-bold text-slate-800 truncate max-w-[150px]">{itemName}</span>
          {shouldShowCompany && resolvedCompany && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 truncate max-w-[120px]">
              <Building2 className="w-3 h-3 text-blue-500 shrink-0" />
              {resolvedCompany}
            </span>
          )}
        </div>
      )}

      {/* Body List */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
        {loading ? (
          <div className="text-[11px] text-slate-400 py-4 text-center italic flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 animate-spin text-blue-500" />
            Loading previous rates...
          </div>
        ) : recentRecords.length === 0 ? (
          <div className="py-4 px-2 text-center text-slate-500">
            <div className="text-xs font-semibold text-slate-600">No previous {transactionType.toLowerCase()} history</div>
            <p className="text-[10px] text-slate-400 mt-1">
              {resolvedCompany ? `Company: ${resolvedCompany}` : 'First time purchasing or selling this item'}
            </p>
          </div>
        ) : (
          recentRecords.map((record, idx) => {
            const isSelected = Math.abs(currentPrice - record.price) < 0.01;
            const diff = currentPrice > 0 ? record.price - currentPrice : 0;
            const diffPct = currentPrice > 0 ? Math.round((Math.abs(diff) / currentPrice) * 100) : 0;
            const comp = record.companyName || resolvedCompany;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSelectPrice(record.price);
                  onClose();
                }}
                className={`w-full p-2 text-xs rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-50/90 border-blue-400 shadow-xs' 
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {/* Price & Badges Row */}
                <div className="flex items-center justify-between font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-sm">
                      Rs {record.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {idx === 0 && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-sans font-bold uppercase tracking-wider">
                        Latest
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {diff !== 0 && currentPrice > 0 && (
                      <span className={`text-[10px] font-sans font-bold flex items-center gap-0.5 px-1 py-0.5 rounded ${
                        diff > 0 ? 'text-rose-700 bg-rose-50' : 'text-emerald-700 bg-emerald-50'
                      }`}>
                        {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {diffPct}%
                      </span>
                    )}
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Company & Party / Supplier Row */}
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-600">
                  {shouldShowCompany && comp && (
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                      {comp}
                    </span>
                  )}
                  {record.partyName && (
                    <span className="text-slate-600 flex items-center gap-0.5">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      {record.partyName}
                    </span>
                  )}
                </div>

                {/* Metadata: Date, Bill/Inv #, Qty */}
                <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span>{record.date ? new Date(record.date).toLocaleDateString() : 'N/A'}</span>
                  <div className="flex items-center gap-2">
                    {record.quantity && (
                      <span>Qty: {record.quantity} {record.unit || ''}</span>
                    )}
                    {record.docNumber && (
                      <span className="font-mono text-slate-600 flex items-center gap-0.5">
                        <FileText className="w-2.5 h-2.5 text-slate-400" />
                        {record.docNumber}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer Actions: Settings / Turn off */}
      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleAutoPopup}
            className="text-slate-500 hover:text-slate-800 underline transition cursor-pointer"
          >
            {settings.transaction?.showRecentRatesOnFocus !== false ? 'Turn off Auto-Popup' : 'Turn on Auto-Popup'}
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateTransaction({ showCompanyInRecentRates: !shouldShowCompany });
            }}
            className="text-slate-500 hover:text-blue-700 underline transition cursor-pointer"
          >
            {shouldShowCompany ? 'Hide Company' : 'Show Company'}
          </button>
        </div>

        {onOpenSettings && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              onOpenSettings();
            }}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
          >
            <Settings className="w-3 h-3" />
            <span>Settings</span>
          </button>
        )}
      </div>
    </div>
  );
};
