import React, { useState, useMemo } from 'react';
import { 
  BookOpen, Search, Server, HardDrive, BarChart3, Globe, 
  Activity, Sliders, Users, Key, Smartphone, Database, 
  CreditCard, Sparkles, CheckCircle2, ChevronRight, Copy, 
  Check, ExternalLink, ShieldCheck, HelpCircle, Terminal, 
  Layers, Lock, Cpu, RefreshCw, FileText, ArrowRight,
  DollarSign, Flame, Zap, Download, Code, Filter, ShieldAlert,
  Wrench, CheckSquare, Sparkle, Tag, Eye
} from 'lucide-react';
import { DEFAULT_TENANT_FEATURE_TOGGLES } from '../../types';
import { getAllClientLicenses, getMasterAuditLogs } from '../../lib/masterServerService';

interface ServerDocumentationPanelProps {
  onSelectTab?: (tabKey: string) => void;
}

export interface DocArticle {
  id: string;
  category: 
    | 'Fleet & Tenants' 
    | 'Software Sales & Revenue' 
    | 'Storage & Quotas' 
    | 'Sync & Telemetry' 
    | 'Activity & Security' 
    | 'Features & Switchboard' 
    | 'Pricing & SaaS' 
    | 'SEO & Schema' 
    | 'Database & Cloud' 
    | 'Master Remote & 2FA';
  title: string;
  shortSummary: string;
  icon: any;
  targetTab?: string;
  badge?: string;
  detailedContent: {
    purpose: string;
    howItWorks: string[];
    parameters: { name: string; type: string; description: string }[];
    bestPractices: string[];
    errorHandling: string;
    accessControl?: string;
  };
}

