'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/admin/Badge';
import { api, fmt } from '@/lib/api';

interface Company {
  id: number;
  company_name:   string;
  company_code:   string;
  company_status: string;
  city:           string | null;
  cin:            string | null;
  created_at:     string;
  owner_count:    number;
  driver_count:   number;
  vehicle_count:  number;
  collection_today:  number;
  collection_month:  number;
  total_revenue:     number;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<number | null>(null);

  // Add company modal
  const [showAdd, setShowAdd] = useState(false);
  const [newCo, setNewCo] = useState({ name: '', cin: '', city: '' });
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try {
      const data = await api.get<Company[]>('/api/admin/companies');
      setCompanies(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (co: Company) => {
    const next = co.company_status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setToggling(co.id);
    try {
      await api.patch(`/api/admin/companies/${co.id}/status`, { status: next });
      setCompanies(cs => cs.map(c => c.id === co.id ? { ...c, company_status: next } : c));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setToggling(null);
    }
  };

  const addCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await api.post('/api/admin/companies', { company_name: newCo.name, cin: newCo.cin, city: newCo.city });
      setShowAdd(false);
      setNewCo({ name: '', cin: '', city: '' });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  const filtered = companies.filter(c =>
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_code?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
          <p className="text-slate-500 text-sm mt-0.5">{companies.length} fleet operator{companies.length !== 1 ? 's' : ''} on platform</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Onboard Company
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, code, or city…"
        className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {/* Table */}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Company</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Code</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Owners</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Drivers</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Today GMV</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Month GMV</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 text-sm">
                    {search ? 'No companies match your search' : 'No companies yet'}
                  </td>
                </tr>
              )}
              {filtered.map(co => (
                <tr key={co.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/companies/${co.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {co.company_name}
                    </Link>
                    {co.city && <p className="text-xs text-slate-400">{co.city}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{co.company_code}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge status={co.company_status || 'ACTIVE'} />
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{co.owner_count}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{co.driver_count}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{fmt.inr(co.collection_today)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{fmt.inr(co.collection_month)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/companies/${co.id}`}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => toggleStatus(co)}
                        disabled={toggling === co.id}
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          co.company_status === 'ACTIVE'
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                        } disabled:opacity-50`}
                      >
                        {toggling === co.id ? '…' : co.company_status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Company Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Onboard New Company</h2>
            <form onSubmit={addCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={newCo.name}
                  onChange={e => setNewCo(n => ({ ...n, name: e.target.value }))}
                  required
                  placeholder="e.g. Ravi EV Fleet"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CIN (optional)</label>
                <input
                  type="text"
                  value={newCo.cin}
                  onChange={e => setNewCo(n => ({ ...n, cin: e.target.value }))}
                  placeholder="Corporate Identity Number"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={newCo.city}
                  onChange={e => setNewCo(n => ({ ...n, city: e.target.value }))}
                  placeholder="e.g. Bengaluru"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-2 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding || !newCo.name}
                  className="flex-1 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {adding ? 'Adding…' : 'Onboard Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
