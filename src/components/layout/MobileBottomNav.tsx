import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, X, FileText, ArrowUpRight, ArrowDownLeft, RotateCcw, 
  ShoppingBag, FileSpreadsheet, FileCheck, Truck, ShoppingCart, 
  RotateCw, PackagePlus, Wallet, ArrowLeftRight, IndianRupee, AlertTriangle
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMobileMenu?: () => void;
  onOpenQuickMenu?: () => void;
  isQuickMenuOpen?: boolean;
  onOpenScanner?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ 
  onOpenMobileMenu
}) => {
  const navigate = useNavigate();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleOpenAddSale = () => {
    navigate('/billing?action=add');
    window.dispatchEvent(new CustomEvent('mbi-open-add-sale'));
  };

  const handleOpenAddPurchase = () => {
    navigate('/purchase?action=add');
    window.dispatchEvent(new CustomEvent('mbi-open-add-purchase'));
  };

  const handleAction = (path: string, eventName?: string) => {
    setIsSheetOpen(false);
    navigate(path);
    if (eventName) {
      window.dispatchEvent(new CustomEvent(eventName));
    }
  };

  return (
    <>
      {/* 1. Mobile Fixed Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800/90 px-3 py-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-2xl select-none">
        <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
          {/* Left: Add Sale Button (Red) */}
          <button
            type="button"
            onClick={handleOpenAddSale}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-red-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            title="Add Sale"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Sale</span>
          </button>

          {/* Center: Plus (+) Floating FAB Button */}
          <button
            type="button"
            onClick={() => setIsSheetOpen(prev => !prev)}
            className="-mt-5 w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-slate-900/35 border-[3.5px] border-white dark:border-[#0f172a] shrink-0 mx-1 transition-transform cursor-pointer"
            aria-label="Open Transactions Menu"
            title="Quick Transactions"
          >
            <Plus className={`w-6 h-6 stroke-[2.5] transition-transform duration-200 ${isSheetOpen ? 'rotate-45' : ''}`} />
          </button>

          {/* Right: Add Purchase Button (Blue) */}
          <button
            type="button"
            onClick={handleOpenAddPurchase}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            title="Add Purchase"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Purchase</span>
          </button>
        </div>
      </div>

      {/* 2. Transaction Sheet Modal (Exact to uploaded screenshot) */}
      {isSheetOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end justify-center p-0 animate-in fade-in duration-200 select-none"
          onClick={() => setIsSheetOpen(false)}
        >
          <div 
            className="bg-white dark:bg-[#0f172a] w-full rounded-t-[32px] max-h-[90vh] overflow-y-auto px-5 pt-5 pb-6 shadow-2xl border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-200 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Sheet Drag Handle */}
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-5 shrink-0" />

              {/* Section 1: Sale Transactions */}
              <div className="mb-6">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-3.5 px-1 tracking-tight">
                  Sale Transactions
                </h3>
                <div className="grid grid-cols-4 gap-y-4 gap-x-2 text-center">
                  {/* Sale invoices */}
                  <button
                    type="button"
                    onClick={() => handleAction('/billing?action=add', 'mbi-open-add-sale')}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900/40 shadow-2xs group-active:scale-90 transition-transform">
                      <div className="relative flex items-center justify-center">
                        <FileText className="w-6 h-6 stroke-[1.8]" />
                        <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5] absolute -top-1 -right-1 text-sky-600 dark:text-sky-400" />
                      </div>
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 text-center mt-1.5 leading-tight">
                      Sale invoices
                    </span>
                  </button>

                  {/* Payment-In */}
                  <button
                    type="button"
                    onClick={() => handleAction('/sale/payment-in?action=add', 'mbi-open-payment-in')}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900/40 shadow-2xs group-active:scale-90 transition-transform">
                      <div className="relative flex items-center justify-center">
                        <IndianRupee className="w-5.5 h-5.5 stroke-[1.8]" />
                        <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5] absolute -bottom-1 -left-1 text-sky-600 dark:text-sky-400" />
                      </div>
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 text-center mt-1.5 leading-tight">
                      Payment-In
                    </span>
                  </button>

                  {/* Cr. Note/ Sale Return */}
                  <button
                    type="button"
                    onClick={() => handleAction('/sale/return?action=add')}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900/40 shadow-2xs group-active:scale-90 transition-transform">
                      <RotateCcw className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 text-center mt-1.5 leading-tight">
                      Cr. Note/<br />Sale Return
                    </span>
                  </button>

                  {/* Sale Order */}
                  <button
                    type="button"
                    onClick={() => handleAction('/sale/order?action=add')}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900/40 shadow-2xs group-active:scale-90 transition-transform">
                      <ShoppingBag className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 text-center mt-1.5 leading-tight">
                      Sale Order
                    </span>
                  </button>

                  {/* Estimate/ Quotation */}
                  <button
                    type="button"
                    onClick={() => handleAction('/sale/quotation?action=add')}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900/40 shadow-2xs group-active:scale-90 transition-transform">
                      <FileSpreadsheet className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 text-center mt-1.5 leading-tight">
                      Estimate/<br />Quotation
                    </span>
                  </button>

                  {/* Proforma Invoice */}
                  <button
                    type="button"
                    onClick={() => handleAction('/billing?type=proforma&action=add')}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900/40 shadow-2xs group-active:scale-90 transition-transform">
                      <FileCheck className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 text-center mt-1.5 leading-tight">
                      Proforma<br />Invoice
                    </span>
                  </button>

                  {/* Delivery Challan */}
                  <button
                    type="button"
                    onClick={() => handleAction('/sale/challan?action=add')}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900/40 shadow-2xs group-active:scale-90 transition-transform">
                      <Truck className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 text-center mt-1.5 leading-tight">
                      Delivery<br />Challan
                    </span>
                  </button>
                </div>
              </div>

              {/* Section 2: Purchase Transactions */}
              <div className="mb-6">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-3.5 px-1 tracking-tight">
                  Purchase Transactions
                </h3>
                <div className="grid grid-cols-4 gap-y-4 gap-x-2 text-center">
                  {/* Purchase */}
                  <button
                    type="button"
                    onClick={() => handleAction('/purchase?action=add', 'mbi-open-add-purchase')}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900/40 shadow-2xs group-active:scale-90 transition-transform">
                      <ShoppingCart className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 text-center mt-1.5 leading-tight">
                      Purchase
                    </span>
                  </button>

                  {/* Payment-Out */}
                  <button
                    type="button"
                    onClick={() => handleAction('/purchase/payment-out?action=add', 'mbi-open-payment-out')}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900/40 shadow-2xs group-active:scale-90 transition-transform">
                      <div className="relative flex items-center justify-center">
                        <IndianRupee className="w-5.5 h-5.5 stroke-[1.8]" />
                        <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5] absolute -top-1 -right-1 text-sky-600 dark:text-sky-400" />
                      </div>
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 text-center mt-1.5 leading-tight">
                      Payment-Out
                    </span>
                  </button>

                  {/* Dr. Note/ Purchase Return */}
                  <button
                    type="button"
                    onClick={() => handleAction('/purchase/return?action=add')}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900/40 shadow-2xs group-active:scale-90 transition-transform">
                      <RotateCw className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 text-center mt-1.5 leading-tight">
                      Dr. Note/<br />Purchase Return
                    </span>
                  </button>

                  {/* Purchase Order */}
                  <button
                    type="button"
                    onClick={() => handleAction('/purchase/order?action=add')}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900/40 shadow-2xs group-active:scale-90 transition-transform">
                      <PackagePlus className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 text-center mt-1.5 leading-tight">
                      Purchase Order
                    </span>
                  </button>
                </div>
              </div>

              {/* Section 3: Other Transactions */}
              <div className="mb-4">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-3.5 px-1 tracking-tight">
                  Other Transactions
                </h3>
                <div className="grid grid-cols-4 gap-y-4 gap-x-2 text-center">
                  {/* Expenses */}
                  <button
                    type="button"
                    onClick={() => handleAction('/expenses?action=add', 'mbi-open-add-expense')}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900/40 shadow-2xs group-active:scale-90 transition-transform">
                      <Wallet className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 text-center mt-1.5 leading-tight">
                      Expenses
                    </span>
                  </button>

                  {/* Short Register */}
                  <button
                    type="button"
                    onClick={() => handleAction('/shortage-registry')}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/40 shadow-2xs group-active:scale-90 transition-transform">
                      <AlertTriangle className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 text-center mt-1.5 leading-tight">
                      Short<br />Register
                    </span>
                  </button>

                  {/* Party To Party Transfer */}
                  <button
                    type="button"
                    onClick={() => handleAction('/parties?action=transfer')}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900/40 shadow-2xs group-active:scale-90 transition-transform">
                      <ArrowLeftRight className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 text-center mt-1.5 leading-tight">
                      Party To Party<br />Transfer
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Centered Floating Dark Close (X) Button */}
            <div className="pt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setIsSheetOpen(false)}
                className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-90 text-white flex items-center justify-center shadow-lg shadow-slate-900/30 transition-all cursor-pointer"
                aria-label="Close Transactions Sheet"
                title="Close"
              >
                <X className="w-6 h-6 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


