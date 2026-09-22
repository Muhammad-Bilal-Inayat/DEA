import React, { useState, useEffect } from 'react';
import { 
  X, AlertTriangle, ShieldAlert, Clock, Package, 
  Users, Layers, ArrowRight, CheckCircle2, MessageSquare, 
  CreditCard, Plus, RefreshCw, Filter, Sparkles
} from 'lucide-react';
import { Medicine, Invoice, Supplier, CashierShift } from '../../types';
import { dbMedicines, dbInvoices, dbSuppliers, dbCashierShifts } from '../../lib/db';
import { useNavigate } from 'react-router-dom';

interface ExceptionCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProduct360?: (product: Medicine) => void;
  onOpenCustomer360?: (party: Supplier) => void;
}

export const ExceptionCenterModal: React.FC<ExceptionCenterModalProps> = ({
  isOpen,
  onClose,
  onOpenProduct360,
  onOpenCustomer360,
}) => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'STOCK' | 'EXPIRY' | 'CREDIT' | 'SHIFTS'>('ALL');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [parties, setParties] = useState<Supplier[]>([]);
  const [shifts, setShifts] = useState<CashierShift[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadExceptions();
    }
  }, [isOpen]);

  const loadExceptions = async () => {
    try {
      setLoading(true);
      const [medList, invList, partyList, shiftList] = await Promise.all([
        dbMedicines.getAll(),
        dbInvoices.getAll(),
        dbSuppliers.getAll(),
        dbCashierShifts.getAll(),
      ]);
      setMedicines(medList || []);
      setInvoices(invList || []);
      setParties(partyList || []);
      setShifts(shiftList || []);
    } catch (err) {
      console.error('Failed to load exceptions:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const today = new Date();

  // 1. Stock Exceptions: Negative or Low Stock
  const stockExceptions = medicines
    .filter(m => m.quantity <= (m.lowStockThreshold || 10))
    .map(m => ({
      id: `stock-${m.id}`,
      category: 'STOCK' as const,
      severity: (m.quantity <= 0 ? 'CRITICAL' : 'WARNING') as 'CRITICAL' | 'WARNING',
      title: `${m.name} is ${m.quantity <= 0 ? 'Out of Stock' : 'Low on Stock'}`,
      description: `Current quantity: ${m.quantity} ${m.unit || 'Units'} (Safety limit: ${m.lowStockThreshold || 10})`,
      actionLabel: 'Create Purchase PO',
      action: () => {
        onClose();
        navigate('/purchase?action=add');
      },
      itemData: m,
    }));

  // 2. Expiry Exceptions: Expired or expiring within 30 days
  const expiryExceptions = medicines
    .filter(m => {
      if (!m.expiryDate) return false;
      const exp = new Date(m.expiryDate);
      const diffDays = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 45;
    })
    .map(m => {
      const exp = new Date(m.expiryDate);
      const diffDays = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const isExpired = diffDays <= 0;

      return {
        id: `exp-${m.id}`,
        category: 'EXPIRY' as const,
        severity: (isExpired ? 'CRITICAL' : 'WARNING') as 'CRITICAL' | 'WARNING',
        title: `${m.name} (Batch ${m.batchNumber || 'MAIN'})`,
        description: isExpired ? `Expired on ${m.expiryDate}` : `Expiring in ${diffDays} days (${m.expiryDate})`,
        actionLabel: 'View Product 360°',
        action: () => {
          onClose();
          if (onOpenProduct360) onOpenProduct360(m);
        },
        itemData: m,
      };
    });

  // 3. Credit / Overdue Exceptions: Parties exceeding credit limits or past 60 days overdue
  const creditExceptions = parties
    .filter(p => {
      const bal = p.balance || 0;
      const limit = p.creditLimit || 0;
      return (limit > 0 && bal > limit) || bal > 50000;
    })
    .map(p => {
      const bal = p.balance || 0;
      const limit = p.creditLimit || 0;
      const isExceeded = limit > 0 && bal > limit;

      return {
        id: `cred-${p.id}`,
        category: 'CREDIT' as const,
        severity: (isExceeded ? 'CRITICAL' : 'WARNING') as 'CRITICAL' | 'WARNING',
        title: `${p.name} - Outstanding Rs. ${bal.toLocaleString()}`,
        description: isExceeded ? `Exceeds credit limit of Rs. ${limit.toLocaleString()} by Rs. ${(bal - limit).toLocaleString()}` : `Significant outstanding balance`,
        actionLabel: 'Customer 360°',
        action: () => {
          onClose();
          if (onOpenCustomer360) onOpenCustomer360(p);
        },
        itemData: p,
      };
    });

  // 4. Shift Exceptions: Unclosed or discrepant shifts
  const shiftExceptions = shifts
    .filter(s => s.status === 'OPEN' || (s.cashDifference && Math.abs(s.cashDifference) > 100))
    .map(s => ({
      id: `shift-${s.id}`,
      category: 'SHIFTS' as const,
      severity: (s.status === 'OPEN' ? 'WARNING' : 'CRITICAL') as 'CRITICAL' | 'WARNING',
      title: `Shift ${s.shiftNumber} (${s.cashierName})`,
      description: s.status === 'OPEN' ? `Active shift open since ${s.startTime}` : `Cash discrepancy of Rs. ${s.cashDifference}`,
      actionLabel: 'Manage Shift',
      action: () => {
        onClose();
        navigate('/shift-management');
      },
      itemData: s,
    }));

  const allExceptions = [
    ...stockExceptions,
    ...expiryExceptions,
    ...creditExceptions,
    ...shiftExceptions,
  ];

  const filtered = activeCategory === 'ALL' 
    ? allExceptions 
    : allExceptions.filter(e => e.category === activeCategory);

  const criticalCount = allExceptions.filter(e => e.severity === 'CRITICAL').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in select-none">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="h-16 bg-slate-900 text-white px-5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Exception Center & Actionable Alerts</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                  {criticalCount} Critical
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Unified operational radar for stockouts, expiring batches, credit limits & shifts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Categories Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 flex items-center gap-2 shrink-0">
          {[
            { key: 'ALL', label: `All Alerts (${allExceptions.length})` },
            { key: 'STOCK', label: `Low Stock (${stockExceptions.length})` },
            { key: 'EXPIRY', label: `Expiries (${expiryExceptions.length})` },
            { key: 'CREDIT', label: `Overdue / Credit (${creditExceptions.length})` },
            { key: 'SHIFTS', label: `Shift Discrepancies (${shiftExceptions.length})` },
          ].map(c => {
            const isActive = activeCategory === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setActiveCategory(c.key as any)}
                className={`px-3 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Zero Exceptions Found</h3>
                <p className="text-xs text-slate-500 mt-0.5">All stock, expiries, receivables, and shifts are healthy!</p>
              </div>
            </div>
          ) : (
            filtered.map(exc => (
              <div 
                key={exc.id} 
                className={`p-4 rounded-xl border bg-white flex items-center justify-between gap-4 shadow-2xs transition-all hover:border-blue-300 ${
                  exc.severity === 'CRITICAL' ? 'border-red-200 ring-1 ring-red-500/10' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg mt-0.5 ${
                    exc.severity === 'CRITICAL' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {exc.category === 'STOCK' ? <Package className="w-4 h-4" /> :
                     exc.category === 'EXPIRY' ? <Clock className="w-4 h-4" /> :
                     exc.category === 'CREDIT' ? <CreditCard className="w-4 h-4" /> :
                     <ShieldAlert className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{exc.title}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        exc.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {exc.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{exc.description}</p>
                  </div>
                </div>

                <button
                  onClick={exc.action}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-colors"
                >
                  <span>{exc.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-14 bg-white border-t border-slate-200 px-5 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Total exceptions requiring attention: <span className="font-bold text-slate-800">{allExceptions.length}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
          >
            Close Exceptions
          </button>
        </div>

      </div>
    </div>
  );
};
