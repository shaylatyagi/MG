'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatCard from '@/components/admin/StatCard';
import { api, fmt } from '@/lib/api';

interface PlatformStats {
  total_companies:  number;
  total_owners:     number;
  total_drivers:    number;
  total_vehicles:   number;
  collection_today:  number;
  collection_month:  number;
  collection_total:  number;
}

interface KycSummaryItem {
  status: string;
  count: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [kycSummary, setKycSummary] = useState<KycSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<PlatformStats>('/api/admin/platform-stats'),
      api.get<KycSummaryItem[]>('/api/admin/kyc/summary'),
    ]).then(([s, k]) => {
      setStats(s);
      setKycSummary(k);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Spec schema KYC statuses: PENDING | PARTIAL | APPROVED | REJECTED
  const pendingKyc = kycSummary
    .filter(k => ['PENDING', 'PARTIAL'].includes(k.status))
    .reduce((sum, k) => sum + k.count, 0);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Operators & Fleet */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Fleet</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Companies"    value={stats?.total_companies ?? '—'} />
          <StatCard label="Fleet Owners" value={stats?.total_owners ?? '—'} />
          <StatCard label="Drivers"      value={stats?.total_drivers ?? '—'} />
          <StatCard label="Vehicles"     value={stats?.total_vehicles ?? '—'} />
        </div>
      </section>

      {/* Collections */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Collections (UPI)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Today"      value={fmt.inr(stats?.collection_today)}   color="green"   sub="verified UPI payments" />
          <StatCard label="This Month" value={fmt.inr(stats?.collection_month)}  color="blue"    sub="current month" />
          <StatCard label="All Time"   value={fmt.inr(stats?.collection_total)}  color="default" sub="total platform GMV" />
        </div>
      </section>

      {/* KYC Status */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">KYC Status</h2>
          <Link href="/admin/kyc" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
            Review queue →
          </Link>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {kycSummary.length === 0 ? (
            <p className="text-slate-400 text-sm p-4">No KYC data yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Status</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">Drivers</th>
                </tr>
              </thead>
              <tbody>
                {kycSummary.map((row) => (
                  <tr key={row.status} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        row.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        row.status === 'REJECTED' ? 'bg-red-100 text-red-800'    :
                        row.status === 'PARTIAL'  ? 'bg-blue-100 text-blue-800'  :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pendingKyc > 0 && (
          <Link
            href="/admin/kyc"
            className="mt-3 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {pendingKyc} driver{pendingKyc !== 1 ? 's' : ''} awaiting KYC review
              </p>
              <p className="text-xs text-amber-600 mt-0.5">Approve or reject to enable vehicle assignment</p>
            </div>
            <span className="text-amber-600">→</span>
          </Link>
        )}
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link href="/admin/companies"
            className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all">
            <p className="text-2xl mb-2">🏢</p>
            <p className="text-sm font-semibold text-slate-900">Companies</p>
            <p className="text-xs text-slate-400 mt-0.5">Onboard & manage fleet operators</p>
          </Link>
          <Link href="/admin/kyc"
            className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm font-semibold text-slate-900">KYC Review</p>
            <p className="text-xs text-slate-400 mt-0.5">Approve driver documents</p>
          </Link>
          <Link href="/admin/drivers"
            className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all">
            <p className="text-2xl mb-2">👤</p>
            <p className="text-sm font-semibold text-slate-900">All Drivers</p>
            <p className="text-xs text-slate-400 mt-0.5">Platform-wide driver view</p>
          </Link>
        </div>