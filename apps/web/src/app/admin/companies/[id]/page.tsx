'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Badge from '@/components/admin/Badge';
import { api, fmt } from '@/lib/api';

interface Owner {
  id: number;
  name: string;
  phone_number: string;
  status: string;
  subscription_status: string;
  driver_count: number;
  vehicle_count: number;
  assigned_vehicle_count: number;
  collection_today: number;
  collection_month: number;
  collection_total: number;
  created_at: string;
}

interface Driver {
  id: number;
  name: string;
  phone_number: string;
  status: string;
  kyc_status: string;
  wallet_balance: number;
  vehicle_number: string | null;
  total_paid: number;
  paid_today: number;
  paid_month: number;
  last_payment_date: string | null;
}

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [driversLoading, setDriversLoading] = useState(false);

  useEffect(() => {
    api.get<Owner[]>(`/api/admin/companies/${id}/owners`)
      .then(d => setOwners(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const loadDrivers = async (owner: Owner) => {
    setSelectedOwner(owner);
    setDriversLoading(true);
    try {
      const data = await api.get<Driver[]>(`/api/admin/owners/${owner.id}/drivers`);
      setDrivers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setDriversLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/admin/companies" className="hover:text-indigo-600">Companies</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">Company #{id}</span>
      </div>

      {/* Owners */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Fleet Owners ({owners.length})</h2>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-slate-200 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Owner</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Drivers</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Vehicles</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Today</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Month</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {owners.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-400 text-sm">No owners yet</td></tr>
                )}
                {owners.map(o => (
                  <tr key={o.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer ${selectedOwner?.id === o.id ? 'bg-indigo-50' : ''}`}
                    onClick={() => loadDrivers(o)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{o.name}</p>
                      <p className="text-xs text-slate-400">{o.phone_number}</p>
                    </td>
                    <td className="px-4 py-3 text-center"><Badge status={o.status || 'ACTIVE'} /></td>
                    <td className="px-4 py-3 text-right text-slate-700">{o.driver_count}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{o.assigned_vehicle_count}/{o.vehicle_count}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-medium">{fmt.inr(o.collection_today)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt.inr(o.collection_month)}</td>
                    <td className="px-4 py-3 text-right text-xs text-indigo-600">
                      {selectedOwner?.id === o.id ? 'Selected ↓' : 'View drivers'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drivers panel */}
      {selectedOwner && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Drivers — {selectedOwner.name}
          </h2>
          <p className="text-slate-500 text-sm mb-4">
            {fmt.inr(selectedOwner.collection_total)} collected all time · {selectedOwner.driver_count} driver{selectedOwner.driver_count !== 1 ? 's' : ''}
          </p>

          {driversLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-slate-200 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Driver</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">Status</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">KYC</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Vehicle</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Wallet</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Paid Today</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Last Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-slate-400 text-sm">No drivers for this owner</td></tr>
                  )}
                  {drivers.map(d => (
                    <tr key={d.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{d.name}</p>
                        <p className="text-xs text-slate-400">{d.phone_number}</p>
                      </td>
                      <td className="px-4 py-3 text-center"><Badge status={d.status || 'ACTIVE'} /></td>
                      <td className="px-4 py-3 text-center">
                        <Badge status={d.kyc_status || 'NOT_STARTED'} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">{d.vehicle_number || '—'}</td>
                      <td className={`px-4 py-3 text-right font-medium ${parseFloat(String(d.wallet_balance)) < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                        {fmt.inr(d.wallet_balance)}
                      </td>
                      <td className="px-4 py-3 text-right text-green-700">{fmt.inr(d.paid_today)}</td>
                      <td className="px-4 py-3 text-right text-slate-400 text-xs">
                        {d.last_payment_date ? new Date(d.last_payment_date).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </