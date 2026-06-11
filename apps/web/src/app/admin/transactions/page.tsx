'use client';
import { useEffect, useState, useCallback } from 'react';
import Badge from '@/components/admin/Badge';
import { api, fmt } from '@/lib/api';

interface Txn {
  id: number;
  order_id: string | null;
  txn_id: string | null;
  amount: number;
  payment_mode: string;
  transaction_status: string;
  payment_date: string | null;
  created_at: string;
  driver_name: string | null;
  driver_phone: string | null;
  owner_name: string | null;
  company_name: string | null;
}

const STATUS_OPTIONS = ['ALL', 'SUCCESS', 'PENDING', 'FAILED', 'CANCELLED'];

export default function TransactionsPage() {
  const [txns, setTxns]       = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [status,   setStatus]   = useState('ALL');
  const [phone,    setPhone]    = useState('');
  const [orderId,  setOrderId]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (dateFrom)         qs.set('date_from', dateFrom);
      if (dateTo)           qs.set('date_to',   dateTo);
      if (status !== 'ALL') qs.set('status',    status);
      if (phone)            qs.set('phone',     phone.replace(/\D/g, ''));
      if (orderId)          qs.set('order_id',  orderId.trim());
      const data = await api.get<Txn[]>(`/api/admin/transactions?${qs.toString()}`);
      setTxns(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); setTxns([]); }
    finally { setLoading(false); }
  }, [dateFrom, dateTo, status, phone, orderId]);

  useEffect(() => { load(); }, [load]);

  const totalAmt   = txns.filter(t => t.transaction_status === 'SUCCESS').reduce((s, t) => s + parseFloat(String(t.amount)), 0);
  const totalCount = txns.filter(t => t.transaction_status === 'SUCCESS').length;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
        <p className="text-slate-500 text-sm mt-0.5">All platform payment records — filter by date, status, phone, or order ID</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filters</p>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Status' : s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Driver Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="10-digit number"
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Order ID</label>
            <input type="text" value={orderId} onChange={e => setOrderId(e.target.value)}
              placeholder="MG…"
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36" />
          </div>
          <div className="flex items-end">
            <button onClick={() => { setDateFrom(''); setDateTo(''); setStatus('ALL'); setPhone(''); setOrderId(''); }}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50">
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
            <span className="font-semibold text-green-700">{totalCount}</span>
            <span className="text-green-600 ml-1">successful · {fmt.inr(totalAmt)}</span>
          </div>
          <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
            <span className="font-semibold text-slate-700">{txns.length}</span>
            <span className="text-slate-500 ml-1">total results</span>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Order / Txn</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Driver</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Owner</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Mode</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                    No transactions found for these filters
                  </td>
                </tr>
              )}
              {txns.map(t => (
                <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-slate-700">{t.order_id || '—'}</p>
                    {t.txn_id && <p className="font-mono text-xs text-slate-400 mt-0.5">{t.txn_id}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-800 font-medium">{t.driver_name || '—'}</p>
                    {t.driver_phone && <p className="text-xs text-slate-400">{t.driver_phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700">{t.owner_name || '—'}</p>
                    {t.company_name && <p className="text-xs text-slate-400">{t.company_name}</p>}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${t.transaction_status === 'SUCCESS' ? 'text-green-700' : 'text-slate-700'}`}>
                    {fmt.inr(t.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge status={t.transaction_status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{t.payment_mode}</td>
                  <td className="px-4 py-3 text-right text-slate-400 text-xs">
                    {t.payment_date
                      ? new Date(t.payment_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : fmt.date(t.created_at)}
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