// Exhaustive static knowledge articles for core server capabilities
const CORE_SERVER_ARTICLES: DocArticle[] = [
  {
    id: 'doc-sales-revenue-hub',
    category: 'Software Sales & Revenue',
    title: 'Software Sales, Custom Deals & Master Revenue Hub',
    shortSummary: 'Track commercial software sales in PKR, advance vs receivables, payment ledger, and client deal summaries.',
    icon: DollarSign,
    targetTab: 'sales_revenue',
    badge: 'New & Live',
    detailedContent: {
      purpose: 'Gives software owners full financial authority to record bespoke software sale prices, collect advances, track outstanding receivables, and generate WhatsApp commercial deal summaries for every pharmacy client.',
      howItWorks: [
        'When issuing or editing a license via Alt+M or the Server Console, administrators specify the custom Sale Price (PKR), Amount Paid, and Payment Method.',
        'The revenue engine automatically computes Amount Due (Receivable) and tags payment status as Paid in Full, Partial (Advance), or Pending.',
        'Central metrics aggregate Gross Software Sales Value, Total Revenue Collected, and Total Outstanding Receivables in real-time.',
        'Includes an automated WhatsApp Deal Ledger share generator that formats professional invoices and terms in Urdu/English.',
        'Provides an instant Payment Reconciliation action to mark remaining balances as paid directly from the ledger table.'
      ],
      parameters: [
        { name: 'salePrice', type: 'number (PKR)', description: 'Total agreed commercial software sale price' },
        { name: 'amountPaid', type: 'number (PKR)', description: 'Advance or full cash/bank amount received' },
        { name: 'amountDue', type: 'number (PKR)', description: 'Auto-calculated outstanding balance (salePrice - amountPaid)' },
        { name: 'saleStatus', type: 'enum (Paid | Partial | Pending | Trial)', description: 'Live commercial payment status' },
        { name: 'paymentMethod', type: 'enum (Cash | Bank | EasyPaisa/JazzCash | Cheque)', description: 'Settlement channel used for software purchase' }
      ],
      bestPractices: [
        'Record the exact payment transaction ID or bank receipt note in the license notes for audit transparency.',
        'Use the WhatsApp Deal Share feature immediately upon receiving advance payment to provide instant confirmation to pharmacy owners.',
        'Review the Pending Receivables metric weekly to follow up on partial milestone payments.'
      ],
      errorHandling: 'Invalid or negative pricing entries are automatically sanitized. Overpayments are flagged with clear adjustment notices.',
      accessControl: 'Strictly restricted to Master Server Administrators (Session authenticated via /server or Alt+M). Zero client portal exposure.'
    }
  },
  {
    id: 'doc-fleet-registry',
    category: 'Fleet & Tenants',
    title: 'Client Fleet & Multi-Tenant Registry',
    shortSummary: 'Central management of multi-branch pharmacies, license expirations, and remote provisioning.',
    icon: Server,
    targetTab: 'clients',
    detailedContent: {
      purpose: 'Enables the central server to oversee, monitor, and configure all connected pharmacy client branches, hospital counters, and franchise nodes from a unified registry.',
      howItWorks: [
        'Each pharmacy instance is assigned a unique Tenant UUID, branch business name, and isolated database namespace.',
        'The registry tracks real-time license statuses (Active, Expired, Suspended, or 3-Day Free Trial).',
        'Administrators can remotely lock or unlock any client tenant, regenerate license keys, or extend trial countdowns with a single click.',
        'Data replication status, active cashiers count, and last heartbeat timestamp are continuously updated.'
      ],
      parameters: [
        { name: 'Tenant Name', type: 'string', description: 'Legal trading name of the pharmacy branch' },
        { name: 'License Status', type: 'enum (Active | Trial | Expired | Suspended)', description: 'Current software operating authorization tier' },
        { name: 'Trial Expiry Date', type: 'ISO Timestamp', description: 'Calculated expiry cutoff timestamp' },
        { name: 'Max Branch Users', type: 'number', description: 'Allowed simultaneous cashier and operator accounts' }
      ],
      bestPractices: [
        'Regularly review tenants showing "Expired" status to verify renewal payments.',
        'Use the Search & Filter bar on the Client Fleet dashboard to quickly locate branches by city or phone number.'
      ],
      errorHandling: 'If a client is locked remotely, their local POS switches to read-only mode with an automated license renewal prompt.',
      accessControl: 'Accessible exclusively via authenticated Master Server session.'
    }
  },
  {
    id: 'doc-storage-monitor',
    category: 'Storage & Quotas',
    title: 'Tenant Storage Quota & 80% Capacity Thresholds',
    shortSummary: 'Real-time disk consumption tracking per tenant with color-coded warning alerts and custom quota overrides.',
    icon: HardDrive,
    targetTab: 'storage',
    detailedContent: {
      purpose: 'Prevents database overflow and monitors server disk consumption across all connected branch stores with automated warning thresholds.',
      howItWorks: [
        'Calculates real-time MB storage footprint per tenant, categorizing data into Invoices DB, Medicine Catalog, Audit Logs, and Offline Image Cache.',
        'Applies color-coded capacity thresholds: Emerald for <60% Normal, Amber for 60-80% Warning, and Rose for ≥80% Critical Threshold.',
        'Provides an interactive Manual Quota Override modal (50MB to 5000MB) for expanding high-volume branch capacities.',
        'Includes an automated Cache Purge routine that clears temporary image assets and expired session tokens.'
      ],
      parameters: [
        { name: 'storageUsedMb', type: 'number (MB)', description: 'Current physical disk allocation for the tenant' },
        { name: 'storageLimitMb', type: 'number (MB)', description: 'Hard quota ceiling assigned to the tenant (default: 500MB)' },
        { name: 'storageBreakdown', type: 'object', description: 'Itemized consumption across Invoices, Catalog, Logs, and Cache' }
      ],
      bestPractices: [
        'Set custom quotas of 1000MB+ for wholesale distributor branches with over 100,000 monthly invoices.',
        'Trigger the "Purge Cache" action before expanding physical quotas to reclaim unused storage.'
      ],
      errorHandling: 'When a tenant exceeds 100% quota, non-critical logging is compressed to ensure POS billing never halts.',
      accessControl: 'Master Server Admin only.'
    }
  },
  {
    id: 'doc-sync-health',
    category: 'Sync & Telemetry',
    title: '30-Day Sync Health & SLA Uptime Visualizer',
    shortSummary: 'Interactive Recharts telemetry plotting daily sync frequency, latency ms, and failure rate analysis.',
    icon: BarChart3,
    targetTab: 'sync_health',
    detailedContent: {
      purpose: 'Provides deep SLA reliability analytics for network synchronization across all client terminals over the past 30 days.',
      howItWorks: [
        'Aggregates all daily sync attempts, categorizing them into Successful Syncs and Failed Sync Attempts.',
        'Renders interactive Area and Bar charts displaying daily volume trends and average network latency in milliseconds.',
        'Calculates 30-day SLA Uptime % and Failure Rates per individual branch.',
        'Highlights network dropouts, socket timeouts, and cloud synchronization bottlenecks.'
      ],
      parameters: [
        { name: 'dailyMetrics.date', type: 'YYYY-MM-DD', description: 'Daily telemetry timestamp' },
        { name: 'dailyMetrics.successCount', type: 'number', description: 'Successful data synchronization runs' },
        { name: 'dailyMetrics.failureCount', type: 'number', description: 'Failed or rejected synchronization attempts' },
        { name: 'dailyMetrics.avgLatencyMs', type: 'number (ms)', description: 'Average server round-trip replication time' }
      ],
      bestPractices: [
        'Inspect branches with latency > 800ms to verify their local broadband or 4G connection stability.',
        'Verify that the SLA Uptime remains above 99.5% for all critical 24/7 emergency pharmacy counters.'
      ],
      errorHandling: 'Failed sync runs automatically queue locally in IndexedDB and retry using exponential backoff.',
      accessControl: 'Master Server Admin only.'
    }
  },
  {
    id: 'doc-multi-user-sync',
    category: 'Sync & Telemetry',
    title: 'Multi-User Live Sync Stream & Replication Engine',
    shortSummary: 'Bi-directional socket and cloud replication between multi-counter cashiers and central server.',
    icon: Activity,
    targetTab: 'sync_stream',
    detailedContent: {
      purpose: 'Ensures instantaneous data consistency between multiple billing counters, inventory stockrooms, and the central server database.',
      howItWorks: [
        'Employs multi-browser BroadcastChannel and Firestore WebSocket listeners for zero-latency replication.',
        'Provides both "Replicate All Fleet" and "Replicate Individual Tenant" triggers.',
        'Resolves concurrent editing conflicts using timestamp-based deterministic state merging.',
        'Operates in 100% offline-first mode: changes made during internet downtime automatically flush upon reconnection.'
      ],
      parameters: [
        { name: 'channel', type: 'BroadcastChannel', description: 'Local inter-tab and inter-window communication bus' },
        { name: 'queueSize', type: 'number', description: 'Pending offline transactions awaiting replication' },
        { name: 'syncDirection', type: 'Push / Pull / Bi-directional', description: 'Data replication flow orientation' }
      ],
      bestPractices: [
        'Click "Replicate All Fleet" after performing global catalog bulk updates.',
        'Ensure the "Live Stream" indicator in the server header shows green pulses.'
      ],
      errorHandling: 'Duplicate or out-of-order packets are automatically deduplicated using record UUID hashes.',
      accessControl: 'Master Server Admin & Synchronizer.'
    }
  },
  {
    id: 'doc-activity-feed',
    category: 'Activity & Security',
    title: 'Real-Time Activity Feed & Client IP Tracker',
    shortSummary: 'Live event stream tracking user operations, timestamps, and IP addresses with multi-select filtering.',
    icon: Globe,
    targetTab: 'activity',
    detailedContent: {
      purpose: 'Maintains an immutable, chronological security audit trail of all actions performed across all client terminals and operator accounts.',
      howItWorks: [
        'Streams live events categorized into SYNC, BILLING, AUTH, INVENTORY, SECURITY, BACKUP, and ADMIN.',
        'Captures client IP addresses, operator usernames, branch IDs, and exact millisecond timestamps.',
        'Features a multi-select activity type filter and an analytical date range picker (Today, Yesterday, Last 7/30 Days).',
        'Includes instant text search across descriptions, IP addresses, and operator names.'
      ],
      parameters: [
        { name: 'action', type: 'string', description: 'Specific operation executed (e.g., INVOICE_CREATED, LOGIN_SUCCESS)' },
        { name: 'clientIp', type: 'string', description: 'Public or local IP address of the originating machine' },
        { name: 'timestamp', type: 'ISO Timestamp', description: 'Exact server event logging time' },
        { name: 'category', type: 'enum', description: 'Activity domain classification' }
      ],
      bestPractices: [
        'Regularly filter by "SECURITY" and "AUTH" to detect unauthorized passcode attempts or unrecognized IP addresses.',
        'Export activity feeds as CSV before major financial closing periods.'
      ],
      errorHandling: 'All activity records are write-once and protected against deletion by standard operators.',
      accessControl: 'Immutable Audit Log Engine.'
    }
  },
  {
    id: 'doc-feature-switchboard',
    category: 'Features & Switchboard',
    title: 'Master Feature Switchboard (173 Controls Matrix)',
    shortSummary: 'Granular per-tenant toggle matrix controlling all POS, accounting, tax, and hardware modules.',
    icon: Sliders,
    targetTab: 'master_control',
    badge: '173 Controls',
    detailedContent: {
      purpose: 'Gives the central server full administrative authority to enable or disable specific software capabilities across client instances.',
      howItWorks: [
        'Organized into 8 functional categories: POS Billing, Inventory & Batches, Accounting & Tax, Hardware, Security, E-Commerce, UI, and Developer Tools.',
        'Toggles can be applied globally to all tenants or targeted specifically to individual client branches.',
        'Overrides take effect immediately on connected client terminals without requiring software reinstallations.',
        'Presets allow one-click configurations for "Retail Chemist", "Wholesale Distributor", or "Hospital Pharmacy".'
      ],
      parameters: [
        { name: 'featureKey', type: 'string (173 keys)', description: 'Unique identifier of the controlled module' },
        { name: 'isEnabled', type: 'boolean', description: 'Activation status for the targeted branch' },
        { name: 'scope', type: 'Global | Per-Tenant', description: 'Application radius of the toggle' }
      ],
      bestPractices: [
        'Disable "Wholesale B2B Invoicing" for small retail chemist shops to streamline their UI.',
        'Enable "Controlled Schedule-7 Register" for pharmacies dispensing narcotics or restricted pharmaceuticals.'
      ],
      errorHandling: 'If a module is toggled off while in active use, open transactions safely complete before the view hides.',
      accessControl: 'Master Server Admin only.'
    }
  },
  {
    id: 'doc-user-passcodes',
    category: 'Activity & Security',
    title: 'Operator Passcodes & Granular Role Matrix (RBAC)',
    shortSummary: 'Live operator tracking, emergency PIN resets, and 18 granular role-based permissions.',
    icon: Users,
    targetTab: 'users',
    detailedContent: {
      purpose: 'Enforces strict identity verification and role-based security across all cashier counters and administrative staff.',
      howItWorks: [
        'Displays all registered system operators across branches with live online/offline presence indicators.',
        'Allows central administrators to reset forgotten operator PINs/passcodes with a single click.',
        'Controls access across standard roles: Primary Admin, Store Manager, Pharmacist, Cashier, Biller, and Accountant.',
        'Provides 18 granular permissions over sensitive actions (e.g., editing past bills, deleting stock, overriding discounts, viewing purchase prices).'
      ],
      parameters: [
        { name: 'username', type: 'string', description: 'Unique login credential for the operator' },
        { name: 'role', type: 'UserRole', description: 'Assigned RBAC privilege profile' },
        { name: 'passcode', type: 'string (numeric PIN)', description: 'Encrypted screen lock and authorization PIN' },
        { name: 'permissions', type: 'MasterUserPermissions (18 flags)', description: 'Granular capability constraints' }
      ],
      bestPractices: [
        'Enforce unique 4-6 digit passcodes for every cashier to ensure accurate audit trail attribution.',
        'Restrict "Invoice Delete" and "View Purchase Cost" privileges exclusively to Primary Admin and Store Manager roles.'
      ],
      errorHandling: '3 consecutive incorrect passcode attempts trigger an automated terminal screen freeze.',
      accessControl: 'Master Server & Store Manager.'
    }
  },
  {
    id: 'doc-saas-pricing',
    category: 'Pricing & SaaS',
    title: 'Plans & Subscription Pricing Engine',
    shortSummary: 'Central editor for SaaS packages, multi-year discounts, PKR rates, and feature allocations.',
    icon: CreditCard,
    targetTab: 'pricing_manager',
    detailedContent: {
      purpose: 'Enables administrators to dynamically update software subscription plans, recurring prices in PKR, and feature entitlements without code deployment.',
      howItWorks: [
        'Configures 4 standard billing intervals: Monthly, 1-Year (Save 30%), 3-Years (Save 45%), and 5-Years (Save 60%).',
        'Allows editing of plan titles, visual badges (e.g. ⭐ Most Popular), max user limits, and branch quotas.',
        'Changes instantly synchronize to the customer-facing "/pricing" (Plans & Licensing) page in real-time.',
        'Supports creating custom enterprise tiers and configuring trial lengths (e.g., 3-day basic free trials).'
      ],
      parameters: [
        { name: 'pricing.monthly', type: 'number (PKR)', description: 'Monthly subscription rate in Pakistani Rupees' },
        { name: 'pricing.yearly', type: 'number (PKR)', description: 'Annual upfront license fee' },
        { name: 'maxUsers', type: 'number', description: 'Allowed cashier and team accounts under this tier' },
        { name: 'features', type: 'object', description: 'Module checklist included in this subscription package' }
      ],
      bestPractices: [
        'Set competitive multi-year rates (3 and 5 years) to encourage long-term pharmacy customer retention.',
        'Highlight "Business Pro" with the "Most Popular" badge to guide standard retail chemist conversions.'
      ],
      errorHandling: 'All pricing mutations trigger automatic validation to prevent negative numbers or invalid currency formats.',
      accessControl: 'Master Server Admin only.'
    }
  },
  {
    id: 'doc-seo-strategy',
    category: 'SEO & Schema',
    title: 'Central SEO Strategy, Meta Hub & Schema Engine',
    shortSummary: 'Master search engine indexing, Pharmacy Schema.org JSON-LD, OpenGraph cards, and robots directives.',
    icon: Sparkles,
    targetTab: 'seo_strategy',
    detailedContent: {
      purpose: 'Configures comprehensive technical SEO, Schema.org rich results, social sharing metadata, and automated robots indexing rules from the central master server.',
      howItWorks: [
        'Generates valid Pharmacy Schema.org JSON-LD structured data with OpeningHoursSpecification, geo-coordinates, and medical specialty tags.',
        'Manages dynamic meta tags, OpenGraph previews (WhatsApp, Twitter/X, Facebook, LinkedIn), and canonical link directives.',
        'Provides real-time robots.txt validation ensuring sensitive back-office endpoints (/server, /admin) remain hidden from public web crawlers.',
        'Controls 12-week off-page pharmaceutical backlink and content outreach roadmaps.'
      ],
      parameters: [
        { name: 'schemaType', type: 'string', description: 'Schema.org entity category (Pharmacy, MedicalBusiness, Store)' },
        { name: 'geoCoordinates', type: 'lat/long', description: 'Precise physical location for Google Maps Local SEO' },
        { name: 'robotsDirectives', type: 'string', description: 'Automated crawler rules for Disallow paths and XML sitemaps' }
      ],
      bestPractices: [
        'Keep /server, /admin, and internal billing endpoints strictly marked as noindex/Disallow in robots.txt.',
        'Verify JSON-LD output using Google Rich Results Test whenever pharmacy trading hours change.'
      ],
      errorHandling: 'Invalid Schema markup automatically falls back to standard MedicalBusiness baseline metadata.',
      accessControl: 'Master Server Admin only.'
    }
  },
  {
    id: 'doc-cloud-health',
    category: 'Database & Cloud',
    title: 'Cloud Data Synchronization & Real-time Health Diagnostics',
    shortSummary: 'Firestore queue monitor, live replication telemetry, latency checks, and database backups.',
    icon: HardDrive,
    targetTab: 'cloud_health',
    detailedContent: {
      purpose: 'Provides server administrators with deep visibility into cloud database persistence, pending sync queues, and network connection latency.',
      howItWorks: [
        'Monitors real-time sync state between local IndexedDB cash registers and Google Cloud Firestore.',
        'Displays exact record counts across all collections (invoices, inventory medicines, suppliers, audit logs, expenses).',
        'Runs real-time ping diagnostic routines to measure cloud synchronization round-trip latency in milliseconds.',
        'Provides instant manual backup generation and cloud queue flush commands.'
      ],
      parameters: [
        { name: 'queueLength', type: 'number', description: 'Count of pending offline mutations waiting for cloud push' },
        { name: 'latencyMs', type: 'number (ms)', description: 'Round-trip response latency to Firestore servers' },
        { name: 'collectionCounts', type: 'Record<string, number>', description: 'Live item count per database collection' }
      ],
      bestPractices: [
        'If latency exceeds 1200ms, check network connection or enable offline transaction mode.',
        'Perform a full JSON backup snapshot prior to major system updates or end-of-year reconciliations.'
      ],
      errorHandling: 'Failed sync mutations are safely stored in the local retry queue and retried with exponential backoff.',
      accessControl: 'Master Server Admin only.'
    }
  },
  {
    id: 'doc-db-clean-slate',
    category: 'Database & Cloud',
    title: 'Database Initializer & Clean-Slate Mode',
    shortSummary: 'Isolated database initialization with 0 items, sample dataset seeders, and factory resets.',
    icon: Database,
    targetTab: 'database',
    detailedContent: {
      purpose: 'Provides robust tools for initializing new store installations, clearing demo records, or executing clean-slate factory resets.',
      howItWorks: [
        'Allows starting fresh with a clean slate (0 products, 0 bills, 0 parties) ready for custom data entry.',
        'Provides a 3-Day Trial Dataset generator that populates realistic sample items, batches, and ledger entries for testing.',
        'Includes an encrypted JSON backup export and restore engine for complete disaster recovery.',
        'Includes IndexedDB schema health verification and database index optimization routines.'
      ],
      parameters: [
        { name: 'initMode', type: 'enum (Clean Slate | Demo Data | Restore)', description: 'Target database provisioning state' },
        { name: 'preserveSettings', type: 'boolean', description: 'Whether to retain store name, tax rates, and print templates' }
      ],
      bestPractices: [
        'Always create a full JSON database backup before running any clean-slate reset operation.',
        'Use the 3-Day Trial Dataset when training new cashier staff in a test environment.'
      ],
      errorHandling: 'Destructive resets require explicit confirmation and dual verification.',
      accessControl: 'Master Server Admin only.'
    }
  },
  {
    id: 'doc-master-remote-modal',
    category: 'Master Remote & 2FA',
    title: 'Master Remote Control Hub (`Alt+M` Stealth Modal)',
    shortSummary: 'Hardware fingerprint locks, remote kill-switch, instant data wipe, and stealth administrator modal.',
    icon: Wrench,
    badge: 'Shortcut: Alt+M',
    detailedContent: {
      purpose: 'Grants master administrators god-mode control to remotely license, bind hardware IDs, trigger remote locks, send screen alerts, or wipe client nodes from anywhere.',
      howItWorks: [
        'Accessible from any screen via global keyboard shortcut (Alt + M). Protected with master credentials.',
        'Enforces Strict Hardware Locking (CPU + Motherboard UUID binding) preventing license sharing across unauthorized PCs.',
        'Allows setting Max Offline Days (e.g., 7, 14, 30 days) before client terminal requires a remote master server heartbeat check.',
        'Allows dispatching remote commands: Emergency Screen Lock, Force Cloud Backup, Clear Cache, or Custom Screen Broadcasts.'
      ],
      parameters: [
        { name: 'strictHardwareLock', type: 'boolean', description: 'Ties license exclusively to registered machine hardware IDs' },
        { name: 'maxOfflineDays', type: 'number (days)', description: 'Maximum allowed offline grace period before mandatory heartbeat' },
        { name: 'boundHardwareIds', type: 'string[]', description: 'Cryptographic SHA-256 fingerprint hashes of authorized terminals' },
        { name: 'remoteCommand', type: 'enum', description: 'Action dispatched to client on next heartbeat ping' }
      ],
      bestPractices: [
        'Enable Strict Hardware Lock on all lifetime commercial licenses.',
        'Set Max Offline Days to 14 days for subscription plans to ensure recurring license compliance.'
      ],
      errorHandling: 'When a hardware mismatch occurs, client terminal displays a hardware migration approval screen.',
      accessControl: 'Master Super-Admin authenticated session.'
    }
  },
  {
    id: 'doc-security-2fa',
    category: 'Master Remote & 2FA',
    title: 'Server Security, 2FA Authenticator & Backup Codes',
    shortSummary: 'Time-based One-Time Password (TOTP) 2FA protection and emergency offline recovery PINs.',
    icon: Smartphone,
    targetTab: 'database',
    detailedContent: {
      purpose: 'Protects the Central Server from unauthorized administrative access with enterprise-grade multi-factor authentication.',
      howItWorks: [
        'Integrates standard RFC 6238 TOTP algorithms compatible with Google Authenticator, Authy, and Microsoft Authenticator.',
        'Generates 8 single-use emergency backup recovery codes for disaster access.',
        'Requires 6-digit TOTP verification for high-risk operations (e.g. database wipe, master toggle changes).',
        'Maintains encrypted session tokens with configurable auto-logout periods.'
      ],
      parameters: [
        { name: 'totpSecret', type: 'base32 string', description: 'Cryptographic seed for generating 6-digit verification codes' },
        { name: 'backupCodes', type: 'string[]', description: 'Hashed list of 8 emergency single-use recovery PINs' },
        { name: 'is2FAEnabled', type: 'boolean', description: 'Whether two-factor authorization is strictly enforced' }
      ],
      bestPractices: [
        'Print or securely store the 8 emergency backup codes in a physical safe.',
        'Enable 2FA immediately upon deploying the Central Server to production environments.'
      ],
      errorHandling: 'If an administrator loses their authenticator app, emergency backup codes provide immediate recovery.',
      accessControl: 'Master Server Admin only.'
    }
  }
];

