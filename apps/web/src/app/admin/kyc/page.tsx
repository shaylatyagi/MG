'use client';
import { useEffect, useState } from 'react';
import Badge from '@/components/admin/Badge';
import { api, fmt } from '@/lib/api';

const DOC_LABELS: Record<string, string> = {
  aadhaar_front:   'Aadhaar Front',
  aadhaar_back:    'Aadhaar Back',
  pan:             'PAN',
  driving_licence: 'Driving Licence',
  bank_account:    'Bank Account',
};

interface DocRecord {
  id:               number;
  doc_type:         string;
  status:           string;   // pending | under_review | approved | rejected
  rejection_reason: string | null;
  file_url:         string | null;
}

interface KycDriver {
  id:             number;
  name:           string;
  phone_number:   string;
  kyc_status:     string | null;
  driver_status:  string;
  wallet_balance: number;
  owner_name:     string | null;
  company_name:   string | null;
  vehicle_number: string | null;
  documents:      DocRecord[];
  created_at:     string;
}

const TABS = ['PENDING', 'APPROVED', 'PARTIAL', 'REJECTED', 'ALL'] as const;
type Tab = typeof TABS[number];

const docStatusColor: Record<string, string> = {
  approved:     'border-green-200 bg-green-50 text-green-700',
  rejected:     'border-red-200 bg-red-50 text-red-600',
  under_review: 'border-amber-200 bg-amber-50 text-amber-700',
  pending:      'border-slate-200 bg-slate-50 text-slate-500',
};

const docStatusIcon: Record<string, string> = {
  approved: '✓', rejected: '✕', under_review: '…', pending: '○',
};

export default function KycPage() {
  const [tab,         setTab]         = useState<Tab>('PENDING');
  const [drivers,     setDrivers]     = useState<KycDriver[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [actionId,    setActionId]    = useState<number | null>(null);   // driver id
  const [docActionId, setDocActionId] = useState<number | null>(null);   // document id
  const [search,      setSearch]      = useState('');

  // Driver-level reject modal
  const [rejectModal,  setRejectModal]  = useState<KycDriver | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Doc-level reject modal
  const [docRejectModal,  setDocRejectModal]  = useState<{ driverId: number; doc: DocRecord } | null>(null);
  const [docRejectReason, setDocRejectReason] = useState('');

  const load = async (t: Tab) => {
    setLoading(true);
    try {
      const endpoint = t === 'PENDING'
        ? '/api/admin/kyc/pending'
        : `/api/admin/kyc/all${t !== 'ALL' ? `?status=${t}` : ''}`;
      const data = await api.get<KycDriver[]>(endpoint);
      setDrivers(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); setDrivers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(tab); }, [tab]);

  // ── Driver-level approve/reject ──────────────────────────────────────────
  const approveDriver = async (driver: KycDriver) => {
    setActionId(driver.id);
    try {
      await api.patch(`/api/admin/kyc/${driver.id}/approve`);
      setDrivers(ds => ds.filter(d => d.id !== driver.id));
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setActionId(null); }
  };

  const rejectDriver = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setActionId(rejectModal.id);
    try {
      await api.patch(`/api/admin/kyc/${rejectModal.id}/reject`, { reason: rejectReason });
      setDrivers(ds => ds.filter(d => d.id !== rejectModal.id));
      setRejectModal(null); setRejectReason('');
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setActionId(null); }
  };

  // ── Document-level approve/reject ────────────────────────────────────────
  const approveDoc = async (driverId: number, docId: number) => {
    setDocActionId(docId);
    try {
      await api.patch(`/api/admin/documents/${docId}/approve`);
      setDrivers(ds => ds.map(d =>
        d.id === driverId
          ? { ...d, documents: d.documents.map(doc => doc.id === docId ? { ...doc, status: 'approved' } : doc) }
          : d
      ));
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setDocActionId(null); }
  };

  const rejectDoc = async () => {
    if (!docRejectModal || !docRejectReason.trim()) return;
    const { driverId, doc } = docRejectModal;
    setDocActionId(doc.id);
    try {
      await api.patch(`/api/admin/documents/${doc.id}/reject`, { reason: docRejectReason });
      setDrivers(ds => ds.map(d =>
        d.id === driverId
          ? { ...d, documents: d.documents.map(x => x.id === doc.id ? { ...x, status: 'rejected', rejection_reason: docRejectReason } : x) }
          : d
      ));
      setDocRejectModal(null); setDocRejectReason('');
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setDocActionId(null); }
  };

  const filtered = drivers.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.phone_number?.includes(search) ||
    (d.owner_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">KYC Review</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Review driver documents — approve or reject per document or the whole KYC
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t === 'PENDING' ? 'Pending' : t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, phone, or owner…"
        className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />

      {!loading && (
        <p className="text-sm text-slate-500">{filtered.length} driver{filtered.length !== 1 ? 's' : ''}</p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-400 text-sm">
            {tab === 'PENDING' ? '✓ No drivers pending KYC review' : 'No records found'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(driver => (
            <div key={driver.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              {/* Driver header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{driver.name}</p>
                    <Badge status={driver.kyc_status || 'PENDING'} />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                    <span>{driver.phone_number}</span>
                    {driver.owner_name   && <span>Owner: {driver.owner_name}</span>}
                    {driver.company_name && <span>{driver.company_name}</span>}
                    <span>Joined: {fmt.date(driver.created_at)}</span>
                  </div>
                </div>

                {/* Driver-level approve/reject */}
                {(tab === 'PENDING' || tab === 'ALL') && driver.kyc_status !== 'APPROVED' && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => approveDriver(driver)} disabled={actionId === driver.id}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                      {actionId === driver.id ? '…' : '✓ Approve All'}
                    </button>
                    <button onClick={() => { setRejectModal(driver); setRejectReason(''); }}
                      disabled={actionId === driver.id}
                      className="px-3 py-1.5 border border-red-300 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50">
                      ✕ Reject All
                    </button>
                  </div>
                )}
              </div>

              {/* Per-document row */}
              {driver.documents.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No documents uploaded yet</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Documents</p>
                  <div className="flex flex-wrap gap-2">
                    {driver.documents.map(doc => (
                      <div key={doc.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${docStatusColor[doc.status] || docStatusColor.pending}`}>
                        <span className="font-semibold">{docStatusIcon[doc.status] || '○'}</span>
                        <span className="font-medium">{DOC_LABELS[doc.doc_type] || doc.doc_type}</span>
                        <span className="capitalize text-xs opacity-75">{doc.status}</span>
                        {doc.rejection_reason && (
                          <span className="text-xs opacity-60 max-w-[120px] truncate" title={doc.rejection_reason}>
                            — {doc.rejection_reason}
                          </span>
                        )}
                        {/* View document */}
                        {doc.file_url && (
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2 ml-1"
                            title="View document">
                            View
                          </a>
                        )}
                        {/* Per-doc actions — only show for pending/under_review */}
                        {(doc.status === 'pending' || doc.status === 'under_review') && (
                          <span className="flex gap-1 ml-1">
                            <button onClick={() => approveDoc(driver.id, doc.id)}
                              disabled={docActionId === doc.id}
                              className="text-green-700 hover:text-green-900 disabled:opacity-40 font-bold" title="Approve document">
                              {docActionId === doc.id ? '…' : '✓'}
                            </button>
                            <button onClick={() => { setDocRejectModal({ driverId: driver.id, doc }); setDocRejectReason(''); }}
                              disabled={docActionId === doc.id}
                              className="text-red-600 hover:text-red-800 disabled:opacity-40 font-bold" title="Reject document">
                              ✕
                            </button>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Driver-level reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Reject KYC</h2>
              <p className="text-slate-500 text-sm mt-0.5">{rejectModal.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                placeholder="e.g. Aadhaar photo unclear, DL expired, etc."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)}
                className="flex-1 py-2 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={rejectDriver} disabled={actionId !== null || !rejectReason.trim()}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50">
                {actionId !== null ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document-level reject modal */}
      {docRejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Reject Document</h2>
              <p className="text-slate-500 text-sm mt-0.5">
                {DOC_LABELS[docRejectModal.doc.doc_type] || docRejectModal.doc.doc_type}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea value={docRejectReason} onChange={e => setDocRejectReason(e.target.value)} rows={3}
                placeholder="e.g. Image blurry, document expired, not matching name…"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDocRejectModal(null)}
                className="flex-1 py-2 border border-slate-3