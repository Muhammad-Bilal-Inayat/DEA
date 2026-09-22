import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ToastProvider } from './contexts/ToastContext';
import { TransactionDockProvider } from './contexts/TransactionDockContext';
import { hasRouteAccess } from './lib/permissions';
import { checkGranularRouteAccess } from './lib/userAccessControl';
import { isMasterAdminAuthenticated } from './lib/masterServerService';
import { startAutomatedBackupService } from './lib/backupManager';
import { startClockIntegrityDaemon } from './lib/clockIntegrityService';
import { TimeTamperGuardModal } from './components/common/TimeTamperGuardModal';
import { ShieldAlert, ArrowLeft, RefreshCw, RotateCcw, Lock } from 'lucide-react';

import { PendingApproval } from './components/PendingApproval';
import Login from './pages/Login';
import Register from './pages/Register';
import SetupBusiness from './pages/SetupBusiness';

// Resilient code-splitting wrapper with automatic cache-clearing retry on chunk 404
function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error: any) {
      console.error('[MBI Dynamic Import Chunk Error]', error);
      const isChunkError =
        error?.name === 'ChunkLoadError' ||
        /Failed to fetch dynamically imported module/i.test(error?.message || '') ||
        /error loading dynamically imported module/i.test(error?.message || '');

      if (isChunkError && typeof window !== 'undefined') {
        const retryKey = 'mbi_chunk_retry_' + window.location.pathname;
        const alreadyRetried = sessionStorage.getItem(retryKey);
        if (!alreadyRetried) {
          sessionStorage.setItem(retryKey, 'true');
          if ('caches' in window) {
            try {
              const keys = await caches.keys();
              await Promise.all(keys.map(k => caches.delete(k)));
            } catch (e) {}
          }
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw error;
    }
  });
}

