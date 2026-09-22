import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, Zap, Package, Wallet, 
  Receipt, Building2, Coins, Eye, EyeOff, 
  Search, Printer, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { Medicine, Invoice, Supplier, Expense, CashierShift } from '../../types';

interface MobileDashboardViewProps {
  todayMetrics: {
    todaySale: number;
    todayInvoicesCount: number;
    todayCogs: number;
    todayExpenses: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
  };
  invoices: Invoice[];
  medicines: Medicine[];
  suppliers: Supplier[];
  expenses: Expense[];
  activeCashierShift: CashierShift | null;
  privacyMode: boolean;
  onTogglePrivacy: () => void;
  onPrintInvoice: (invoice: Invoice) => void;
  activeUserName: string;
}

export const MobileDashboardView: React.FC<MobileDashboardViewProps> = ({
  todayMetrics,
  invoices,
  medicines,
  suppliers,
  expenses: _expenses,
  activeCashierShift,
  privacyMode,
  onTogglePrivacy,
  onPrintInvoice,
  activeUserName
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'bills' | 'low_stock' | 'products' | 'cash'>('overview');
  const [quickSearch, setQuickSearch] = useState('');

  const maskValue = (val: number) => {
    if (privacyMode) return '••••••';
    return formatCurrency(val);
  };

  // Filter low stock medicines
  const lowStockList = medicines.filter(m => {
    const stock = Number(m.quantity || 0);
    const min = Number(m.lowStockThreshold || 10);
    return stock <= min;
  });

  // Filter recent invoices
  const recentInvoices = invoices.slice(0, 8);

  // Top products calculated
  const topProducts = medicines
    .map(m => ({
      ...m,
      salesCount: (invoices || []).reduce((sum, inv) => {
        const line = (inv.items || []).find(it => it.medicineId === m.id || it.name === m.name);
        return sum + (line?.quantity || 0);
      }, 0)
    }))
    .filter(m => m.salesCount > 0)
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 6);

  // Financial aggregates
  const totalReceivables = invoices.reduce((sum, inv) => sum + (Number(inv.balanceDue) || 0), 0);
  const totalPayables = suppliers.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);
  const totalStockValue = medicines.reduce((sum, m) => sum + ((Number(m.quantity) || 0) * (Number(m.purchasePrice) || Number(m.sellingPrice) || 0)), 0);

  // Search filtered medicines for quick mobile lookup
  const filteredQuickMedicines = quickSearch.trim() 
    ? medicines.filter(m => 
        m.name.toLowerCase().includes(quickSearch.toLowerCase()) || 
        m.genericName?.toLowerCase().includes(quickSearch.toLowerCase()) ||
        m.barcode?.toLowerCase().includes(quickSearch.toLowerCase())
      ).slice(0, 5)
    : [];

  return (
    <div className="space-y-3.5 pb-6">
      
      {/* 1. Mobile Welcome & Fast Action Bar */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-2xl p-4 shadow-lg border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">Pharmacy POS & ERP</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h2 className="text-base font-black tracking-tight text-white">
              Welcome, {activeUserName || 'Cashier'}
            </h2>
          </div>

          <button
            onClick={onTogglePrivacy}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
            title={privacyMode ? "Disable Privacy Mode" : "Enable Privacy Mode"}
          >
            {privacyMode ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-slate-300" />}
            <span className="text-[10px]">{privacyMode ? 'Private' : 'Show'}</span>
          </button>
        </div>

        {/* 1-Tap Quick Action Buttons */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <button
            onClick={() => navigate('/sale/invoices?action=add')}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Receipt className="w-5 h-5 mb-1" />
            <span className="text-[10px] leading-tight text-center">+ Sale</span>
          </button>

          <button
            onClick={() => navigate('/billing')}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Zap className="w-5 h-5 mb-1 fill-current" />
            <span className="text-[10px] leading-tight text-center">POS Fast</span>
          </button>

          <button
            onClick={() => navigate('/purchase?action=add')}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <ShoppingCart className="w-5 h-5 mb-1" />
            <span className="text-[10px] leading-tight text-center">+ Purchase</span>
          </button>

          <button
            onClick={() => navigate('/items?action=add')}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Package className="w-5 h-5 mb-1" />
            <span className="text-[10px] leading-tight text-center">+ Item</span>
          </button>
        </div>
      </div>

      {/* 2. Instant Mobile Item & Price Lookup */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder="Quick Medicine / Barcode Price Check..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        {quickSearch && filteredQuickMedicines.length > 0 && (
          <div className="divide-y divide-slate-100 pt-1">
            {filteredQuickMedicines.map(med => (
              <div key={med.id} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{med.name}</div>
                  <div className="text-[10px] text-slate-500">Stock: <span className="font-bold text-blue-600">{med.quantity || 0}</span> | Rack: {med.rackLocation || 'A1'}</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-emerald-700">{formatCurrency(med.sellingPrice || 0)}</div>
                  <div className="text-[10px] text-slate-400">Price</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Mobile View Switcher Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'bills', label: `🧾 Recent Bills (${recentInvoices.length})` },
          { id: 'low_stock', label: `⚠️ Low Stock (${lowStockList.length})` },
          { id: 'products', label: '🔥 Top Items' },
          { id: 'cash', label: '💰 Cash & Ledger' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Tab Content: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          {/* Main Profit Card */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-white border-2 border-emerald-500/30 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                Today's Net Earnings
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-xs font-black">
                +{todayMetrics.profitMargin}% Margin
              </span>
            </div>

            <div className="my-2">
              <span className="text-3xl font-black text-emerald-950 tracking-tight">
                {maskValue(todayMetrics.netProfit)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200/60 text-center">
              <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-slate-500 font-semibold block">Gross Sales</span>
                <span className="text-xs font-black text-slate-900">{maskValue(todayMetrics.todaySale)}</span>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-slate-500 font-semibold block">Stock COGS</span>
                <span className="text-xs font-black text-slate-700">{maskValue(todayMetrics.todayCogs)}</span>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-slate-500 font-semibold block">Expenses</span>
                <span className="text-xs font-black text-rose-700">{maskValue(todayMetrics.todayExpenses)}</span>
              </div>
            </div>
          </div>

          {/* 2x2 Financial Matrix */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Sales Invoices */}
            <div 
              onClick={() => navigate('/sale/invoices')}
              className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-blue-400 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold">Today's Sales</span>
                <Receipt className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2">
                <span className="text-lg font-black text-slate-900">{maskValue(todayMetrics.todaySale)}</span>
                <span className="text-[10px] text-slate-500 block">{todayMetrics.todayInvoicesCount} invoices generated</span>
              </div>
            </div>

            {/* Cash in Hand */}
            <div 
              onClick={() => navigate('/cash-in-hand')}
              className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-emerald-400 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold">Cash in Hand</span>
                <Coins className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2">
                <span className="text-lg font-black text-slate-900">
                  {maskValue(activeCashierShift && activeCashierShift.expectedCash !== undefined ? activeCashierShift.expectedCash : (todayMetrics.todaySale - todayMetrics.todayExpenses))}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block">
                  {activeCashierShift ? 'Active Drawer' : 'Net Cash Position'}
                </span>
              </div>
            </div>

            {/* Customer Receivables */}
            <div 
              onClick={() => navigate('/parties')}
              className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-amber-400 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold">To Receive (Udhar)</span>
                <ArrowDownLeft className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2">
                <span className="text-lg font-black text-amber-900">{maskValue(totalReceivables)}</span>
                <span className="text-[10px] text-slate-500 block">Customer pending balance</span>
              </div>
            </div>

            {/* Supplier Payables */}
            <div 
              onClick={() => navigate('/purchase')}
              className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-rose-400 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold">To Pay (Suppliers)</span>
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
              </div>
              <div className="mt-2">
                <span className="text-lg font-black text-rose-900">{maskValue(totalPayables)}</span>
                <span className="text-[10px] text-slate-500 block">Distributor dues</span>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts to Modules */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">Quick Navigation</span>
              <span className="text-[10px] text-blue-600 font-semibold cursor-pointer" onClick={() => navigate('/reports')}>
                View All Reports →
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => navigate('/expenses')}
                className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 text-center font-bold text-slate-700"
              >
                <Wallet className="w-4 h-4 text-violet-600 mx-auto mb-1" />
                Expenses
              </button>

              <button
                onClick={() => navigate('/items')}
                className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 text-center font-bold text-slate-700"
              >
                <Package className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                Inventory
              </button>

              <button
                onClick={() => navigate('/parties')}
                className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 text-center font-bold text-slate-700"
              >
                <Building2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                Parties
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab Content: RECENT BILLS */}
      {activeTab === 'bills' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700">Recent Customer Invoices</span>
            <button 
              onClick={() => navigate('/sale/invoices?action=add')}
              className="text-xs font-black text-red-600 hover:underline"
            >
              + Create Bill
            </button>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
              No sales invoices generated yet today.
            </div>
          ) : (
            recentInvoices.map(inv => (
              <div 
                key={inv.id}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-blue-600">#{inv.invoiceNumber || inv.id}</span>
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[140px]">{inv.customerName || 'Walk-in Customer'}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    inv.balanceDue === 0 || inv.paymentType === 'Cash'
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {inv.balanceDue === 0 ? 'Paid' : (inv.paymentType || 'Pending')}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="text-slate-500 text-[11px]">
                    <span>{(inv.items || []).length} items</span> • <span>{inv.date || 'Today'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-sm">{formatCurrency(inv.grandTotal || 0)}</span>
                    <button
                      onClick={() => onPrintInvoice(inv)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Reprint Invoice"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 6. Tab Content: LOW STOCK ALERTS */}
      {activeTab === 'low_stock' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700">Items Needing Immediate Reorder</span>
            <button 
              onClick={() => navigate('/purchase?action=add')}
              className="text-xs font-black text-blue-600 hover:underline"
            >
              + Place PO
            </button>
          </div>

          {lowStockList.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-emerald-600 font-bold">
              ✓ All medicines are well-stocked above reorder threshold!
            </div>
          ) : (
            lowStockList.slice(0, 10).map(med => (
              <div 
                key={med.id}
                className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-2xs flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900">{med.name}</div>
                  <div className="text-[11px] text-slate-500">{med.manufacturer || 'Medicine'}</div>
                  <div className="text-[10px] text-rose-600 font-bold mt-0.5">
                    Stock: {med.quantity || 0} left (Min: {med.lowStockThreshold || 10})
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/purchase?action=add&medicine=${med.id}`)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 shadow-xs cursor-pointer"
                >
                  Reorder
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 7. Tab Content: TOP MEDICINES */}
      {activeTab === 'products' && (
        <div className="space-y-2.5">
          <span className="text-xs font-bold text-slate-700 px-1 block">Top High-Demand Medicines</span>

          {topProducts.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
              No product sales activity logged yet.
            </div>
          ) : (
            topProducts.map((prod, idx) => (
              <div 
                key={prod.id}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900">{prod.name}</div>
                    <div className="text-[10px] text-slate-500">{prod.salesCount} packs sold today</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black text-emerald-700 text-xs">{formatCurrency(prod.sellingPrice || 0)}</div>
                  <span className="text-[10px] text-slate-400">Stock: {prod.quantity || 0}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 8. Tab Content: CASH & LEDGER */}
      {activeTab === 'cash' && (
        <div className="space-y-3">
          {/* Shift Details */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Cashier Counter Drawer</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeCashierShift ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {activeCashierShift ? 'Shift In Progress' : 'Closed'}
              </span>
            </div>

            <div className="text-2xl font-black text-slate-900">
              {maskValue(activeCashierShift && activeCashierShift.expectedCash !== undefined ? activeCashierShift.expectedCash : (todayMetrics.todaySale - todayMetrics.todayExpenses))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => navigate('/cash-in-hand')}
                className="p-2 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-700 text-center"
              >
                Cash Denominations
              </button>
              <button
                onClick={() => navigate('/bank')}
                className="p-2 bg-blue-50 rounded-xl border border-blue-200 font-bold text-blue-700 text-center"
              >
                Bank Transfers
              </button>
            </div>
          </div>

          {/* Valuation Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 font-semibold block">Total Catalog Stock Valuation</span>
              <span className="text-xl font-black text-slate-900">{maskValue(totalStockValue)}</span>
            </div>
            <Package className="w-8 h-8 text-blue-600 bg-blue-50 p-1.5 rounded-xl" />
          </div>
        </div>
      )}

    </div>
  );
};
