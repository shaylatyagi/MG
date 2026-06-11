'use client';
import { useEffect, useState } from 'react';
import Badge from '@/components/admin/Badge';
import { api, fmt } from '@/lib/api';

interface Vehicle {
  id: number;
  reg_number: string;
  type: string;
  model: string | null;
  status: string;
  rent_type: string;
  daily_rent: number;
  created_at: string;
  owner_name: string | null;
  owner_phone: string | null;
  company_name: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_status: string | null;
}

const STATUS_OPTIONS = ['ALL', 'AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE'];

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const qs = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
    api.get<Vehicle[]>(`/api/admin/vehicles${qs}`)
      .then(d => setVehicles(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase();
    return (
      v.reg_number?.toLowerCase().includes(q) ||
      (v.model || '').toLowerCase().includes(q) ||
      (v.owner_name || '').toLowerCase().includes(q) ||
      (v.driver_name || '').toLowerCase().includes(q) ||
      (v.company_name || '').toLowerCase().includes(q)
    );
  });

  const counts = {
    AVAILABLE: vehicles.filter(v => v.status === 'AVAILABLE').length,
    ASSIGNED:  vehicles.filter(v => v.status === 'ASSIGNED').length,
    UNDER_MAINTENANCE: vehicles.filter(v => v.status === 'UNDER_MAINTENANCE').length,
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">All Vehicles</h1>
        <p className="text-slate-500 text-sm mt-0.5">{vehicles.length} vehicles on platform</p>
      </div>

      {/* Stats chips */}
      {!loading && (
        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
            <span className="font-semibold text-green-700">{counts.AVAILABLE}</span>
            <span className="text-green-600 ml-1">Available</span>
          </div>
          <div className="px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
            <span className="font-semibold text-indigo-700">{counts.ASSIGNED}</span>
            <span className="text-indigo-600 ml-1">Assigned</span>
          </div>
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <span className="font-semibold text-amber-700">{counts.UNDER_MAINTENANCE}</span>
            <span className="text-amber-600 ml-1">Maintenance</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by reg number, model, owner, driver…"
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-80"
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setLoading(true); }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s === 'ALL' ? 'All Status' : s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {!loading && (
        <p className="text-sm text-slate-500">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Vehicle</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Owner</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Company</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Assigned Driver</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Daily Rent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Rent Type</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Added</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 text-sm">No vehicles found</td>
                </tr>
              )}
              {filtered.map(v => (
                <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 font-mono">{v.reg_number}</p>
                    <p className="text-xs text-slate-400">{v.type}{v.model ? ` · ${v.model}` : ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700">{v.owner_name || '—'}</p>
                    {v.owner_phone && <p className="text-xs text-slate-400">{v.owner_phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{v.company_name || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge status={v.status} />
                  </td>
                  <td className="px-4 py-3">
                    {v.driver_name ? (
                      <>
                        <p className="text-slate-700">{v.driver_name}</p>
                        <p className="text-xs text-slate-400">{v.driver_phone}</p>
                      </>
                    ) : (
                      <span className="text-slate-400 text-xs">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{fmt.inr(v.daily_rent)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{v.rent_type}</td>
                  <td className="px-4 py-3 text-right text-slate-400 text-xs">
                    {new Date(v.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
