import React, { useState } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, RefreshCw, 
  Layers, Lock, Database, Clock, FileText, ChevronRight, Play, Terminal
} from 'lucide-react';
import { runOfflineConflictSimulation, SimulationSummary } from '../../lib/verification/offlineConflictSimulation';
import { runTrialSystemVerification, TrialSuiteSummary } from '../../lib/verification/trialSystemVerification';
import { runRbacDenialVerification, RbacSuiteSummary } from '../../lib/verification/rbacDenialVerification';

interface SecurityVerificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityVerificationCenterModal: React.FC<SecurityVerificationCenterModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'conflict' | 'trial' | 'rbac' | 'firestore'>('conflict');
  const [isRunning, setIsRunning] = useState(false);
  
  const [conflictResults, setConflictResults] = useState<SimulationSummary | null>(null);
  const [trialResults, setTrialResults] = useState<TrialSuiteSummary | null>(null);
  const [rbacResults, setRbacResults] = useState<RbacSuiteSummary | null>(null);

  if (!isOpen) return null;

  const handleRunAllTests = async () => {
    setIsRunning(true);
    try {
      const [conflict, trial, rbac] = await Promise.all([
        runOfflineConflictSimulation(),
        runTrialSystemVerification(),
        runRbacDenialVerification()
      ]);
      setConflictResults(conflict);
      setTrialResults(trial);
      setRbacResults(rbac);
    } catch (err) {
      console.error('Test execution failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunSingle = async (tab: 'conflict' | 'trial' | 'rbac') => {
    setIsRunning(true);
    try {
      if (tab === 'conflict') {
        const res = await runOfflineConflictSimulation();
        setConflictResults(res);
      } else if (tab === 'trial') {
        const res = await runTrialSystemVerification();
        setTrialResults(res);
      } else if (tab === 'rbac') {
        const res = await runRbacDenialVerification();
        setRbacResults(res);
      }
    } catch (err) {
      console.error(`Failed to run ${tab} suite:`, err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Security, Sync & Isolation Verification Center</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  SYSTEM READY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated test harness for offline conflict reconciliation, 3-day basic trial limits, Firestore rules, and Master RBAC.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRunAllTests}
              disabled={isRunning}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 shadow-lg shadow-emerald-900/30 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Executing Harness...' : 'Run All Test Suites'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('conflict')}
            className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'conflict'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>1. Offline Conflict Simulation</span>
            {conflictResults && (
              <span className={`px-1.5 py-0.2 text-[10px] rounded font-mono ${conflictResults.allPassed ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>
                {conflictResults.passedCount}/{conflictResults.totalTests}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('trial')}
            className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'trial'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>2. 3-Day Trial System</span>
            {trialResults && (
              <span className={`px-1.5 py-0.2 text-[10px] rounded font-mono ${trialResults.allPassed ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>
                {trialResults.passedCount}/{trialResults.totalTests}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('rbac')}
            className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'rbac'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>3. Master RBAC Explicit Denial</span>
            {rbacResults && (
              <span className={`px-1.5 py-0.2 text-[10px] rounded font-mono ${rbacResults.allPassed ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>
                {rbacResults.passedCount}/{rbacResults.totalTests}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('firestore')}
            className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'firestore'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>4. Firestore Rules & Isolation Audit</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">

          {/* TAB 1: OFFLINE CONFLICT SIMULATION */}
          {activeTab === 'conflict' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                <div>
                  <h3 className="text-sm font-bold text-white">Multi-Staff Offline Reconciliation & Deduplication Test</h3>
                  <p className="text-xs text-slate-400">
                    Simulates two cashiers in Tenant A concurrently editing medicine stock and generating offline invoices, alongside Tenant B operations.
                  </p>
                </div>
                <button
                  onClick={() => handleRunSingle('conflict')}
                  disabled={isRunning}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  <Play className="w-3 h-3 text-emerald-400" />
                  <span>Run Suite</span>
                </button>
              </div>

              {!conflictResults ? (
                <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl">
                  <Database className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Click "Run Suite" or "Run All Test Suites" above to execute the simulation.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                      <span className="text-[11px] text-slate-400 block">Total Tests</span>
                      <span className="text-lg font-bold text-white font-mono">{conflictResults.totalTests}</span>
                    </div>
                    <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                      <span className="text-[11px] text-slate-400 block">Passed</span>
                      <span className="text-lg font-bold text-emerald-400 font-mono">{conflictResults.passedCount}</span>
                    </div>
                    <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                      <span className="text-[11px] text-slate-400 block">Failed</span>
                      <span className="text-lg font-bold text-rose-400 font-mono">{conflictResults.failedCount}</span>
                    </div>
                    <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                      <span className="text-[11px] text-slate-400 block">Execution Time</span>
                      <span className="text-lg font-bold text-blue-400 font-mono">{conflictResults.durationMs}ms</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {conflictResults.results.map((r) => (
                      <div key={r.id} className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            {r.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            )}
                            <span className="text-xs font-bold text-white">{r.name}</span>
                            <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-400 rounded uppercase font-mono">
                              {r.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 pl-6">{r.details}</p>
                          <div className="pl-6 text-[10px] font-mono text-slate-500 space-y-0.5">
                            <div><span className="text-slate-400">Expected:</span> {r.expected}</div>
                            <div><span className="text-slate-400">Actual:</span> <span className={r.passed ? 'text-emerald-400' : 'text-rose-400'}>{r.actual}</span></div>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${r.passed ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>
                          {r.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 3-DAY TRIAL SYSTEM */}
          {activeTab === 'trial' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                <div>
                  <h3 className="text-sm font-bold text-white">3-Day Basic Free Trial Lifecycle Verification</h3>
                  <p className="text-xs text-slate-400">
                    Verifies 72-hour Basic limit enforcement (5 users, 2 firms), expiry calculation, duplicate prevention, and zero-data-loss guarantee.
                  </p>
                </div>
                <button
                  onClick={() => handleRunSingle('trial')}
                  disabled={isRunning}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  <Play className="w-3 h-3 text-blue-400" />
                  <span>Run Suite</span>
                </button>
              </div>

              {!trialResults ? (
                <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl">
                  <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Click "Run Suite" or "Run All Test Suites" to verify 3-day basic trial rules.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                      <span className="text-[11px] text-slate-400 block">Total Tests</span>
                      <span className="text-lg font-bold text-white font-mono">{trialResults.totalTests}</span>
                    </div>
                    <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                      <span className="text-[11px] text-slate-400 block">Passed</span>
                      <span className="text-lg font-bold text-emerald-400 font-mono">{trialResults.passedCount}</span>
                    </div>
                    <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                      <span className="text-[11px] text-slate-400 block">Failed</span>
                      <span className="text-lg font-bold text-rose-400 font-mono">{trialResults.failedCount}</span>
                    </div>
                    <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                      <span className="text-[11px] text-slate-400 block">Execution Time</span>
                      <span className="text-lg font-bold text-blue-400 font-mono">{trialResults.durationMs}ms</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {trialResults.results.map((r) => (
                      <div key={r.id} className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            {r.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            )}
                            <span className="text-xs font-bold text-white">{r.name}</span>
                            <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-400 rounded uppercase font-mono">
                              {r.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 pl-6">{r.details}</p>
                          <div className="pl-6 text-[10px] font-mono text-slate-500 space-y-0.5">
                            <div><span className="text-slate-400">Expected:</span> {r.expected}</div>
                            <div><span className="text-slate-400">Actual:</span> <span className={r.passed ? 'text-emerald-400' : 'text-rose-400'}>{r.actual}</span></div>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${r.passed ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>
                          {r.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RBAC & EXPLICIT DENIAL */}
          {activeTab === 'rbac' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                <div>
                  <h3 className="text-sm font-bold text-white">Master Server Explicit Role & Function Denial Test</h3>
                  <p className="text-xs text-slate-400">
                    Tests UI Route Guards, button function checks, and backend API HTTP 403 Forbidden enforcement on denied operations.
                  </p>
                </div>
                <button
                  onClick={() => handleRunSingle('rbac')}
                  disabled={isRunning}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  <Play className="w-3 h-3 text-amber-400" />
                  <span>Run Suite</span>
                </button>
              </div>

              {!rbacResults ? (
                <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl">
                  <Lock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Click "Run Suite" or "Run All Test Suites" to verify RBAC & backend enforcement.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                      <span className="text-[11px] text-slate-400 block">Total Tests</span>
                      <span className="text-lg font-bold text-white font-mono">{rbacResults.totalTests}</span>
                    </div>
                    <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                      <span className="text-[11px] text-slate-400 block">Passed</span>
                      <span className="text-lg font-bold text-emerald-400 font-mono">{rbacResults.passedCount}</span>
                    </div>
                    <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                      <span className="text-[11px] text-slate-400 block">Failed</span>
                      <span className="text-lg font-bold text-rose-400 font-mono">{rbacResults.failedCount}</span>
                    </div>
                    <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                      <span className="text-[11px] text-slate-400 block">Execution Time</span>
                      <span className="text-lg font-bold text-blue-400 font-mono">{rbacResults.durationMs}ms</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {rbacResults.results.map((r) => (
                      <div key={r.id} className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            {r.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            )}
                            <span className="text-xs font-bold text-white">{r.name}</span>
                            <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-400 rounded uppercase font-mono">
                              {r.layer}
                            </span>
                            {r.httpStatus && (
                              <span className={`px-1.5 py-0.5 text-[9px] rounded font-mono ${r.httpStatus === 403 ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'}`}>
                                HTTP {r.httpStatus}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 pl-6">{r.details}</p>
                          <div className="pl-6 text-[10px] font-mono text-slate-500 space-y-0.5">
                            <div><span className="text-slate-400">Expected:</span> {r.expected}</div>
                            <div><span className="text-slate-400">Actual:</span> <span className={r.passed ? 'text-emerald-400' : 'text-rose-400'}>{r.actual}</span></div>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${r.passed ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>
                          {r.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FIRESTORE RULES REVIEW & GAP ANALYSIS */}
          {activeTab === 'firestore' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-2">
                <h3 className="text-sm font-bold text-white">Firestore Security Rules Review & Tenant Isolation Architecture</h3>
                <p className="text-xs text-slate-300">
                  Comprehensive audit of current Firestore Security Rules, tenant isolation models, and identified security gaps.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Isolation Model */}
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Enforced Isolation Rules</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2">
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Master Server Lockdown:</strong> All <code className="text-amber-300 font-mono">/master_*</code> collections return <code className="text-rose-400 font-mono">allow read, write: if false;</code>, preventing any direct client-side query or mutation.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Tenant Partition Scoping:</strong> Data records in <code className="text-blue-300 font-mono">/tenants/{'{tenantId}'}</code> validate that caller token matches target <code className="text-amber-300 font-mono">tenantId</code>.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Financial Audit Immutability:</strong> <code className="text-blue-300 font-mono">/invoice_audits</code> and <code className="text-blue-300 font-mono">/audit_logs</code> enforce append-only writes with update/delete blocked.</span>
                    </li>
                  </ul>
                </div>

                {/* Gap Analysis */}
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Identified Gaps & Mitigation Strategies</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2">
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Unindexed Collection Queries:</strong> If a client performs a collection-wide query without a <code className="text-cyan-300 font-mono">where('tenantId', '==', userTenantId)</code> clause, Firestore requires composite index rules to reject unpartitioned scans.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Tenant ID Tampering in Payloads:</strong> Enforced in <code className="font-mono text-emerald-300">matchesTenantOnWrite()</code> to ensure incoming <code className="font-mono text-amber-300">request.resource.data.tenantId</code> cannot be forged to hijack another tenant's workspace.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Offline IndexedDB Partitioning:</strong> Dexie / IndexedDB client partitions databases with prefixed store names (<code className="font-mono text-cyan-300">mbi_active_tenant_id</code>) to guarantee complete local multi-tenant isolation.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Code Snippet Box */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                <div className="text-slate-500 mb-2">// firestore.rules — Core Partitioning Logic</div>
                <div className="text-purple-400">function <span className="text-blue-400">isTenantMember</span>(tenantId) {'{'}</div>
                <div className="pl-4 text-emerald-300">return request.auth != null && (request.auth.token.tenantId == tenantId || resource.data.tenantId == request.auth.token.tenantId);</div>
                <div className="text-purple-400">{'}'}</div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>MBI Inventra v2.6 • Automated Security & Sync Validation Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
