'use client';
import { useEffect, useState } from 'react';
import Badge from '@/components/admin/Badge';
import { api, fmt } from '@/lib/api';

// KYC statuses per DevSpec schema: PENDING | PARTIAL | APPROVED | REJECTED
const DOC_LABELS: Record<string, string> = {
  aadhaar_front:    'Aadhaar (Front)',
  aadhaar_back:     'Aadhaar (Back)',
  pan:              'PAN',
  driving_licence:  'Driving Licence',
  bank_account:     'Bank Account',
};

interface KycDriver {
  id:            number;
  name:          string;
  phone_number:  string;
  kyc_status:    string | null;
  wallet_balance: number;
  owner_name:    string | null;
  company_name:  string | null;
  vehicle_number: string | null;
  uploaded_docs: string[];
  created_at:    string;
}

const TABS = ['PENDING', 'APPROVED', 'PARTIAL', 'REJECTED', 'ALL'] as const;
type Tab = typeof TABS[number];

export default function KycPage() {
  const [tab, setTab] = useState<Tab>('PENDING');
  const [drivers, setDrivers] = useState<KycDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<KycDriver | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [search, setSearch] = useState('');

  const load = async (t: Tab) => {
    setLoading(true);
    try {
      const endpoint = t === 'PENDING'
        ? '/api/admin/kyc/pending'
        : `/api/admin/kyc/all${t !== 'ALL' ? `?status=${t}` : ''}`;
      const data = await api.get<KycDriver[]>(endpoint);
      setDrivers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(tab); }, [tab]);

  const approve = async (driver: KycDriver) => {
    setActionId(driver.id);
    try {
      await api.patch(`/api/admin/kyc/${driver.id}/approve`);
      setDrivers(ds => ds.filter(d => d.id !== driver.id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActionId(null);
    }
  };

  const reject = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason');
      return;
    }
    setActionId(rejectModal.id);
    try {
      await api.patch(`/api/admin/kyc/${rejectModal.id}/reject`, { reason: rejectReason });
      setDrivers(ds => ds.filter(d => d.id !== rejectModal.id));
      setRejectModal(null);
      setRejectReason('');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActionId(null);
    }
  };

  const filtered = drivers.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.phone_number?.includes(search) ||
    (d.owner_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const tabLabel = (t: Tab) => {
    if (t === 'PENDING')  return 'Pending Review';
    if (t === 'APPROVED') return 'Approved';
    if (t === 'PARTIAL')  return 'Partial';
    if (t === 'REJECTED') return 'Rejected';
    return 'All';
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">KYC Review</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Approve or reject driver documents to enable vehicle assignment
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tabLabel(t)}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, phone, or owner…"
        className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {!loading && (
        <p className="text-sm text-slate-500">
          Showing {filtered.length} driver{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Driver cards */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-400 text-sm">
            {tab === 'PENDING' ? '✓ No drivers pending KYC review' : 'No records found'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(driver => (
            <div key={driver.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                {/* Driver info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{driver.name}</p>
                    <Badge status={driver.kyc_status || 'PENDING'} />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>📱 {driver.phone_number}</span>
                    {driver.owner_name  && <span>Owner: {driver.owner_name}</span>}
                    {driver.company_name && <span>Co: {driver.company_name}</span>}
                    <span>Joined: {fmt.date(driver.created_at)}</span>
                  </div>

                  {/* Uploaded documents */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(['aadhaar_front', 'aadhaar_back', 'pan', 'driving_licence', 'bank_account'] as const).map(docType => {
                      const uploaded = driver.uploaded_docs?.includes(docType);
                      return (
                        <div
                          key={docType}
                          className={`px-2.5 py-1 rounded-lg text-xs border ${
                            uploaded
                              ? 'border-green-200 bg-green-50 text-green-700 font-medium'
                              : 'border-slate-200 bg-slate-50 text-slate-400'
                          }`}
                        >
                          {uploaded ? '✓ ' : '○ '}{DOC_LABELS[docType]}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                {tab === 'PENDING' && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => approve(driver)}
                      disabled={actionId === driver.id}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {actionId === driver.id ? '…' : '✓ Approve'}
                    </button>
                    <button
                      onClick={() => { setRejectModal(driver); setRejectReason(''); }}
                      disabled={actionId === driver.id}
                      className="px-4 py-2 border border-red-300 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Reject KYC</h2>
              <p className="text-slate-500 text-sm mt-0.5">{rejectModal.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reason for rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g. Aadhaar photo unclear, DL expired, etc."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-2 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={reject}
                disabled={actionId !== null || !rejectReason.trim()}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionId !== null ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
                                                                                                                                                                                                                               