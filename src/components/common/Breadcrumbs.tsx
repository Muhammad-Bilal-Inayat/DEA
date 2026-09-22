import React, { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, ChevronRight, Share2, Copy, Check, Sparkles, 
  Layers, Package, Users, ShoppingCart, FileText, Database, 
  Settings, Sliders, ShieldCheck, BarChart2, DollarSign, 
  HelpCircle, Store, Zap, Activity
} from 'lucide-react';
import { generateSchemaJsonLd, BreadcrumbItem } from '../../lib/seoManager';

interface BreadcrumbsProps {
  customItems?: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
  enableSchemaJsonLd?: boolean;
}

// Route segment friendly labels and icons mapping
const ROUTE_META_MAP: Record<string, { label: string; icon?: any }> = {
  'user': { label: 'Home Dashboard', icon: Home },
  'dashboard': { label: 'Executive Dashboard', icon: Home },
  'server': { label: 'Master Server Hub', icon: Sliders },
  'sale': { label: 'Sales & Invoicing', icon: ShoppingCart },
  'invoices': { label: 'Sale Invoices', icon: FileText },
  'quotation': { label: 'Quotations', icon: FileText },
  'estimate': { label: 'Estimates', icon: FileText },
  'payment-in': { label: 'Payment In', icon: DollarSign },
  'order': { label: 'Orders', icon: FileText },
  'challan': { label: 'Delivery Challan', icon: FileText },
  'return': { label: 'Returns & Credit', icon: FileText },
  'items': { label: 'Items & Medicine Catalog', icon: Package },
  'shortage-registry': { label: 'Shortage Registry', icon: Layers },
  'top-products': { label: 'Top Moving Medicines', icon: Activity },
  'parties': { label: 'Parties & Suppliers', icon: Users },
  'purchase': { label: 'Purchases & Bills', icon: Package },
  'bills': { label: 'Purchase Bills', icon: FileText },
  'payment-out': { label: 'Payment Out', icon: DollarSign },
  'expenses': { label: 'Expenses Manager', icon: DollarSign },
  'reports': { label: 'Reports & Analytics', icon: BarChart2 },
  'bank': { label: 'Bank & Accounts', icon: DollarSign },
  'accounts': { label: 'Bank Accounts', icon: DollarSign },
  'cash-in-hand': { label: 'Cash in Hand', icon: DollarSign },
  'shift-management': { label: 'Shift Management', icon: Activity },
  'shifts': { label: 'Cashier Shifts', icon: Activity },
  'sync-share': { label: 'Sync & Share', icon: Database },
  'utilities': { label: 'Utilities & Tools', icon: Settings },
  'settings': { label: 'System Settings', icon: Settings },
  'seo': { label: 'SEO Strategy & Optimization Hub', icon: Sparkles },
  'pricing': { label: 'Plans & Pricing', icon: DollarSign },
  'feedback': { label: 'Feedback & Support', icon: HelpCircle },
  'online-store': { label: 'Online Store Setup', icon: Store },
  'store': { label: 'E-Pharmacy Storefront', icon: Store },
  'products': { label: 'Medicine Catalog', icon: Package },
  'cart': { label: 'Shopping Cart', icon: ShoppingBag },
  'checkout': { label: 'Secure Checkout', icon: ShieldCheck },
  'track': { label: 'Order Tracking', icon: Activity },
};

function ShoppingBag(props: any) {
  return <ShoppingCart {...props} />;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  customItems,
  showHome = true,
  className = '',
  enableSchemaJsonLd = true
}) => {
  const location = useLocation();
  const [copied, setCopied] = React.useState(false);

  // Compute breadcrumb trail from URL path
  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    if (customItems && customItems.length > 0) {
      return customItems;
    }

    const segments = location.pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [];
    const isStore = location.pathname.startsWith('/store');

    if (showHome) {
      const isHomeOnly = segments.length === 0 || (segments.length === 1 && (segments[0] === 'user' || (!isStore && segments[0] === 'dashboard')));
      items.push({
        label: isStore ? 'Online Store' : 'Home',
        path: isStore ? '/store' : '/user',
        isCurrent: isHomeOnly
      });
    }

    let accumulatedPath = '';
    segments.forEach((seg, index) => {
      accumulatedPath += `/${seg}`;
      const isLast = index === segments.length - 1;
      const meta = ROUTE_META_MAP[seg.toLowerCase()] || {
        label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')
      };

      // Skip redundant leading 'user' or 'store' if home item already points to it
      if (showHome && index === 0) {
        if (seg === 'user') return;
        if (seg === 'store') return;
      }

      items.push({
        label: meta.label,
        path: accumulatedPath,
        isCurrent: isLast
      });
    });

    return items;
  }, [location.pathname, customItems, showHome]);

  // Inject Schema.org BreadcrumbList JSON-LD dynamically into Head
  useEffect(() => {
    if (!enableSchemaJsonLd || breadcrumbs.length === 0) return;

    const schemaData = generateSchemaJsonLd({
      type: 'BreadcrumbList',
      breadcrumbs
    });

    const scriptId = 'mbi-schema-breadcrumbs';
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = scriptId;
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(schemaData, null, 2);

    return () => {
      // Cleanup script on unmount
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [breadcrumbs, enableSchemaJsonLd]);

  const handleCopyUrl = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (breadcrumbs.length <= 1 && !customItems) {
    return null;
  }

  return (
    <nav 
      aria-label="Breadcrumb"
      className={`flex items-center justify-between py-2 px-3 sm:px-4 bg-slate-100/70 dark:bg-slate-900/60 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 mb-3 sm:mb-4 shadow-2xs transition-all overflow-hidden ${className}`}
    >
      <ol className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
        {breadcrumbs.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === breadcrumbs.length - 1 || item.isCurrent;

          return (
            <li key={`${item.path || 'crumb'}-${index}`} className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              {index > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0 select-none" />
              )}
              
              {isLast ? (
                <span 
                  aria-current="page"
                  className="font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs truncate max-w-[200px] sm:max-w-[320px] flex items-center gap-1.5"
                >
                  {isFirst && <Home className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                  <span className="truncate">{item.label}</span>
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1 hover:underline underline-offset-2 shrink-0"
                >
                  {isFirst && <Home className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />}
                  <span>{item.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {/* SEO & Canonical Sharing Helper */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0 ml-3 pl-3 border-l border-slate-200 dark:border-slate-800">
        <button
          onClick={handleCopyUrl}
          className="px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
          title="Copy canonical page URL with full breadcrumb route"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span>Copy URL</span>
            </>
          )}
        </button>
      </div>
    </nav>
  );
};