export const ServerDocumentationPanel: React.FC<ServerDocumentationPanelProps> = ({ onSelectTab }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedDocId, setExpandedDocId] = useState<string | null>(CORE_SERVER_ARTICLES[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'articles' | 'dynamic_switchboard'>('articles');
  const [switchboardSearch, setSwitchboardSearch] = useState('');
  const [switchboardCatFilter, setSwitchboardCatFilter] = useState('All');

  // Dynamic Live Feature Introspection: Auto-extracted from DEFAULT_TENANT_FEATURE_TOGGLES
  const dynamicFeaturesList = useMemo(() => {
    const rawKeys = Object.keys(DEFAULT_TENANT_FEATURE_TOGGLES || {});
    
    return rawKeys.map((key) => {
      const defaultValue = (DEFAULT_TENANT_FEATURE_TOGGLES as any)[key];
      
      // Auto-categorize based on naming heuristics
      let cat = 'General Core';
      if (key.includes('pos') || key.includes('sale') || key.includes('bill') || key.includes('discount') || key.includes('invoice') || key.includes('cashier') || key.includes('token') || key.includes('return') || key.includes('quotation') || key.includes('quick')) {
        cat = 'POS Billing & Sales';
      } else if (key.includes('inventory') || key.includes('medicine') || key.includes('batch') || key.includes('expiry') || key.includes('rack') || key.includes('barcode') || key.includes('stock') || key.includes('narcotics') || key.includes('controlled')) {
        cat = 'Inventory & Batches';
      } else if (key.includes('tax') || key.includes('gst') || key.includes('vat') || key.includes('fbr') || key.includes('account') || key.includes('ledger') || key.includes('expense') || key.includes('profit') || key.includes('balance') || key.includes('purchase')) {
        cat = 'Accounting, Tax & FBR';
      } else if (key.includes('print') || key.includes('thermal') || key.includes('drawer') || key.includes('scale') || key.includes('hardware') || key.includes('display')) {
        cat = 'Hardware & Printing';
      } else if (key.includes('cloud') || key.includes('sync') || key.includes('offline') || key.includes('backup') || key.includes('multiBranch') || key.includes('replication')) {
        cat = 'Sync, Cloud & Multi-Branch';
      } else if (key.includes('security') || key.includes('passcode') || key.includes('lock') || key.includes('2fa') || key.includes('role') || key.includes('audit')) {
        cat = 'Security & RBAC';
      } else if (key.includes('ai') || key.includes('voice') || key.includes('whatsapp') || key.includes('sms') || key.includes('ecommerce') || key.includes('loyalty')) {
        cat = 'AI, Growth & E-Commerce';
      } else if (key.includes('theme') || key.includes('dark') || key.includes('language') || key.includes('urdu') || key.includes('layout')) {
        cat = 'UI, Localization & Urdu';
      }

      // Readable format
      const readableName = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();

      return {
        key,
        name: readableName,
        category: cat,
        defaultValue: typeof defaultValue === 'boolean' ? (defaultValue ? 'Active (ON)' : 'Disabled (OFF)') : String(defaultValue),
        type: typeof defaultValue,
        description: `Controls ${readableName.toLowerCase()} execution and visibility across tenant terminals.`
      };
    });
  }, []);

  const switchboardCategories = useMemo(() => {
    return ['All', ...new Set(dynamicFeaturesList.map((f) => f.category))];
  }, [dynamicFeaturesList]);

  const filteredSwitchboardFeatures = useMemo(() => {
    const q = switchboardSearch.toLowerCase().trim();
    return dynamicFeaturesList.filter((f) => {
      const matchCat = switchboardCatFilter === 'All' || f.category === switchboardCatFilter;
      const matchQuery = !q || f.key.toLowerCase().includes(q) || f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [dynamicFeaturesList, switchboardSearch, switchboardCatFilter]);

  const categories = useMemo(() => {
    const cats = ['All', ...new Set(CORE_SERVER_ARTICLES.map((d) => d.category))];
    return cats;
  }, []);

  const filteredDocs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return CORE_SERVER_ARTICLES.filter((doc) => {
      const matchesCat = selectedCategory === 'All' || doc.category === selectedCategory;
      const matchesSearch = !q || 
        doc.title.toLowerCase().includes(q) ||
        doc.shortSummary.toLowerCase().includes(q) ||
        doc.detailedContent.purpose.toLowerCase().includes(q) ||
        doc.detailedContent.howItWorks.some((h) => h.toLowerCase().includes(q)) ||
        doc.detailedContent.parameters.some((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const handleCopyDoc = (doc: DocArticle) => {
    const text = `
=== ${doc.title} ===
Category: ${doc.category}
Summary: ${doc.shortSummary}

PURPOSE:
${doc.detailedContent.purpose}

HOW IT WORKS:
${doc.detailedContent.howItWorks.map((h, i) => `${i + 1}. ${h}`).join('\n')}

PARAMETERS:
${doc.detailedContent.parameters.map((p) => `- ${p.name} (${p.type}): ${p.description}`).join('\n')}

BEST PRACTICES:
${doc.detailedContent.bestPractices.map((b) => `• ${b}`).join('\n')}

ERROR RECOVERY:
${doc.detailedContent.errorHandling}

ACCESS CONTROL:
${doc.detailedContent.accessControl || 'Master Server Authenticated Only'}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedId(doc.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleExportAllMarkdown = () => {
    let fullMd = `# Central Server Master Administrative Documentation\n\n`;
    fullMd += `*Generated automatically on: ${new Date().toLocaleString()}*\n`;
    fullMd += `*Total Core Modules: ${CORE_SERVER_ARTICLES.length} | Dynamic Features Auto-Indexed: ${dynamicFeaturesList.length}*\n\n---\n\n`;

    CORE_SERVER_ARTICLES.forEach((art, idx) => {
      fullMd += `## ${idx + 1}. ${art.title} [${art.category}]\n\n`;
      fullMd += `**Summary:** ${art.shortSummary}\n\n`;
      fullMd += `### Purpose & Architecture\n${art.detailedContent.purpose}\n\n`;
      fullMd += `### Execution Workflow\n`;
      art.detailedContent.howItWorks.forEach((h, hIdx) => {
        fullMd += `${hIdx + 1}. ${h}\n`;
      });
      fullMd += `\n### Parameters & Schemas\n`;
      art.detailedContent.parameters.forEach((p) => {
        fullMd += `- **\`${p.name}\`** (\`${p.type}\`): ${p.description}\n`;
      });
      fullMd += `\n### Best Practices\n`;
      art.detailedContent.bestPractices.forEach((b) => {
        fullMd += `- ${b}\n`;
      });
      fullMd += `\n**Error Recovery:** ${art.detailedContent.errorHandling}\n`;
      fullMd += `**Access Control:** ${art.detailedContent.accessControl || 'Master Server Authenticated Only'}\n\n---\n\n`;
    });

    const blob = new Blob([fullMd], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `server_master_documentation_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-6xl mx-auto text-white">
      {/* Header Banner with Auto-Sync Status */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-900/50 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-mono font-bold tracking-wide uppercase mb-2">
            <BookOpen className="w-3.5 h-3.5" /> Central Server Knowledge &amp; Operations Manual
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Central Server System Documentation</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40">
              Live Auto-Sync
            </span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Exhaustive operational specifications, technical blueprints, parameter references, and live feature directories. Automatically introspects new modules and server controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportAllMarkdown}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all shadow cursor-pointer"
            title="Export complete manual as clean Markdown"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export Markdown</span>
          </button>

          <div className="px-3 py-2 bg-blue-950/80 border border-blue-500/40 rounded-xl text-xs font-mono text-blue-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{CORE_SERVER_ARTICLES.length} Core Modules &bull; {dynamicFeaturesList.length} Controls</span>
          </div>
        </div>
      </div>

      {/* Primary Mode Switcher (Core Manual vs. Dynamic Switchboard Directory) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
        <button
          onClick={() => setViewMode('articles')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            viewMode === 'articles'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Core Operational Specifications ({CORE_SERVER_ARTICLES.length} Modules)</span>
        </button>

        <button
          onClick={() => setViewMode('dynamic_switchboard')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            viewMode === 'dynamic_switchboard'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Sliders className="w-4 h-4 text-emerald-300" />
          <span>Live Feature Switchboard Registry ({dynamicFeaturesList.length} Auto-Indexed Controls)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* MODE 1: CORE OPERATIONAL SPECIFICATIONS (DETAILED ARTICLES) */}
      {/* ======================================================== */}
      {viewMode === 'articles' && (
        <div className="space-y-6">
          {/* Search & Category Filter Controls */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation (e.g. software sales in PKR, storage quota, 30-day sync, passcodes, 2FA, Alt+M)..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Articles List */}
          <div className="space-y-4">
            {filteredDocs.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">No documentation matched your query</h4>
                <p className="text-xs text-slate-500">Try searching for different keywords or clear filters.</p>
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const Icon = doc.icon;
                const isExpanded = expandedDocId === doc.id;
                return (
                  <div
                    key={doc.id}
                    className={`bg-slate-900/90 border rounded-3xl transition-all overflow-hidden ${
                      isExpanded ? 'border-blue-500/80 shadow-2xl ring-1 ring-blue-500/20' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Header Row */}
                    <div 
                      onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                      className="p-5 sm:p-6 flex items-start justify-between gap-4 cursor-pointer select-none bg-slate-900/60 hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl shrink-0 mt-0.5">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              {doc.category}
                            </span>
                            {doc.badge && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                                {doc.badge}
                              </span>
                            )}
                            <h3 className="text-base font-black text-white">{doc.title}</h3>
                          </div>
                          <p className="text-xs text-slate-400">{doc.shortSummary}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyDoc(doc);
                          }}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Copy complete article to clipboard"
                        >
                          {copiedId === doc.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-[11px] text-emerald-400 font-bold hidden sm:inline">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="text-[11px] hidden sm:inline">Copy</span>
                            </>
                          )}
                        </button>

                        <div className={`p-2 rounded-xl bg-slate-800 text-slate-400 transition-transform ${isExpanded ? 'rotate-90 text-blue-400' : ''}`}>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Expanded Detailed Content */}
                    {isExpanded && (
                      <div className="p-5 sm:p-6 border-t border-slate-800/80 bg-slate-950/70 space-y-6 animate-in fade-in duration-150">
                        {/* Purpose */}
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5" /> Functional Purpose &amp; Scope
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
                            {doc.detailedContent.purpose}
                          </p>
                        </div>

                        {/* Operational Workflow */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5" /> Operational Workflow &amp; Execution Steps
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {doc.detailedContent.howItWorks.map((step, idx) => (
                              <div key={idx} className="bg-slate-900/80 border border-slate-800/80 p-3.5 rounded-2xl flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="text-xs text-slate-300 leading-normal">{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Parameters & Data Model */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" /> Schema Attributes &amp; Parameters
                          </h4>
                          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold text-[11px]">
                                <tr>
                                  <th className="py-2.5 px-4">Parameter Name</th>
                                  <th className="py-2.5 px-4">Data Type</th>
                                  <th className="py-2.5 px-4">Operational Description</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                {doc.detailedContent.parameters.map((p, idx) => (
                                  <tr key={idx} className="hover:bg-slate-800/30">
                                    <td className="py-2.5 px-4 font-mono font-bold text-indigo-300">{p.name}</td>
                                    <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">{p.type}</td>
                                    <td className="py-2.5 px-4 text-slate-300">{p.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Best Practices & Error Handling */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl space-y-2">
                            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5" /> Operational Best Practices
                            </h4>
                            <ul className="space-y-1.5 text-xs text-slate-300">
                              {doc.detailedContent.bestPractices.map((b, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-amber-400 font-bold">•</span>
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl space-y-2">
                            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5" /> Failover &amp; Error Recovery
                            </h4>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {doc.detailedContent.errorHandling}
                            </p>
                          </div>
                        </div>

                        {/* Access Control & Tab Navigation */}
                        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-800/80">
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            <span><strong>Security Domain:</strong> {doc.detailedContent.accessControl || 'Master Server Authenticated Admin (Isolated from /user)'}</span>
                          </div>

                          {doc.targetTab && onSelectTab && (
                            <button
                              type="button"
                              onClick={() => onSelectTab(doc.targetTab!)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                            >
                              <span>Open in Server Console</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 2: LIVE FEATURE SWITCHBOARD REGISTRY (AUTO-INDEXED)  */}
      {/* ======================================================== */}
      {viewMode === 'dynamic_switchboard' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Dynamic Switchboard Registry (Auto-Synchronized)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every feature toggle declared in the core TypeScript engine is dynamically discovered, categorized, and documented below in real-time.
                </p>
              </div>

              <div className="px-3 py-1 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs font-mono text-emerald-300">
                {filteredSwitchboardFeatures.length} of {dynamicFeaturesList.length} Controls
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={switchboardSearch}
                  onChange={(e) => setSwitchboardSearch(e.target.value)}
                  placeholder="Search 173 feature keys (e.g., narcotics, thermal, fbr, offline)..."
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <select
                  value={switchboardCatFilter}
                  onChange={(e) => setSwitchboardCatFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {switchboardCategories.map((c) => (
                    <option key={c} value={c}>
                      {c === 'All' ? 'All Feature Categories' : c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Features Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Feature Key (Code Registry)</th>
                    <th className="py-3.5 px-4">Domain Category</th>
                    <th className="py-3.5 px-4">Default Factory State</th>
                    <th className="py-3.5 px-4">Operational Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredSwitchboardFeatures.map((feat) => (
                    <tr key={feat.key} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        <code>{feat.key}</code>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {feat.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          feat.defaultValue.includes('Active')
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {feat.defaultValue}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-xs">
                        {feat.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredSwitchboardFeatures.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">
                No feature keys matched "{switchboardSearch}".
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
