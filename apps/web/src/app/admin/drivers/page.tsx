'use client';
import { useEffect, useState } from 'react';
import Badge from '@/components/admin/Badge';
import { api, fmt } from '@/lib/api';

interface Driver {
  id: number;
  name: string;
  phone_number: string;
  status: string;
  kyc_status: string | null;
  wallet_balance: number;
  vehicle_number: string | null;
  owner_name: string | null;
  company_name: string | null;
  total_paid: number;
  paid_today: number;
  paid_month: number;
  last_payment_date: string | null;
  created_at: string;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('ALL');

  useEffect(() => {
    api.get<Driver[]>('/api/admin/kyc/all')
      .then(d => setDrivers(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = drivers.filter(d => {
    const matchSearch =
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.phone_number?.includes(search) ||
      (d.owner_name || '').toLowerCase().includes(search.toLowerCase());
    const matchKyc = kycFilter === 'ALL' || d.kyc_status === kycFilter;
    return matchSearch && matchKyc;
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">All Drivers</h1>
        <p className="text-slate-500 text-sm mt-0.5">{drivers.length} drivers registered on platform</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, or owner…"
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72"
        />
        <select
          value={kycFilter}
          onChange={e => setKycFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="ALL">All KYC</option>
          <option value="APPROVED">Approved</option>
          <option value="PENDING">Pending</option>
          <option value="PARTIAL">Partial</option>
          <option value="REJECTED">Rejected</option>
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
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Driver</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Owner</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">Status</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">KYC</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Vehicle</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Wallet</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Today</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Month</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Last Payment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400 text-sm">No drivers found</td>
                </tr>
              )}
              {filtered.map(d => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{d.name}</p>
                    <p className="text-xs text-slate-400">{d.phone_number}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700">{d.owner_name || '—'}</p>
                    {d.company_name && <p className="text-xs text-slate-400">{d.company_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-center"><Badge status={d.status || 'ACTIVE'} /></td>
                  <td className="px-4 py-3 text-center"><Badge status={d.kyc_status || 'NOT_STARTED'} /></td>
                  <td className="px-4 py-3 text-slate-600">{d.vehicle_number || '—'}</td>
                  <td className={`px-4 py-3 text-right font-medium ${parseFloat(String(d.wallet_balance)) < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                    {fmt.inr(d.wallet_balance)}
                  </td>
                  <td className="px-4 py-3 text-right text-green-700">{fmt.inr(d.paid_today)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{fmt.inr(d.paid_month)}</td>
                  <td className="px-4 py-3 text-right text-slate-400 text-xs">
                    {d.last_payment_date
                      ? new Date(d.last_payment_date).toLocaleDateString('en-IN')
                      : '—'}
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
