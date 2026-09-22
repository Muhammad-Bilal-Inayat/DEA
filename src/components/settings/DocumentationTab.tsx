import React, { useState } from 'react';
import { 
  BookOpen, Search, Keyboard, Layers, ShoppingCart, 
  Package, Users, Printer, Percent, ShieldCheck, Database, 
  Sparkles, CheckCircle2, ChevronRight, Zap, Copy, 
  Check, FileText, ExternalLink, HelpCircle, ArrowRight,
  Clock, Hash, Sliders, AlertTriangle, Phone, Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DocChapter {
  id: string;
  title: string;
  badge?: string;
  icon: any;
  summary: string;
  sections: {
    title: string;
    description: string;
    steps?: string[];
    shortcuts?: { keys: string[]; action: string }[];
    example?: {
      scenario: string;
      inputs: string[];
      result: string;
    };
    proTip?: string;
  }[];
}

const DOCUMENTATION_DATA: DocChapter[] = [
  {
    id: 'offline-pwa-engine',
    title: '0. 100% Offline Standalone PWA & Nano-Second Engine',
    badge: '100% Offline',
    icon: Zap,
    summary: 'How to install on your PC/Domain, run 100% offline tomorrow with zero internet, and experience sub-millisecond nano-second POS billing.',
    sections: [
      {
        title: 'Desktop PC & Domain Standalone Installation',
        description: 'Install 13 Pharma Inventory Manager as a standalone native desktop app directly from your domain or local network without requiring third-party runtime installers.',
        steps: [
          '1. Open your live domain in Google Chrome, Microsoft Edge, or Brave Browser.',
          '2. Look for the "Install Software" / "Install App" button in the top navigation bar, or click the Install icon (⊕ / 💻) in your browser address bar.',
          '3. Click "Install" to create a dedicated standalone desktop app with its own taskbar shortcut and isolated high-performance window.',
          '4. Once installed, the Service Worker precaches all application assets, fonts, icons, sound effects, and invoice layouts into persistent offline storage.'
        ],
        shortcuts: [
          { keys: ['Click', 'Install App'], action: 'Trigger Native PWA Desktop Installation' },
          { keys: ['Address Bar', '⊕'], action: 'Native Browser Install Prompt' }
        ],
        proTip: 'On mobile tablets and phones (Android / iOS Safari), select "Add to Home Screen" from the browser menu to enable full-screen POS mode.'
      },
      {
        title: 'Zero-Internet Next-Day Working (PC Shutdown Survival)',
        description: 'Guarantees that your pharmacy software opens and works 100% offline tomorrow morning even if your internet connection is down or your PC was turned off overnight.',
        steps: [
          '1. Storage Persistence: The system automatically invokes navigator.storage.persist() upon boot, ensuring the operating system never purges your local IndexedDB.',
          '2. Complete Catalog Available Offline: All medicines, batches, previous invoices, customer balances, and supplier accounts are securely preserved in IndexedDB.',
          '3. Offline Sales & Invoices: Create sales, scan barcodes, print thermal bills, inward purchases, record expenses, and close cashier shifts completely offline.',
          '4. Transparent Offline Indicator: An active "100% Offline Mode (Ready)" badge appears in the header whenever the internet disconnects, confirming that all operations remain fully functional.'
        ],
        proTip: 'You can test offline mode anytime by disconnecting Wi-Fi or enabling Airplane mode; the software responds instantly with 0ms interruption.'
      },
      {
        title: 'Nano-Second POS Billing & Non-Blocking Background Sync',
        description: 'How local L1 in-memory caching and detached microtasks deliver instantaneous, zero-latency bill generation and background cloud queueing.',
        steps: [
          '1. Instant L1 Cache Write: When clicking "Save & Print" or "Complete Invoice", data is written to an in-memory fast store in under 0.05ms.',
          '2. Asynchronous Durable Commit: IndexedDB commits the record locally in the background without freezing the UI thread.',
          '3. Detached Background Sync Queue: Cloud synchronization (Firebase / VPS Master Server) runs via detached microtasks. Network latency never slows down cashier checkout.',
          '4. Automatic Cloud Catch-up: When internet returns, all queued offline invoices, stock updates, and payments automatically sync in the background.'
        ],
        example: {
          scenario: 'Internet goes down during peak rush hour. Cashier bills 40 consecutive customers with thermal receipts.',
          inputs: [
            'Scan barcode -> Press Enter -> Type Cash -> Press Enter',
            'Bill saves in <1ms without any spinning wheel or lag',
            'Stock decrements locally in real time'
          ],
          result: 'All 40 sales save instantaneously. When internet restores, background queue syncs all 40 invoices to Firebase automatically.'
        }
      }
    ]
  },
  {
    id: 'keyboard-fast-pos',
    title: '1. Fast POS & Pure Keyboard Billing',
    badge: 'Core POS',
    icon: Keyboard,
    summary: 'Master full invoice creation, customer lookup, rapid medicine scanning, and instant checkout using only keyboard shortcuts.',
    sections: [
      {
        title: 'The 10-Second Keyboard Checkout Workflow',
        description: 'Designed for high-traffic retail pharmacy counters where billers handle 100+ customers per hour without reaching for the mouse.',
        steps: [
          '1. Focus Customer Box (F1): Type the first 2 letters or phone number. Arrow Down and press Enter to select, or press Tab to proceed as Walk-in Customer.',
          '2. Rapid Item Search (F2): The cursor automatically moves to the Rapid Search bar. Type medicine name or scan physical barcode.',
          '3. Add Quantity & Price: Press Enter on the suggestion to fill name and default price. Cursor jumps to Qty. Enter quantity, press Tab/Enter.',
          '4. Commit Row: Press Enter on the row to add it to the invoice list. The cursor instantly resets to the search bar for the next medicine.',
          '5. Jump to Payment: Once all medicines are entered, press Enter on the empty search bar to jump directly to Received Cash.',
          '6. One-Key Save: Type received amount and press Enter. The Confirmation modal appears with "Confirm & Save" auto-focused. Hit Enter to finalize immediately.'
        ],
        shortcuts: [
          { keys: ['F1'], action: 'Focus Customer / Supplier Search' },
          { keys: ['F2'], action: 'Focus Rapid Medicine Search Bar' },
          { keys: ['Enter'], action: 'Select Suggestion / Commit Item Row / Save confirmation' },
          { keys: ['Tab'], action: 'Next Field (Qty -> Unit -> Price -> Disc)' },
          { keys: ['Enter', '(empty)'], action: 'Jump from empty search bar to Paid Amount' },
          { keys: ['Ctrl', 'S'], action: 'Direct Quick Save (0ms latency)' },
          { keys: ['Ctrl', 'P'], action: 'Save & Generate Thermal/A4 Print Receipt' },
          { keys: ['Alt', 'N'], action: 'Save & Open Fresh Invoice Tab for next customer' }
        ],
        example: {
          scenario: 'Customer wants 2 boxes of Panadol 500mg and 1 bottle of Brufen Syrup paying Rs. 500 cash.',
          inputs: [
            'F1 -> "Walk-in" -> Enter',
            'F2 -> "Pana" -> Down Arrow -> Enter -> Qty "2" -> Enter',
            '"Brufen" -> Down Arrow -> Enter -> Qty "1" -> Enter',
            'Press Enter on empty search box -> cursor jumps to Paid Amount',
            'Type "500" -> Press Enter -> Press Enter to Save & Close'
          ],
          result: 'Total Time: ~6 seconds. Stock deducted instantly, cash register updated, receipt ready.'
        },
        proTip: 'You can disable confirmation popups or adjust auto-popup behavior anytime in Settings > Invoice Billing tab.'
      },
      {
        title: 'Multi-Tab & Split-Screen Billing',
        description: 'Hold a customer bill when a patient steps away to get cash or additional prescriptions, without losing your active items.',
        steps: [
          'Press Ctrl+T or click the "+" button in the top tab bar to spawn a new concurrent sale tab.',
          'Invoice number increments automatically (e.g. INV-20261024).',
          'Serve Customer B and complete the bill.',
          'Press Ctrl+Tab or click Tab #1 to resume Customer A where you left off.'
        ],
        shortcuts: [
          { keys: ['Ctrl', 'T'], action: 'Open New Concurrent Tab' },
          { keys: ['Ctrl', 'Tab'], action: 'Cycle forward through open billing tabs' },
          { keys: ['Ctrl', 'W'], action: 'Close current bill tab' }
        ],
        proTip: 'All tabs maintain independent carts, customer selections, discounts, and payment modes simultaneously.'
      },
      {
        title: 'Historical Rates & Last 5 Purchase/Sale Rates',
        description: 'Automatically view the previous 5 purchase or sale rates for this customer/supplier directly from the medicine search table.',
        steps: [
          'Enable "Show Historical Rate Dropdown" in Settings > Invoice Billing.',
          'When focusing any medicine in the table, the previous unit rate, invoice number, and date pop up instantly.',
          'Press Tab or Enter to accept the previous rate or override with custom pricing.'
        ]
      }
    ]
  },
  {
    id: 'purchases-inward',
    title: '2. Purchases & Stock Inward Management',
    badge: 'Inventory Inflow',
    icon: ShoppingCart,
    summary: 'Receive vendor consignments, allocate batch numbers, assign expiry dates, track landed costs and supplier balances.',
    sections: [
      {
        title: 'Stock Inward Purchase Entry Workflow',
        description: 'Accurately enter distributor bills with batch allocation, bonus quantities, trade discounts, and GST calculation.',
        steps: [
          '1. Open Purchases > Add Purchase (or press Alt+P).',
          '2. Select Supplier: Press F1 to search distributor (e.g. "Getz Pharma Distributor").',
          '3. Enter Bill / Inward DC No: Type the supplier physical invoice number.',
          '4. Item Entry (F2): Scan barcode or search medicine name.',
          '5. Batch & Expiry: Input Batch # (e.g. "B204-A") and Expiry (e.g. "12/28").',
          '6. Rates & Margin: Input Purchase Rate (Wholesale Cost) and MRP (Sale Retail Price). The system calculates profit margin % automatically.',
          '7. Expenses & Freight: Add extra freight, shipping, or handling charges to calculate landed unit costs.',
          '8. Save & Balance: Press Ctrl+S to save. Supplier ledger updates immediately.'
        ],
        shortcuts: [
          { keys: ['F1'], action: 'Focus Supplier Search' },
          { keys: ['F2'], action: 'Focus Medicine Search in Purchase Table' },
          { keys: ['Ctrl', 'S'], action: 'Save Inward Purchase Bill' },
          { keys: ['Alt', 'N'], action: 'Save & Inward Next Bill' }
        ],
        example: {
          scenario: 'Received 50 boxes of Augmentin 625mg from OBS Pharma at Rs. 320/box (MRP Rs. 410/box), Batch OBS-992, Exp 06/2028.',
          inputs: [
            'Supplier: OBS Pharma Distributor',
            'Item: Augmentin 625mg Tab | Batch: OBS-992 | Exp: 06/28',
            'Qty: 50 | Purchase Rate: 320 | MRP: 410',
            'Discount: 5% Trade Discount | Tax: 0% Exemption'
          ],
          result: 'Inventory increased by 50 boxes with specific batch tracking. OBS ledger credited with Rs. 15,200.'
        }
      },
      {
        title: 'Purchase Returns (Debit Notes)',
        description: 'Return damaged, short-expiry, or recalled stock back to the pharmaceutical distributor.',
        steps: [
          'Switch transaction toggle from "Purchase" to "Purchase Return".',
          'Select the supplier and choose the exact batch being returned.',
          'System decrements stock and debits the supplier ledger automatically.'
        ]
      }
    ]
  },
  {
    id: 'inventory-items',
    title: '3. Item Master, Batches & Controlled Drugs',
    badge: 'Master Catalog',
    icon: Package,
    summary: 'Manage medicine formulations, strip/box unit conversions, near-expiry alerts, and Form 7/8 controlled drug registers.',
    sections: [
      {
        title: 'Medicine Master & Packaging Conversions',
        description: 'Define multi-tier units (Box -> Strip -> Tablet/Capsule) so your pharmacy can sell either whole packs or loose tablets.',
        steps: [
          'Navigate to Inventory > Add Item.',
          'Set Item Name, Generic Salt Composition (e.g. "Paracetamol 500mg"), Brand/Company.',
          'Configure Units: Base unit "Tablet", Packaging unit "Box", Conversion factor "1 Box = 200 Tablets (10 strips x 20 tabs)".',
          'Set Minimum Re-order Alert Level: Receive warning when stock falls below 5 boxes.'
        ],
        example: {
          scenario: 'Panadol 500mg box contains 20 strips of 10 tablets (200 tablets total).',
          inputs: [
            'Box MRP: Rs. 600',
            'Strip Rate: Rs. 30',
            'Per Tablet: Rs. 3'
          ],
          result: 'When cashier bills 2 Strips, stock deducts 20 tablets, keeping total inventory mathematically accurate.'
        }
      },
      {
        title: 'Controlled & Narcotic Drug Registry (Schedule B & G)',
        description: 'Maintain strict legal compliance for sedatives, narcotics, and prescription-only medications with patient and doctor tracking.',
        steps: [
          'In Settings > Controlled & Generic Suite, toggle "Strict Doctor / Prescription Enforcement".',
          'When selling a controlled drug (e.g. Xanax, Rivotril, Tramadol), the POS requires entering Prescribing Doctor Name, PMDC/License No, and Patient CNIC/Phone.',
          'Export automated Ministry of Health Inspection Registers with 1-click.'
        ]
      }
    ]
  },
  {
    id: 'parties-ledgers',
    title: '4. Parties, Customer & Supplier Ledgers',
    badge: 'Accounting',
    icon: Users,
    summary: 'Track receivables, credit limits, payment vouchers, WhatsApp balance reminders, and complete statement of accounts.',
    sections: [
      {
        title: 'Customer Credit Limits & Ledger Tracking',
        description: 'Manage institutional accounts (Clinics, Hospitals, Doctors, and Regular Patients) with automated credit ceilings.',
        steps: [
          'Navigate to Parties > Add Customer.',
          'Set Name, Phone Number, NTN/Tax Number, and Credit Limit (e.g. Rs. 50,000).',
          'Enable "Credit Sale" during billing: Balance is appended to customer ledger automatically.',
          'If credit limit is exceeded, system displays an authorization warning.'
        ]
      },
      {
        title: '1-Click WhatsApp Payment Reminders',
        description: 'Send professional statement summaries and payment reminders directly to customer mobile numbers.',
        steps: [
          'Go to Parties > Customer Ledger.',
          'Click the green "WhatsApp Reminder" button.',
          'The system drafts an individualized message with outstanding balance, invoice dates, and store bank account details.'
        ]
      }
    ]
  },
  {
    id: 'printing-customization',
    title: '5. Print Engine & Thermal Receipt Setup',
    badge: 'Hardware',
    icon: Printer,
    summary: 'Configure 80mm/3-inch thermal POS printers, 58mm pocket printers, and A4 professional medical invoices.',
    sections: [
      {
        title: 'Thermal 80mm POS Receipt Customization',
        description: 'Fine-tune thermal print layout for speed and minimal paper consumption.',
        steps: [
          'Open Settings > Print tab.',
          'Select Paper Format: "80mm Thermal (POS standard)", "58mm Thermal", or "A4 Medical Invoice".',
          'Toggle Columns: Choose whether to print Batch #, Expiry Date, HSN Code, Tax %, or Savings banner.',
          'Header & Footer: Upload store logo, pharmacy license registration number, and custom return policies (e.g. "Medicines not returned after 3 days; Cold chain items non-returnable").'
        ],
        proTip: 'For high-speed counter printing, configure browser print dialogue to "Silent Print" in Chrome/Edge flags.'
      }
    ]
  },
  {
    id: 'taxes-pricing',
    title: '6. Taxes, Margins & Pricing Formulas',
    badge: 'Financials',
    icon: Percent,
    summary: 'Set GST/Sales tax rules, automatic trade discount margins, and wholesale discount slabs.',
    sections: [
      {
        title: 'Tax Slabs & Exemption Rules',
        description: 'Handle exempt medicines, 1% / 18% standard GST rates, and withholding tax for corporate buyers.',
        steps: [
          'Navigate to Settings > Taxes tab.',
          'Configure Default Tax Rate (e.g. 0% for essential medicines, 18% for cosmetics/consumer goods).',
          'Set Tax Inclusive vs. Exclusive pricing rules.'
        ]
      }
    ]
  },
  {
    id: 'security-rbac',
    title: '7. Multi-User Roles (RBAC) & Period Lock',
    badge: 'Security',
    icon: ShieldCheck,
    summary: 'Manage 20+ user roles, prevent price tampering, lock previous accounting months, and activate stealth emergency mode.',
    sections: [
      {
        title: 'Role-Based Access Control',
        description: 'Assign specific permissions to Cashiers, Pharmacists, Store Managers, and Accountants.',
        steps: [
          'Go to Settings > Roles & RBAC.',
          'Create user accounts and assign role (e.g. "Cashier" can only create sales, cannot view profit margins or delete inventory).',
          'Admin accounts have unrestricted access to financial ledgers, audit logs, and settings.'
        ]
      },
      {
        title: 'Period Lock & Audit Safety',
        description: 'Lock past transaction dates to prevent retrospective editing of invoices after accounting closure.',
        steps: [
          'Navigate to Settings > Safety & Period Lock.',
          'Set Lock Date (e.g. "Last Month 31st"). All previous bills are locked into Read-Only state.'
        ]
      }
    ]
  },
  {
    id: 'sync-backup',
    title: '8. Cloud Sync, Offline POS & Data Backups',
    badge: 'Reliability',
    icon: Database,
    summary: 'Zero-latency background synchronization, offline operation during internet outages, and 1-click JSON/Excel backups.',
    sections: [
      {
        title: 'Zero-Latency Asynchronous Background Sync',
        description: 'Billing operations save to local memory immediately (0ms delay) while syncing to cloud Firestore in the background so your counter never lags.',
        steps: [
          'All Sales, Purchases, and Stock edits commit locally first.',
          'Background worker queues data and syncs with cloud database silently.',
          'If internet disconnects, billing continues uninterrupted in Offline Mode and auto-reconciles upon reconnection.'
        ]
      },
      {
        title: 'Manual & Automatic Data Backups',
        description: 'Download full encrypted database snapshots to local USB drives or secondary computers.',
        steps: [
          'Go to Settings > System Health & Sync (or Utilities).',
          'Click "Download Full JSON Snapshot" to save all items, parties, invoices, and ledgers in 1 file.'
        ]
      }
    ]
  },
  {
    id: 'fefo-inventory-system',
    title: '9. FEFO (First Expiry, First Out) Inventory System',
    badge: 'Pharma Core',
    icon: Layers,
    summary: 'Automated batch-wise priority dispatch, expired stock blocking, multi-batch split allocation, and weighted average cost calculations.',
    sections: [
      {
        title: 'FEFO Priority & Dispatch Engine',
        description: 'Ensures medications with the earliest valid expiry date are always sold first, minimizing medicine expiration waste and guaranteeing DRAP compliance.',
        steps: [
          '1. Sorting Priority: 1st by Expiry Date (Earliest -> Latest) -> 2nd by Inward Purchase Date (Oldest -> Newest) -> 3rd by Batch Number.',
          '2. Automatic POS Allocation: When a medicine is scanned or selected in POS, the system picks the #1 FEFO batch automatically without requiring cashier intervention.',
          '3. Multi-Batch Split Allocation: If an order requires 15 boxes but Batch A only has 10 boxes (Exp: June 2026) and Batch B has 20 boxes (Exp: Dec 2026), the engine automatically allocates 10 from Batch A and 5 from Batch B.',
          '4. Expired Stock Protection: Batches with past expiration dates or in Quarantine/Recalled status are strictly excluded from sale suggestions.'
        ],
        example: {
          scenario: 'Store has 2 batches of Augmentin 625mg: Batch BT-01 (10 boxes, Exp 05/2026) and Batch BT-02 (20 boxes, Exp 11/2026). Customer orders 12 boxes.',
          inputs: [
            'Scanned Augmentin 625mg',
            'Quantity: 12 boxes',
            'POS auto-resolves FEFO allocation'
          ],
          result: 'Batch BT-01: 10 boxes deducted (0 remaining). Batch BT-02: 2 boxes deducted (18 remaining). Customer receives freshest valid medication.'
        },
        proTip: 'In the Inventory screen, the "FEFO BATCHES & EXPIRY BREAKDOWN" panel highlights the active #1 First Out batch in green.'
      },
      {
        title: 'Batch Traceability & Recall Management',
        description: 'Track complete end-to-end lineage of any batch from manufacturer delivery to individual patient sales invoices.',
        steps: [
          'Open Inventory > Selected Product > Click Trace icon on any batch.',
          'View complete audit trail: Supplier Inward Bill #, Purchase Date, Landing Cost, Stock In, Stock Out, Invoices, and remaining balance.',
          'Quarantine/Recall: If DRAP or manufacturer issues a safety recall, 1-click Quarantine isolates the batch and blocks further sale.'
        ]
      },
      {
        title: 'Physical Stock Adjustments with FEFO Batch Selection',
        description: 'Reconcile physical inventory discrepancies directly at the batch level without compromising batch history.',
        steps: [
          'Open Inventory > Click "Adjust Stock" on any item.',
          'Select the specific Batch Number from the dropdown, or choose "+ Add to New Batch".',
          'Choose Adjustment Mode: Add (+), Reduce (-), or Set Exact (=).',
          'Select adjustment reason (Cycle Count, Damaged, Shortage) and confirm. Audit logs are generated automatically.'
        ]
      }
    ]
  }
];

export const DocumentationTab: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChapterId, setActiveChapterId] = useState<string>(DOCUMENTATION_DATA[0].id);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filter chapters/sections based on search
  const filteredChapters = DOCUMENTATION_DATA.filter(ch => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesChapter = ch.title.toLowerCase().includes(q) || ch.summary.toLowerCase().includes(q);
    const matchesSection = ch.sections.some(s => 
      s.title.toLowerCase().includes(q) || 
      s.description.toLowerCase().includes(q) ||
      (s.steps && s.steps.some(st => st.toLowerCase().includes(q))) ||
      (s.shortcuts && s.shortcuts.some(sc => sc.action.toLowerCase().includes(q) || sc.keys.join(' ').toLowerCase().includes(q)))
    );
    return matchesChapter || matchesSection;
  });

  const activeChapter = DOCUMENTATION_DATA.find(c => c.id === activeChapterId) || DOCUMENTATION_DATA[0];

  return (
    <div className="space-y-6 max-w-6xl pb-16 animate-in fade-in select-none text-slate-800">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-2xl shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-inner flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white uppercase">Software Documentation & User Manual</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-400/30">
                  Comprehensive Suite
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Complete operational guides, keyboard navigation workflows, pharmacy inventory rules, and configuration examples.
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72 flex-shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search documentation & guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800/90 border border-slate-600 rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Sidebar: Table of Contents */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Modules & Chapters</span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">{filteredChapters.length} Total</span>
          </div>

          <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
            {filteredChapters.map((ch) => {
              const Icon = ch.icon;
              const isActive = activeChapterId === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setActiveChapterId(ch.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 border border-blue-200 text-blue-900 shadow-2xs'
                      : 'hover:bg-slate-50 border border-transparent text-slate-700'
                  }`}
                >
                  <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs font-bold truncate ${isActive ? 'text-blue-900' : 'text-slate-800'}`}>
                        {ch.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{ch.summary}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Main Content: Active Chapter Content */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Chapter Header Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black border border-blue-200 uppercase tracking-wider">
                {activeChapter.badge || 'Guide'}
              </span>
              <button
                type="button"
                onClick={() => handleCopyText(JSON.stringify(activeChapter, null, 2), activeChapter.id)}
                className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1 font-semibold"
                title="Copy chapter details"
              >
                {copiedCode === activeChapter.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Section</span>
                  </>
                )}
              </button>
            </div>

            <h3 className="text-lg font-black text-slate-900 tracking-tight">{activeChapter.title}</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{activeChapter.summary}</p>
          </div>

          {/* Detailed Sections List */}
          {activeChapter.sections.map((section, idx) => (
            <div 
              key={idx}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4"
            >
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-black">
                    {idx + 1}
                  </span>
                  <span>{section.title}</span>
                </h4>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{section.description}</p>
              </div>

              {/* Step-by-Step Instructions */}
              {section.steps && section.steps.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Step-by-Step Instructions:
                  </span>
                  <ul className="space-y-1.5">
                    {section.steps.map((st, sIdx) => (
                      <li key={sIdx} className="text-xs text-slate-700 flex items-start gap-2 leading-relaxed">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Shortcuts Reference Table */}
              {section.shortcuts && section.shortcuts.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Associated Keyboard Shortcuts:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {section.shortcuts.map((sc, scIdx) => (
                      <div 
                        key={scIdx}
                        className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <span className="text-xs font-semibold text-slate-700">{sc.action}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {sc.keys.map((k, kIdx) => (
                            <kbd 
                              key={kIdx}
                              className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-black text-slate-800 shadow-2xs"
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Real World Concrete Example */}
              {section.example && (
                <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Real-World Scenario Example</span>
                  </div>
                  <p className="text-xs text-slate-700 italic font-medium">"{section.example.scenario}"</p>
                  
                  <div className="bg-white/90 p-3 rounded-lg border border-blue-100 space-y-1 text-xs">
                    <span className="text-[10px] font-bold text-blue-600 uppercase">Input Sequence:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-700 text-[11px]">
                      {section.example.inputs.map((inp, iIdx) => (
                        <li key={iIdx}>{inp}</li>
                      ))}
                    </ul>
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                      <span>Outcome:</span>
                      <span className="font-normal text-slate-800">{section.example.result}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pro Tip */}
              {section.proTip && (
                <div className="flex items-start gap-2 bg-amber-50/80 p-3 rounded-xl border border-amber-200 text-xs text-amber-900">
                  <Zap className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Pro Tip: </span>
                    <span>{section.proTip}</span>
                  </div>
                </div>
              )}

            </div>
          ))}

        </div>

      </div>

    </div>
  );
};
