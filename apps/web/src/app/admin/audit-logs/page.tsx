'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, fmt } from '@/lib/api';

interface AuditLog {
  id: number;
  actor_id: number | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_COLOR: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  APPROVE: 'bg-emerald-100 text-emerald-800',
  REJECT: 'bg-orange-100 text-orange-800',
  LOGIN: 'bg-purple-100 text-purple-800',
  SUSPEND: 'bg-red-100 text-red-700',
  ACTIVATE: 'bg-green-100 text-green-700',
};

function actionColor(action: string): string {
  for (const key of Object.keys(ACTION_COLOR)) {
    if (action.toUpperCase().includes(key)) return ACTION_COLOR[key];
  }
  return 'bg-slate-100 text-slate-700';
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const LIMIT = 50;

  const load = useCallback(async (off: number) => {
    setLoading(true);
    try {
      const data = await api.get<AuditLog[]>('/api/admin/audit-logs?limit=' + LIMIT + '&offset=' + off);
      if (off === 0) setLogs(Array.isArray(data) ? data : []);
      else setLogs(prev => [...prev, ...(Array.isArray(data) ? data : [])]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(0); }, [load]);

  const filtered = logs.filter(l =>
    !search ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.actor_role?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
    String(l.actor_id || '').includes(search)
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-slate-500 text-sm mt-0.5">All admin and system actions recorded on the platform</p>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Filter by action, role, entity…"
        className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {!loading && (
        <p className="text-sm text-slate-500">{filtered.length} records</p>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Time</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Action</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Actor</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Entity</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-4 bg-slate-200 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-400 text-sm">No audit logs found</td>
              </tr>
            ) : (
              filtered.map(log => (
                <tr key={log.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                    {fmt.date(log.created_at)}<br />
                    <span className="text-slate-300">
                      {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ' + actionColor(log.action)}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {log.actor_id ? (
                      <div>
                        <p className="text-slate-700 font-medium">ID {log.actor_id}</p>
                        {log.actor_role && <p className="text-xs text-slate-400 capitalize">{log.actor_role}</p>}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">System</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 text-xs">
                    {log.entity_type ? (
                      <span>{log.entity_type}{log.entity_id ? ' #' + log.entity_id : ''}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 text-xs font-mono">{log.ip_address || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length === logs.length && logs.length === offset + LIMIT && (
        <div className="text-center">
          <button
            onClick={() => { const next = offset + LIMIT; setOffset(next); load(next); }}
            className="px-6 py-2 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
