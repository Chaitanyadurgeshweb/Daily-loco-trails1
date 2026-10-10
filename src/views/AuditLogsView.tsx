import React, { useEffect, useState } from 'react';
import { AuditLogItem } from '../types';
import { api } from '../services/api';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
} from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs(200);
      setLogs(res.logs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.username.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      (l.ip && l.ip.includes(search));

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && l.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" /> Security & Administrative Audit Trail
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Immutable chronological record of logins, password updates, user modifications, and trial data executions.
            </p>
          </div>

          <button
            onClick={loadLogs}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by action, username, IP, or details..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
            {['ALL', 'SUCCESS', 'WARNING', 'FAILURE'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Retrieving audit entries...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">No audit logs matching query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action Code</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">IP Origin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : log.status === 'WARNING'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {log.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}
                          {log.status === 'WARNING' && <AlertTriangle className="w-3 h-3" />}
                          {log.status === 'FAILURE' && <XCircle className="w-3 h-3" />}
                          {log.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-200 whitespace-nowrap">
                        @{log.username}
                      </td>

                      <td className="py-3 px-4 text-amber-400 font-bold text-[11px] whitespace-nowrap">
                        {log.action}
                      </td>

                      <td className="py-3 px-4 text-slate-300 font-sans text-xs max-w-md truncate">
                        {log.details}
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {log.ip || 'internal'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
