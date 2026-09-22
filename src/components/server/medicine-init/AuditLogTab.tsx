import React, { useState, useMemo } from 'react';
import { CentralMedicineAuditLog } from '../../../types';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Send,
  Trash2,
  Edit2,
  Sparkles,
  Layers,
  UploadCloud,
  CheckCircle2,
  Building2,
  Plus
} from 'lucide-react';
import { getCentralMedicineAuditLogs } from '../../../lib/centralMedicineDatabaseService';

interface AuditLogTabProps {
  logs?: CentralMedicineAuditLog[];
}

export const AuditLogTab: React.FC<AuditLogTabProps> = () => {
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');

  const logs = useMemo(() => getCentralMedicineAuditLogs(), []);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (selectedAction !== 'ALL' && l.action !== selectedAction) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchDesc = l.description?.toLowerCase().includes(q);
        const matchUser = l.performedBy?.toLowerCase().includes(q);
        const matchTenant = l.tenantName?.toLowerCase().includes(q) || l.tenantId?.toLowerCase().includes(q);
        if (!matchDesc && !matchUser && !matchTenant) return false;
      }
      return true;
    });
  }, [logs, selectedAction, search]);

  const getActionBadge = (action: CentralMedicineAuditLog['action']) => {
    switch (action) {
      case 'IMPORT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <UploadCloud className="w-3 h-3" />
            IMPORT
          </span>
        );
      case 'ASSIGN':
      case 'BULK_ASSIGN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Send className="w-3 h-3" />
            {action}
          </span>
        );
      case 'REMOVE_ASSIGNMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Trash2 className="w-3 h-3" />
            UNASSIGN
          </span>
        );
      case 'SHIFT_CATEGORY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-3 h-3" />
            SHIFT
          </span>
        );
      case 'CUSTOMER_SYNC':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Sparkles className="w-3 h-3" />
            CLIENT SYNC
          </span>
        );
      case 'DELETE_RECORD':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <Trash2 className="w-3 h-3" />
            DELETE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <Edit2 className="w-3 h-3" />
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search audit descriptions, customer names, or actors..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedAction}
            onChange={e => setSelectedAction(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Event Types</option>
            <option value="IMPORT">Import Events</option>
            <option value="ASSIGN">Assignments</option>
            <option value="BULK_ASSIGN">Bulk Assignments</option>
            <option value="REMOVE_ASSIGNMENT">Unassignments</option>
            <option value="SHIFT_CATEGORY">Category Shifts</option>
            <option value="CUSTOMER_SYNC">Customer Syncs</option>
            <option value="ADD_RECORD">Additions</option>
            <option value="EDIT_RECORD">Edits</option>
            <option value="DELETE_RECORD">Deletions</option>
          </select>

          <span className="text-xs text-slate-400 font-mono">
            {filteredLogs.length} events
          </span>
        </div>
      </div>

      {/* Log Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            No audit records found matching your filters.
          </div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="p-4 hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  {getActionBadge(log.action)}
                  <span className="text-xs font-semibold text-white">{log.description}</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <span>•</span>
                  <span>Actor: <strong className="text-slate-300">{log.performedBy}</strong></span>
                  {log.tenantName && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-sky-400">
                        <Building2 className="w-3 h-3" />
                        {log.tenantName}
                      </span>
                    </>
                  )}
                  {log.affectedCount !== undefined && log.affectedCount > 1 && (
                    <>
                      <span>•</span>
                      <span className="text-amber-400 font-mono font-medium">
                        {log.affectedCount} items affected
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono shrink-0">
                {log.id}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
