import React, { useState, useEffect } from 'react';
import { Activity, Search, Filter, Shield, User, Clock, RefreshCw, Calendar, Trash2 } from 'lucide-react';
import { dbUserActivities } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { emitToast } from '../../contexts/ToastContext';

export interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({ isOpen, onClose }) => {
  const { activeUser, activeRole } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const allLogs = await dbUserActivities.getAll();
      // Sort newest first
      allLogs.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      setLogs(allLogs);
    } catch (e) {
      console.error('Error fetching activity logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.userName && log.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.userRole && log.userRole.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'ALL' || log.userRole === roleFilter;

    return matchesSearch && matchesRole;
  });

  const clearAllLogs = async () => {
    if (window.confirm('Are you sure you want to clear all activity logs?')) {
      try {
        for (const log of logs) {
          await dbUserActivities.delete(log.id);
        }
        setLogs([]);
        emitToast('Activity logs cleared successfully', 'success');
      } catch (e) {
        emitToast('Failed to clear logs', 'error');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">System Activity & Audit Log</h2>
              <p className="text-xs text-slate-500">Track timestamped user actions, inventory edits, sales, and system events</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              className="p-2 text-slate-600 hover:bg-slate-200/80 rounded-lg transition-colors"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by user, role or action details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Role:</span>
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="Primary Admin">Primary Admin</option>
              <option value="Pharmacist">Pharmacist</option>
              <option value="Salesman">Salesman</option>
              <option value="Biller">Biller</option>
              <option value="Cashier">Cashier</option>
            </select>

            {activeRole === 'Primary Admin' && logs.length > 0 && (
              <button
                onClick={clearAllLogs}
                className="flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-colors"
                title="Clear Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Logs List Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => {
              const formattedDate = log.timestamp 
                ? new Date(log.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' })
                : 'Just now';
              
              return (
                <div 
                  key={log.id} 
                  className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                      <Shield className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">{log.userName || 'System User'}</span>
                        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-semibold">
                          {log.userRole || 'Pharmacist'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1 font-medium">{log.details}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono shrink-0 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formattedDate}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
              <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600 text-sm">No activity logs found</p>
              <p className="text-xs text-slate-400 mt-1">Actions such as item additions, sales, and updates will appear here automatically.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredLogs.length} of {logs.length} logged actions</span>
          <span className="font-medium text-slate-600">Secure Audit & Accountability Trail</span>
        </div>

      </div>
    </div>
  );
};
