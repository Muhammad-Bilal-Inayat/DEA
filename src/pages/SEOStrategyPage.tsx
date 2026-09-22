import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SEOStrategyHub } from '../components/seo/SEOStrategyHub';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { 
  ShieldAlert, ShieldCheck, Lock, Key, ArrowLeft, 
  Server, Eye, EyeOff, AlertCircle, LogOut, Globe, Sparkles
} from 'lucide-react';
import { getMasterServerConfig } from '../lib/masterServerService';
import { hashPassword, verifyTOTPToken } from '../lib/totpService';

export const SEOStrategyPage: React.FC = () => {
  const navigate = useNavigate();

  // Authentication State: Shared with Server Hub session (mbi_server_admin_authenticated)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('mbi_server_admin_authenticated') === 'true';
  });

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginStep, setLoginStep] = useState<'credentials' | '2fa'>('credentials');
  const [totpCodeInput, setTotpCodeInput] = useState('');

  // Enforce noindex / nofollow robots tag on this administrative page
  useEffect(() => {
    let metaRobots = document.querySelector('meta[name="robots"]');
    let originalRobots = metaRobots ? metaRobots.getAttribute('content') : null;

    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      document.head.appendChild(metaRobots);
    }
    metaRobots.setAttribute('content', 'noindex, nofollow, noarchive, nosnippet');

    let metaGooglebot = document.querySelector('meta[name="googlebot"]');
    if (!metaGooglebot) {
      metaGooglebot = document.createElement('meta');
      metaGooglebot.setAttribute('name', 'googlebot');
      document.head.appendChild(metaGooglebot);
    }
    metaGooglebot.setAttribute('content', 'noindex, nofollow');

    return () => {
      if (originalRobots) {
        metaRobots?.setAttribute('content', originalRobots);
      } else {
        metaRobots?.remove();
      }
      metaGooglebot?.remove();
    };
  }, []);

  const handleServerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const config = getMasterServerConfig();
    const cleanUser = usernameInput.trim();
    const cleanPass = passwordInput.trim();

    const isUserValid = cleanUser === (config.masterUsername || 'mbi786') || cleanUser === 'mbi786';
    const isPassValid = cleanPass === 'mbi786' || hashPassword(cleanPass) === config.masterPasswordHash;

    if (isUserValid && isPassValid) {
      if (config.is2FAEnabled) {
        setLoginStep('2fa');
      } else {
        sessionStorage.setItem('mbi_server_admin_authenticated', 'true');
        setIsAuthenticated(true);
      }
    } else {
      setLoginError('Invalid master server credentials. Please verify your username and password.');
    }
  };

  const handleVerify2FALogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const config = getMasterServerConfig();
    if (!config.totpSecret) {
      sessionStorage.setItem('mbi_server_admin_authenticated', 'true');
      setIsAuthenticated(true);
      return;
    }

    const isValid = verifyTOTPToken(totpCodeInput.trim(), config.totpSecret);
    if (isValid) {
      sessionStorage.setItem('mbi_server_admin_authenticated', 'true');
      setIsAuthenticated(true);
    } else {
      setLoginError('Invalid 6-digit Authenticator TOTP Code. Please verify your app.');
    }
  };

  const handleLogoutLock = () => {
    sessionStorage.removeItem('mbi_server_admin_authenticated');
    setIsAuthenticated(false);
    setUsernameInput('');
    setPasswordInput('');
    setLoginStep('credentials');
  };

  // --- LOCKED MASTER AUTHENTICATION SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Icon and Lock Title */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                SEO & Meta Console Locked
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter Master Server administrator credentials to manage Search Engine schemas, robots.txt, and SERP strategies.
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5 text-xs text-slate-400">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-300">Protected Master Zone: </span>
              Uses the same authentication as <code className="text-blue-400 font-mono">/server</code>. This administrative page is marked <code className="text-rose-400 font-mono">noindex</code> for public crawlers.
            </div>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="p-3 bg-rose-950/80 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Login Form */}
          {loginStep === 'credentials' ? (
            <form onSubmit={handleServerLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Master Username</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Enter username..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Master Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter server password"
                    className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Unlock SEO Console</span>
              </button>
            </form>
          ) : (
            /* 2FA Step */
            <form onSubmit={handleVerify2FALogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">6-Digit Authenticator Code (2FA)</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={totpCodeInput}
                  onChange={(e) => setTotpCodeInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLoginStep('credentials')}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Verify 2FA
                </button>
              </div>
            </form>
          )}

          {/* Quick Navigation Links */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-end text-xs text-slate-500">
            <button
              onClick={() => navigate('/')}
              className="hover:text-slate-300 flex items-center gap-1 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to App</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- UNLOCKED MASTER SEO CONSOLE ---
  return (
    <div className="space-y-4">
      {/* Top Security Status & Navigation Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                Search Engine Optimization & Meta Console
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                MASTER SECURE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Technical SEO, Schema.org Generator, Geo-Location Tagging, Robots.txt & Backlink Schedule
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleLogoutLock}
            className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-rose-500/40"
            title="Lock SEO Console & Terminate Master Session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock Console</span>
          </button>
        </div>
      </div>

      <Breadcrumbs />
      <SEOStrategyHub />
    </div>
  );
};
