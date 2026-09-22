import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';

interface AddMoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  title: string;
  subTitle?: string;
  shortcut: string;
  path: string;
  altKey: string;
}

const SALE_ITEMS: MenuItem[] = [
  { title: 'Sale Invoice', shortcut: 'ALT + S', path: '/sale/invoices?action=add', altKey: 's' },
  { title: 'Payment-In', shortcut: 'ALT + I', path: '/sale/payment-in?action=add', altKey: 'i' },
  { title: 'Sale Return', subTitle: 'Cr Note', shortcut: 'ALT + R', path: '/sale/return?action=add', altKey: 'r' },
  { title: 'Sale Order', shortcut: 'ALT + F', path: '/sale/order?action=add', altKey: 'f' },
  { title: 'Estimate/Quotation', shortcut: 'ALT + M', path: '/sale/estimate?action=add', altKey: 'm' },
  { title: 'Delivery Challan', shortcut: 'ALT + D', path: '/sale/challan?action=add', altKey: 'd' },
];

const PURCHASE_ITEMS: MenuItem[] = [
  { title: 'Purchase Bill', shortcut: 'ALT + P', path: '/purchase?action=add', altKey: 'p' },
  { title: 'Payment-Out', shortcut: 'ALT + O', path: '/purchase/payment-out?action=add', altKey: 'o' },
  { title: 'Purchase Return', subTitle: 'Dr Note', shortcut: 'ALT + L', path: '/purchase/return?action=add', altKey: 'l' },
  { title: 'Purchase Order', shortcut: 'ALT + G', path: '/purchase/order?action=add', altKey: 'g' },
];

const OTHER_ITEMS: MenuItem[] = [
  { title: 'Shortage Register', subTitle: 'Lost Demand', shortcut: 'ALT + K', path: '/shortage-registry', altKey: 'k' },
  { title: 'Expenses', shortcut: 'ALT + E', path: '/expenses?action=add', altKey: 'e' },
  { title: 'Party To Party Transfer', shortcut: 'ALT + J', path: '/bank?action=transfer', altKey: 'j' },
];

export const AddMoreMenu: React.FC<AddMoreMenuProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={menuRef}
      className="absolute right-0 top-full mt-2 w-[620px] max-w-[95vw] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none text-slate-800"
      style={{ filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.15))' }}
    >
      {/* Top pointer arrow */}
      <div className="absolute top-0 right-14 -translate-y-1/2 w-3.5 h-3.5 bg-white border-t border-l border-slate-200 rotate-45" />

      {/* Main 3-Column Content Grid */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10 bg-white">
        
        {/* Column 1: SALE */}
        <div className="space-y-3">
          <h4 className="font-black text-slate-800 text-[13px] tracking-wider uppercase pb-1 border-b border-slate-100">
            SALE
          </h4>
          <div className="space-y-2.5">
            {SALE_ITEMS.map((item) => (
              <button
                key={item.title}
                onClick={() => handleNavigate(item.path)}
                className="w-full text-left group flex items-start justify-between gap-1 hover:text-blue-600 transition-colors py-0.5"
              >
                <div className="flex items-start gap-1.5 min-w-0">
                  <Play className="w-2.5 h-2.5 fill-blue-600 text-blue-600 mt-1 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-slate-800 group-hover:text-blue-600 group-hover:underline underline-offset-2 truncate">
                      {item.title}
                    </p>
                    {item.subTitle && (
                      <p className="text-[10px] text-slate-400 font-medium -mt-0.5">
                        {item.subTitle}
                      </p>
                    )}
                  </div>
                </div>

                <span className="text-[11px] font-mono text-slate-500 group-hover:text-blue-600 flex-shrink-0 font-medium">
                  {item.shortcut}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Column 2: PURCHASE */}
        <div className="space-y-3">
          <h4 className="font-black text-slate-800 text-[13px] tracking-wider uppercase pb-1 border-b border-slate-100">
            PURCHASE
          </h4>
          <div className="space-y-2.5">
            {PURCHASE_ITEMS.map((item) => (
              <button
                key={item.title}
                onClick={() => handleNavigate(item.path)}
                className="w-full text-left group flex items-start justify-between gap-1 hover:text-blue-600 transition-colors py-0.5"
              >
                <div className="flex items-start gap-1.5 min-w-0">
                  <Play className="w-2.5 h-2.5 fill-blue-600 text-blue-600 mt-1 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-slate-800 group-hover:text-blue-600 group-hover:underline underline-offset-2 truncate">
                      {item.title}
                    </p>
                    {item.subTitle && (
                      <p className="text-[10px] text-slate-400 font-medium -mt-0.5">
                        {item.subTitle}
                      </p>
                    )}
                  </div>
                </div>

                <span className="text-[11px] font-mono text-slate-500 group-hover:text-blue-600 flex-shrink-0 font-medium">
                  {item.shortcut}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Column 3: OTHERS */}
        <div className="space-y-3">
          <h4 className="font-black text-slate-800 text-[13px] tracking-wider uppercase pb-1 border-b border-slate-100">
            OTHERS
          </h4>
          <div className="space-y-2.5">
            {OTHER_ITEMS.map((item) => (
              <button
                key={item.title}
                onClick={() => handleNavigate(item.path)}
                className="w-full text-left group flex items-start justify-between gap-1 hover:text-blue-600 transition-colors py-0.5"
              >
                <div className="flex items-start gap-1.5 min-w-0">
                  <Play className="w-2.5 h-2.5 fill-blue-600 text-blue-600 mt-1 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-slate-800 group-hover:text-blue-600 group-hover:underline underline-offset-2 truncate">
                      {item.title}
                    </p>
                    {item.subTitle && (
                      <p className="text-[10px] text-slate-400 font-medium -mt-0.5">
                        {item.subTitle}
                      </p>
                    )}
                  </div>
                </div>

                <span className="text-[11px] font-mono text-slate-500 group-hover:text-blue-600 flex-shrink-0 font-medium">
                  {item.shortcut}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Yellowish / Gold Banner matching Screenshot exactly */}
      <div className="bg-[#fff1a8] px-6 py-2.5 flex items-center justify-start gap-2 text-xs font-semibold text-slate-800 border-t border-[#f0de88]">
        <span>Shortcut to open this menu :</span>
        <div className="flex items-center gap-1">
          <kbd className="px-2 py-0.5 bg-white text-slate-900 rounded font-bold shadow-xs border border-amber-300/80 text-[11px]">
            Ctrl
          </kbd>
          <span className="text-slate-600 font-bold">+</span>
          <kbd className="px-2 py-0.5 bg-white text-slate-900 rounded font-bold shadow-xs border border-amber-300/80 text-[11px]">
            Enter
          </kbd>
        </div>
      </div>
    </div>
  );
};
