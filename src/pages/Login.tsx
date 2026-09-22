import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  PackageCheck, Phone, MessageSquare, ShieldCheck, RefreshCw, 
  Cloud, CloudCheck, Lock, User, Key, ArrowRight, CheckCircle2, 
  AlertCircle, Building2, Eye, EyeOff, Home, ArrowLeft, Sun, Moon, Ban, ShieldAlert
} from 'lucide-react';
import { ADMIN_PRIMARY_WHATSAPP, ADMIN_SUPPORT_PHONE } from '../lib/registrationLeadsService';
import { recordLoginAttempt, getCurrentClientIp, isIpBlocked } from '../lib/securityAuditService';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');

  // Theme support
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('mbi_landing_theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (isDark) {
      root.classList.add('dark');
      if (body) body.classList.add('dark');
      root.style.colorScheme = 'dark';
      localStorage.setItem('mbi_landing_theme', 'dark');
    } else {
      root.classList.remove('dark');
      if (body) body.classList.remove('dark');
      root.style.colorScheme = 'light';
      localStorage.setItem('mbi_landing_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  const navigate = useNavigate();
  const { authenticateAndSync } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const clientIp = getCurrentClientIp();

    // Check if IP is in blacklist
    if (isIpBlocked(clientIp)) {
      const blockedMsg = `Access Denied: Your IP address (${clientIp}) is blocked by the Master Server Firewall. Contact Administrator.`;
      setError(blockedMsg);
      recordLoginAttempt({
        username: identifier.trim() || 'Blocked-IP-Attempt',
        targetSystem: 'Client Web Portal',
        status: 'BLOCKED',
        ipAddress: clientIp,
        failureReason: 'IP Address is blacklisted in Master Firewall'
      });
      return;
    }

    if (!identifier.trim()) {
      setError('Please enter your username, email, or mobile number.');
      return;
    }
    if (!password) {
      setError('Please enter your password or passcode.');
      return;
    }

    setIsLoading(true);
    setProgressStatus('Connecting to Cloud Server...');

    try {
      await authenticateAndSync(identifier.trim(), password, (msg) => {
        setProgressStatus(msg);
      });

      // Record successful login in security audit log
      recordLoginAttempt({
        username: identifier.trim(),
        targetSystem: 'Client Web Portal',
        status: 'SUCCESS',
        ipAddress: clientIp
      });

      setProgressStatus('Redirecting to Workspace...');
      setTimeout(() => {
        navigate('/user');
      }, 350);
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to authenticate with server. Please check your username & password.';
      setError(errMsg);
      
      // Record failed attempt in security audit log
      recordLoginAttempt({
        username: identifier.trim(),
        targetSystem: 'Client Web Portal',
        status: 'FAILED',
        ipAddress: clientIp,
        failureReason: errMsg
      });

      setIsLoading(false);
      setProgressStatus('');
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#f8fafc] text-slate-800'
    }`}>
      
      {/* Top Header Navigation: Back to Home + Theme Toggle */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-4 flex items-center justify-between px-1">
        <Link 
          to="/" 
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-xs transition-all group ${
            isDark 
              ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-blue-400 border-slate-800' 
              : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 border-slate-200/80'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-blue-600 dark:text-blue-400" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Light / Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
          </button>

          <Link 
            to="/" 
            className={`inline-flex items-center gap-1.5 text-xs font-bold transition-colors ${
              isDark ? 'text-slate-300 hover:text-blue-400' : 'text-slate-600 hover:text-blue-600'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Home Page</span>
          </Link>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-3">
          <img src="/logo.svg" alt="MBI INVENTRA" className="h-9 sm:h-10.5 w-auto object-contain max-w-[240px]" />
        </div>
        <p className={`mt-1 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Cloud ERP, Pharmacy POS & Inventory Sync System
        </p>
        
        {/* Server & Cloud Connection Badge */}
        <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${
          isDark 
            ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Cloud Server Sync: Online & Protected</span>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className={`py-8 px-6 shadow-lg border rounded-3xl sm:px-8 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90'
        }`}>
          
          <div className={`mb-5 pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <h2 className="text-base font-bold">Sign in to Workspace</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Enter your credentials configured on the server to authenticate and sync live data.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 p-3.5 rounded-xl text-xs font-bold space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <div className="flex-1 leading-relaxed">{error}</div>
                </div>
              </div>
            )}

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <span>Username, Email, or Mobile</span>
                <User className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  placeholder="e.g. admin@demo.com or dr_asif"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' 
                      : 'bg-slate-50/70 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                  value={identifier} 
                  onChange={e => setIdentifier(e.target.value)} 
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <span>Password / Passcode</span>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' 
                      : 'bg-slate-50/70 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {progressStatus && (
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 animate-pulse bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{progressStatus}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{isLoading ? 'Authenticating...' : 'Sign In & Open Workspace'}</span>
            </button>
          </form>

          <div className={`mt-6 pt-4 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          }`}>
            <Link to="/register" className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold">
              Need a License? Register Pharmacy
            </Link>
            <Link to="/" className="text-slate-400 hover:text-slate-200">
              Home Page →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