// Code-splitting / Lazy-loaded routes for secondary screens
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Inventory = lazyWithRetry(() => import('./pages/Inventory').then(m => ({ default: m.Inventory })));
const Billing = lazyWithRetry(() => import('./pages/Billing').then(m => ({ default: m.Billing })));
const Suppliers = lazyWithRetry(() => import('./pages/Suppliers').then(m => ({ default: m.Suppliers })));
const Purchases = lazyWithRetry(() => import('./pages/Purchases').then(m => ({ default: m.Purchases })));
const Expenses = lazyWithRetry(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })));
const Bank = lazyWithRetry(() => import('./pages/Bank').then(m => ({ default: m.Bank })));
const Reports = lazyWithRetry(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Settings = lazyWithRetry(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const SyncAndShare = lazyWithRetry(() => import('./pages/SyncAndShare').then(m => ({ default: m.SyncAndShare })));
const Utilities = lazyWithRetry(() => import('./pages/Utilities').then(m => ({ default: m.Utilities })));
const TopProducts = lazyWithRetry(() => import('./pages/TopProducts').then(m => ({ default: m.TopProducts })));
const ShortageRegistry = lazyWithRetry(() => import('./pages/ShortageRegistry').then(m => ({ default: m.ShortageRegistry })));
const CashInHand = lazyWithRetry(() => import('./pages/CashInHand').then(m => ({ default: m.CashInHand })));
const ShiftManagement = lazyWithRetry(() => import('./pages/ShiftManagement').then(m => ({ default: m.ShiftManagement })));
const Pricing = lazyWithRetry(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const Feedback = lazyWithRetry(() => import('./pages/Feedback').then(m => ({ default: m.Feedback })));
const OnlineStoreManagement = lazyWithRetry(() => import('./pages/OnlineStoreManagement').then(m => ({ default: m.OnlineStoreManagement })));
const StoreLayout = lazyWithRetry(() => import('./pages/store/StoreLayout').then(m => ({ default: m.StoreLayout })));
const StoreHome = lazyWithRetry(() => import('./pages/store/StoreHome').then(m => ({ default: m.StoreHome })));
const StoreCatalog = lazyWithRetry(() => import('./pages/store/StoreCatalog').then(m => ({ default: m.StoreCatalog })));
const StoreProductDetail = lazyWithRetry(() => import('./pages/store/StoreProductDetail').then(m => ({ default: m.StoreProductDetail })));
const StoreCart = lazyWithRetry(() => import('./pages/store/StoreCart').then(m => ({ default: m.StoreCart })));
const StoreCheckout = lazyWithRetry(() => import('./pages/store/StoreCheckout').then(m => ({ default: m.StoreCheckout })));
const StoreOrderConfirmation = lazyWithRetry(() => import('./pages/store/StoreOrderConfirmation').then(m => ({ default: m.StoreOrderConfirmation })));
const StoreOrderTracking = lazyWithRetry(() => import('./pages/store/StoreOrderTracking').then(m => ({ default: m.StoreOrderTracking })));
const MasterPanelPage = lazyWithRetry(() => import('./pages/master/MasterPanelPage').then(m => ({ default: m.MasterPanelPage })));
const UserPortalPage = lazyWithRetry(() => import('./pages/user/UserPortalPage').then(m => ({ default: m.UserPortalPage })));
const ServerOverviewPage = lazyWithRetry(() => import('./pages/server/ServerOverviewPage').then(m => ({ default: m.ServerOverviewPage })));
const SEOStrategyPage = lazyWithRetry(() => import('./pages/SEOStrategyPage').then(m => ({ default: m.SEOStrategyPage })));
const BlogListingPage = lazyWithRetry(() => import('./pages/BlogListingPage').then(m => ({ default: m.BlogListingPage })));
const BlogDetailPage = lazyWithRetry(() => import('./pages/BlogDetailPage').then(m => ({ default: m.BlogDetailPage })));
const CheckoutPage = lazyWithRetry(() => import('./pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));

// Lightweight, instant suspense loader
function RouteLoader() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 space-y-3">
      <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading module...</p>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, business, tenant, loading } = useAuth();
  const location = useLocation();
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  // Safety timer: Never allow ProtectedRoute to hang in loading state indefinitely
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoadTimedOut(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [loading]);

  // Dedicated check for /server to verify active tenant context
  useEffect(() => {
    if (location.pathname.startsWith('/server')) {
      const activeTenantId = tenant?.id || business?.id || localStorage.getItem('mbi_active_business_id');
      if (!activeTenantId) {
        console.warn('[MBI Tenant Guard] Warning: /server route accessed without an active tenant context.');
      }
    }
  }, [location.pathname, tenant, business]);

  // Standalone Server direct access bypass (Self-contained authentication inside ServerOverviewPage)
  if (location.pathname.startsWith('/server') || location.pathname.startsWith('/master')) {
    return <>{children}</>;
  }

  if (loading && !loadTimedOut) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-white tracking-tight">Starting MBI Inventra...</h2>
          <p className="text-xs text-slate-400">Verifying session & database state</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  if (!business && window.location.pathname !== '/setup') return <Navigate to="/setup" replace />;
  
  return <>{children}</>;
}

function RoleAccessGuard({ children }: { children: React.ReactNode }) {
  const { activeRole, activeUser, setActiveRole, setActiveUser, business, tenant, currentUser, userProfile, tenantId } = useAuth();
  const location = useLocation();

  // Save active route so reloading/refreshing re-opens the same page
  useEffect(() => {
    if (currentUser && location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/register' && location.pathname !== '/pending-approval') {
      localStorage.setItem('mbi_last_active_route', location.pathname);
    }
  }, [location.pathname, currentUser]);

  // Master & Server Route Protection: Render ServerOverviewPage directly so it can present its dedicated secure login gate
  if (location.pathname.startsWith('/server') || location.pathname.startsWith('/master')) {
    return <>{children}</>;
  }

  // Check if user account is explicitly waiting for admin approval in Firestore
  const isMasterUser = 
    currentUser?.email === 'm.bilalinayat786@gmail.com' || 
    currentUser?.email === 'vip123@admin.com' || 
    currentUser?.uid === 'u1' || 
    currentUser?.uid === 'admin-master';

  if (userProfile && userProfile.isApproved === false && !isMasterUser) {
    return <PendingApproval />;
  }

  const isRoleAllowed = hasRouteAccess(activeRole, location.pathname);
  
  const granularCheck = checkGranularRouteAccess(location.pathname, {
    role: activeRole,
    userId: activeUser?.id,
    plan: (tenant as any)?.plan || (business as any)?.plan || 'Standard POS',
    tenantId: tenant?.tenantId || tenant?.id || tenantId
  });

  const isAllowed = isRoleAllowed && granularCheck.isAllowed;

  if (!isAllowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Access Restricted</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {granularCheck.reason || (
                <>Your current active role (<span className="font-bold text-slate-800 dark:text-slate-200">{activeRole}</span>) does not have permission to view this module.</>
              )}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 text-left space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-200">Security Policy:</p>
            <p>Access to <span className="font-mono text-slate-800 dark:text-slate-100 font-bold">{location.pathname}</span> is protected by organization role and Master Switchboard settings.</p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <Link
              to="/user"
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Portal</span>
            </Link>

            <button
              onClick={() => {
                setActiveUser(null);
                setActiveRole('Primary Admin');
              }}
              className="w-full sm:w-auto px-4 py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Switch to Admin</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  );
}

// Root Route Handler: When logged in, always open /user (or last active route); otherwise show LandingPage
function RootRouteHandler() {
  const { currentUser, business, loading } = useAuth();

  if (loading) {
    return <RouteLoader />;
  }

  if (currentUser && business) {
    const savedRoute = localStorage.getItem('mbi_last_active_route');
    const targetRoute = savedRoute && savedRoute !== '/' && savedRoute !== '/home' && savedRoute !== '/login' ? savedRoute : '/user';
    return <Navigate to={targetRoute} replace />;
  }

  return <LandingPage />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        {/* Root Route: Redirects to /user when authenticated, LandingPage when guest */}
        <Route path="/" element={<RootRouteHandler />} />
        <Route path="/home" element={<RootRouteHandler />} />
        <Route path="/site" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/plans" element={<LandingPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/blogs" element={<BlogListingPage />} />
        <Route path="/blog/:slug" element={<BlogDetailPage />} />

        {/* Authentication & Onboarding */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/master" element={<Navigate to="/server" replace />} />
        <Route path="/setup" element={<ProtectedRoute><SetupBusiness /></ProtectedRoute>} />

        {/* Public Online Storefront Routes */}
        <Route path="/store" element={<StoreLayout />}>
          <Route index element={<StoreHome />} />
          <Route path="products" element={<StoreCatalog />} />
          <Route path="product/:id" element={<StoreProductDetail />} />
          <Route path="cart" element={<StoreCart />} />
          <Route path="checkout" element={<StoreCheckout />} />
          <Route path="order-success/:id" element={<StoreOrderConfirmation />} />
          <Route path="track" element={<StoreOrderTracking />} />
        </Route>
        
        {/* Authenticated Workspace & POS Routes */}
        <Route element={<ProtectedLayout />}>
          <Route path="/user" element={<RoleAccessGuard><UserPortalPage /></RoleAccessGuard>} />
          <Route path="/dashboard" element={<RoleAccessGuard><Dashboard /></RoleAccessGuard>} />
          <Route path="/server" element={<RoleAccessGuard><ServerOverviewPage /></RoleAccessGuard>} />
          <Route path="/online-store" element={<RoleAccessGuard><OnlineStoreManagement /></RoleAccessGuard>} />
          <Route path="/billing" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
          <Route path="/sale" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
          <Route path="/sale/invoices" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
          <Route path="/sale/quotation" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
          <Route path="/sale/estimate" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
          <Route path="/sale/payment-in" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
          <Route path="/sale/order" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
          <Route path="/sale/challan" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
          <Route path="/sale/return" element={<RoleAccessGuard><Billing /></RoleAccessGuard>} />
          <Route path="/items" element={<RoleAccessGuard><Inventory /></RoleAccessGuard>} />
          <Route path="/inventory" element={<RoleAccessGuard><Inventory /></RoleAccessGuard>} />
          <Route path="/shortage-registry" element={<RoleAccessGuard><ShortageRegistry /></RoleAccessGuard>} />
          <Route path="/shortages" element={<RoleAccessGuard><ShortageRegistry /></RoleAccessGuard>} />
          <Route path="/shortage" element={<RoleAccessGuard><ShortageRegistry /></RoleAccessGuard>} />
          <Route path="/short-register" element={<RoleAccessGuard><ShortageRegistry /></RoleAccessGuard>} />
          <Route path="/shortage-book" element={<RoleAccessGuard><ShortageRegistry /></RoleAccessGuard>} />
          <Route path="/top-products" element={<RoleAccessGuard><TopProducts /></RoleAccessGuard>} />
          <Route path="/parties" element={<RoleAccessGuard><Suppliers /></RoleAccessGuard>} />
          <Route path="/purchase" element={<RoleAccessGuard><Purchases /></RoleAccessGuard>} />
          <Route path="/purchases" element={<RoleAccessGuard><Purchases /></RoleAccessGuard>} />
          <Route path="/purchase/bills" element={<RoleAccessGuard><Purchases /></RoleAccessGuard>} />
          <Route path="/purchase/payment-out" element={<RoleAccessGuard><Purchases /></RoleAccessGuard>} />
          <Route path="/purchase/order" element={<RoleAccessGuard><Purchases /></RoleAccessGuard>} />
          <Route path="/purchase/return" element={<RoleAccessGuard><Purchases /></RoleAccessGuard>} />
          <Route path="/expenses" element={<RoleAccessGuard><Expenses /></RoleAccessGuard>} />
          <Route path="/reports" element={<RoleAccessGuard><Reports /></RoleAccessGuard>} />
          <Route path="/bank" element={<RoleAccessGuard><Bank /></RoleAccessGuard>} />
          <Route path="/bank/accounts" element={<RoleAccessGuard><Bank /></RoleAccessGuard>} />
          <Route path="/bank/cash-in-hand" element={<RoleAccessGuard><CashInHand /></RoleAccessGuard>} />
          <Route path="/cash-in-hand" element={<RoleAccessGuard><CashInHand /></RoleAccessGuard>} />
          <Route path="/shift-management" element={<RoleAccessGuard><ShiftManagement /></RoleAccessGuard>} />
          <Route path="/sale/shifts" element={<RoleAccessGuard><ShiftManagement /></RoleAccessGuard>} />
          <Route path="/bank/shifts" element={<RoleAccessGuard><ShiftManagement /></RoleAccessGuard>} />
          <Route path="/bank/cheques" element={<RoleAccessGuard><Bank /></RoleAccessGuard>} />
          <Route path="/bank/loan-accounts" element={<RoleAccessGuard><Bank /></RoleAccessGuard>} />
          <Route path="/sync-share" element={<RoleAccessGuard><SyncAndShare /></RoleAccessGuard>} />
          <Route path="/utilities" element={<RoleAccessGuard><Utilities /></RoleAccessGuard>} />
          <Route path="/seo" element={<RoleAccessGuard><SEOStrategyPage /></RoleAccessGuard>} />
          <Route path="/settings" element={<RoleAccessGuard><Settings /></RoleAccessGuard>} />
          <Route path="/pricing" element={<RoleAccessGuard><Pricing /></RoleAccessGuard>} />
          <Route path="/feedback" element={<RoleAccessGuard><Feedback /></RoleAccessGuard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function GlobalUrlSanitizer() {
  const location = useLocation();

  useEffect(() => {
    // If there is a hash in the address bar (e.g. /server#pricing or /#pricing)
    if (window.location.hash) {
      const hash = window.location.hash;
      // If we are on landing page and user accessed an anchor, let element scroll into view smoothly first
      if (location.pathname === '/' || location.pathname === '/home') {
        const targetId = hash.replace('#', '');
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
      
      // Clean the URL address bar immediately so it shows /server or / instead of /server#pricing
      try {
        window.history.replaceState(null, '', location.pathname + location.search);
      } catch (e) {
        // Fallback in case of sandboxed restrictions
      }
    }
  }, [location.pathname, location.search, location.hash]);

  return null;
}

export default function App() {
  useEffect(() => {
    console.log('%c[MBI App]%c App tree mounted successfully.', 'color: #3b82f6; font-weight: bold;', 'color: #94a3b8;');
    
    // Start automated background backup daemon
    try {
      const intervalStr = localStorage.getItem('mbi_auto_backup_interval');
      const interval = intervalStr ? parseInt(intervalStr, 10) : 15;
      startAutomatedBackupService(interval);
    } catch (e) {
      console.warn('Failed to start auto backup daemon:', e);
    }

    // Start system clock integrity & anti-time-tampering guard
    try {
      startClockIntegrityDaemon(6);
    } catch (e) {
      console.warn('Failed to start clock integrity monitor:', e);
    }
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <GlobalUrlSanitizer />
        <AuthProvider>
          <SettingsProvider>
            <ToastProvider>
              <TransactionDockProvider>
                <TimeTamperGuardModal />
                <AppRoutes />
              </TransactionDockProvider>
            </ToastProvider>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
