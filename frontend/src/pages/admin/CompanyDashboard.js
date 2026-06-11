import React, { useState, useEffect, useCallback, useRef, Component } from 'react';
import ThemeToggle from '../../components/ThemeToggle';

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-4">{this.state.error?.message || 'Unknown error'}</p>
            <button onClick={() => window.location.reload()}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              Retry
            </button>
            <button onClick={() => { localStorage.removeItem('mg_admin_token'); window.location.href = '/admin'; }}
              className="mt-2 text-sm text-gray-400 hover:text-gray-600 underline block mx-auto">
              Logout
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────
const API          = 'https://mg-qw5s.onrender.com';
const TOKEN_KEY    = 'mg_admin_token';
const ADMIN_PHONE  = process.env.REACT_APP_ADMIN_PHONE  || '';
const ADMIN_SECRET = process.env.REACT_APP_ADMIN_SECRET || '';

// ── Utilities ─────────────────────────────────────────────────────────────────
const fmt      = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const timeSince = (d) => {
  if (!d) return '—';
  const hrs = Math.floor((Date.now() - new Date(d)) / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 30 ? `${days}d ago` : fmtDate(d);
};
const fileSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1048576).toFixed(1)} MB`;
};

const getToken   = () => localStorage.getItem(TOKEN_KEY);
const setToken   = (t) => localStorage.setItem(TOKEN_KEY, t);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const api = async (path, opts = {}) => {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Error ${res.status}`);
  return data;
};

const apiUpload = async (path, formData) => {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Error ${res.status}`);
  return data;
};

// ── Shared UI components (all at module level — never defined inside render) ──

const Badge = ({ status }) => {
  const map = {
    ACTIVE: 'bg-green-100 text-green-700', Active: 'bg-green-100 text-green-700',
    INACTIVE: 'bg-red-100 text-red-700',   Inactive: 'bg-red-100 text-red-700',
    VERIFIED:    'bg-green-100 text-green-700',
    APPROVED:    'bg-green-100 text-green-700',
    PENDING:     'bg-yellow-100 text-yellow-700',
    SUBMITTED:   'bg-blue-100 text-blue-700',
    UPLOADED:    'bg-blue-100 text-blue-700',
    UNDER_REVIEW:'bg-purple-100 text-purple-700',
    REJECTED:    'bg-red-100 text-red-700',
    SUCCESS:     'bg-green-100 text-green-700',
    FAILED:      'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status || 'N/A'}
    </span>
  );
};

const StatCard = ({ label, value, sub, color = 'indigo' }) => {
  const colors = {
    indigo: 'border-indigo-400 bg-indigo-50',
    green:  'border-green-400 bg-green-50',
    blue:   'border-blue-400 bg-blue-50',
    orange: 'border-orange-400 bg-orange-50',
    red:    'border-red-400 bg-red-50',
  };
  return (
    <div className={`border-l-4 rounded-lg p-4 shadow-sm ${colors[color] || colors.indigo}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
    </div>
  );
};

// Modal — supports breadcrumb trail + back button
// breadcrumbs = ['Companies', 'TechCorp', 'John Owner'] (renders path above title)
// onBack = go one level up (shows ← Back button)
// onClose = close entire modal chain (shows × button)
const Modal = ({ title, onClose, onBack, breadcrumbs, children, wide }) => (
  <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${wide ? 'max-w-5xl' : 'max-w-2xl'} relative`}>
      {/* Breadcrumb trail */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="px-6 pt-4 pb-0 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-300 dark:text-gray-600">›</span>}
              <span className={i === breadcrumbs.length - 1 ? 'text-indigo-600 font-medium' : ''}>{crumb}</span>
            </span>
          ))}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 font-medium transition">
              ← Back
            </button>
          )}
          <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">{title}</h3>
        </div>
        <button onClick={onClose} title="Close"
          className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 text-xl font-bold leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
          ×
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const Spinner = () => (
  <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500">
    <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mr-2" />
    Loading…
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex justify-between items-start">
    <span className="text-gray-500 dark:text-gray-400 shrink-0 mr-4">{label}</span>
    <span className="text-gray-800 dark:text-gray-100 font-medium text-right">{value ?? '—'}</span>
  </div>
);

// ── DOCUMENTS SECTION ─────────────────────────────────────────────────────────
// Reusable for driver / owner / company document management
const DOC_TYPES = {
  DRIVER: ['AADHAAR', 'PAN', 'DRIVING_LICENSE', 'PHOTO', 'AGREEMENT', 'OTHER'],
  OWNER:  ['AADHAAR', 'PAN', 'BUSINESS_REG', 'GST', 'PHOTO', 'OTHER'],
  COMPANY: ['INCORPORATION', 'GST', 'PAN', 'BANK', 'OTHER'],
};

function DocumentsSection({ userType, userId }) {
  const [docs, setDocs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType]     = useState('');
  const [error, setError]         = useState('');
  const fileRef                   = useRef(null);

  const loadDocs = useCallback(() => {
    setLoading(true);
    api(`/api/admin/user-docs/${userType}/${userId}`)
      .then(d => { setDocs(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userType, userId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !docType) { setError('Select a document type and choose a file.'); return; }
    setError(''); setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('user_type', userType);
      fd.append('user_id', userId);
      fd.append('doc_type', docType);
      await apiUpload('/api/admin/user-docs/upload', fd);
      fileRef.current.value = '';
      setDocType('');
      loadDocs();
    } catch (err) { setError(err.message); }
    finally { setUploading(false); }
  };

  const updateStatus = async (docId, status) => {
    const reason = status === 'REJECTED' ? window.prompt('Rejection reason:') : null;
    if (status === 'REJECTED' && !reason) return;
    await api(`/api/admin/user-docs/${docId}/status`, {
      method: 'PATCH', body: JSON.stringify({ status, reason }),
    }).catch(() => {});
    loadDocs();
  };

  const types = DOC_TYPES[userType.toUpperCase()] || DOC_TYPES.DRIVER;

  return (
    <div className="space-y-4">
      {/* Upload form */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
        <p className="text-sm font-medium text-indigo-800 mb-3">Upload Document for this User</p>
        <div className="flex flex-wrap gap-2 items-end">
          <select value={docType} onChange={e => setDocType(e.target.value)}
            className="px-3 py-2 border dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-700 dark:text-gray-200">
            <option value="">Select type…</option>
            {types.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
          </select>
          <input ref={fileRef} type="file" accept="image/*,application/pdf"
            className="text-sm text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-white file:text-indigo-700 file:cursor-pointer" />
          <button onClick={handleUpload} disabled={uploading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      </div>

      {/* Docs list */}
      {loading ? <Spinner /> : docs.length === 0 ? (
        <p className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">No documents uploaded yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">File</th>
              <th className="px-3 py-2 text-left">Size</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Uploaded</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {docs.map(d => (
              <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100">{d.doc_type?.replace(/_/g,' ')}</td>
                <td className="px-3 py-2 text-gray-600 max-w-xs truncate" title={d.original_name}>{d.original_name}</td>
                <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{fileSize(d.file_size)}</td>
                <td className="px-3 py-2"><Badge status={d.status} /></td>
                <td className="px-3 py-2 text-gray-400 dark:text-gray-500">{timeSince(d.uploaded_at)}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    {d.status !== 'APPROVED' && (
                      <button onClick={() => updateStatus(d.id, 'APPROVED')}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium hover:bg-green-200">
                        Approve
                      </button>
                    )}
                    {d.status !== 'REJECTED' && (
                      <button onClick={() => updateStatus(d.id, 'REJECTED')}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium hover:bg-red-200">
                        Reject
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── LOGIN PAGE ─────────────────────────────────────────────────────────────────
function LoginPage() {
  const [otp, setOtp]         = useState('');
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [phone, setPhone]     = useState(ADMIN_PHONE);
  const [secret, setSecret]   = useState(ADMIN_SECRET);
  const otpRef                = useRef(null);
  const autoSentRef           = useRef(false);

  const sendOtp = useCallback(async (phoneNum, secretKey) => {
    setError(''); setLoading(true);
    try {
      const data = await api('/api/auth/admin-send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone_number: phoneNum, admin_secret: secretKey }),
      });
      setStep(2);
      if (data.otp) setOtp(data.otp);
      setTimeout(() => otpRef.current?.focus(), 120);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (ADMIN_PHONE && ADMIN_SECRET && !autoSentRef.current) {
      autoSentRef.current = true;
      sendOtp(ADMIN_PHONE, ADMIN_SECRET);
    }
  }, [sendOtp]);

  const verifyOtp = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const data = await api('/api/auth/admin-verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone_number: phone, otp, admin_secret: secret }),
      });
      setToken(data.token);
      window.location.href = '/admin/dashboard';
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-xl font-bold">M</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MobilityGrid</h1>
          <p className="text-gray-500 text-sm mt-1">Platform Admin Access</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        {step === 1 && loading && ADMIN_PHONE && (
          <div className="text-center py-6 text-gray-500 text-sm">Sending OTP to admin phone…</div>
        )}

        {step === 1 && !loading && !ADMIN_PHONE && (
          <form onSubmit={(e) => { e.preventDefault(); sendOtp(phone, secret); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Phone</label>
              <input type="tel" value={phone} autoFocus
                onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                required placeholder="10-digit number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Secret Key</label>
              <input type="password" value={secret} onChange={e => setSecret(e.target.value)} required
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-50">
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <p className="text-sm text-gray-600 text-center">OTP sent to <strong>+91{phone}</strong></p>
            <input ref={otpRef} type="text" value={otp}
              onChange={e => setOtp(e.target.value)} required
              placeholder="6-digit OTP" maxLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-center text-2xl tracking-widest" />
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-50">
              {loading ? 'Verifying…' : 'Login'}
            </button>
            <button type="button" onClick={() => { setStep(1); setOtp(''); autoSentRef.current = false; }}
              className="w-full text-sm text-gray-500 hover:text-gray-700">
              ← Resend OTP
            </button>
          </form>
        )}
        <p className="text-center text-xs text-gray-400 mt-6">MobilityGrid by PayYantra · Confidential</p>
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard() {
  const [stats, setStats]     = useState(null);
  const [kyc, setKyc]         = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api('/api/admin/platform-stats').catch(() => null),
      api('/api/admin/kyc/summary').catch(() => null),
    ]).then(([s, k]) => { setStats(s); setKyc(k); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;
  const s = stats || {};
  const k = Array.isArray(kyc)
    ? kyc.reduce((acc, row) => { acc[row.status] = row.count; return acc; }, {})
    : (kyc || {});
  const pending = (k.PENDING || 0) + (k.SUBMITTED || 0) + (k.UNDER_REVIEW || 0);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Platform Dashboard</h2>
      {pending > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-sm">
          ⚠️ <strong>{pending} KYC verification(s)</strong> pending review
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Companies"    value={s.total_companies || 0} color="indigo" />
        <StatCard label="Fleet Owners" value={s.total_owners   || 0} color="blue"   />
        <StatCard label="Drivers"      value={s.total_drivers  || 0} color="green"  />
        <StatCard label="Vehicles"     value={s.total_vehicles || 0} color="orange" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Collection Today"      value={fmt(s.collection_today || s.gmv_today)}  color="green"  />
        <StatCard label="Collection This Month" value={fmt(s.collection_month || s.gmv_month)}  color="blue"   />
        <StatCard label="Collection All Time"   value={fmt(s.collection_total || s.gmv_total)}  color="indigo" />
      </div>
      <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">KYC Status Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {['VERIFIED','PENDING','SUBMITTED','UNDER_REVIEW','REJECTED'].map(status => (
            <div key={status} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{k[status] || 0}</p>
              <Badge status={status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── VEHICLE DETAIL MODAL ──────────────────────────────────────────────────────
function VehicleDetailModal({ vehicleId, onClose, onBack, breadcrumbs }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('overview');

  useEffect(() => {
    api(`/api/admin/vehicles/${vehicleId}`)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [vehicleId]);

  if (loading) return <Modal title="Vehicle Details" onClose={onClose} onBack={onBack} breadcrumbs={breadcrumbs}><Spinner /></Modal>;
  if (!data)   return <Modal title="Vehicle Details" onClose={onClose} onBack={onBack} breadcrumbs={breadcrumbs}><p className="text-gray-500">Failed to load</p></Modal>;

  const { vehicle: v = {}, history = [] } = data;

  return (
    <Modal title={`${v.vehicle_number || 'Vehicle'} · ${v.vehicle_model || ''}`} onClose={onClose} onBack={onBack} breadcrumbs={breadcrumbs} wide>
      <div className="flex gap-1 border-b dark:border-gray-700 mb-4 -mt-2">
        {[['overview','Overview'],['history','Assignment History'],['docs','Documents']].map(([k,label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab===k ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label="Total Collected"   value={fmt(v.total_collected)}  color="green"  />
            <StatCard label="Collected Today"   value={fmt(v.collected_today)}  color="blue"   />
            <StatCard label="Collected Month"   value={fmt(v.collected_month)}  color="indigo" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Vehicle Info</p>
              <Row label="Number"         value={v.vehicle_number} />
              <Row label="Model"          value={v.vehicle_model || '—'} />
              <Row label="Status"         value={<Badge status={v.status || v.operational_status} />} />
              <Row label="Daily Rent"     value={v.daily_rent ? fmt(v.daily_rent) : '—'} />
              <Row label="Rent Type"      value={v.rent_type || '—'} />
              <Row label="Insurance Exp"  value={fmtDate(v.insurance_expiry)} />
              <Row label="Fitness Exp"    value={fmtDate(v.fitness_expiry)} />
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Current Assignment</p>
              {v.driver_id ? (
                <>
                  <Row label="Driver"       value={v.driver_name} />
                  <Row label="Driver Phone" value={v.driver_phone} />
                  <Row label="Driver KYC"   value={<Badge status={v.driver_kyc} />} />
                  <Row label="Assigned"     value={timeSince(v.current_since)} />
                </>
              ) : <p className="text-gray-400 dark:text-gray-500 italic text-sm">No driver assigned</p>}
              <div className="pt-2 border-t">
                <Row label="Owner"    value={v.owner_name || '—'} />
                <Row label="Company"  value={v.company_name || '—'} />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Driver</th>
              <th className="px-3 py-2 text-left">Phone</th>
              <th className="px-3 py-2 text-left">From</th>
              <th className="px-3 py-2 text-left">To</th>
              <th className="px-3 py-2 text-right">Days</th>
              <th className="px-3 py-2 text-right">Earned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {history.length === 0
              ? <tr><td colSpan={6} className="py-8 text-center text-gray-400 dark:text-gray-500">No assignment history</td></tr>
              : history.map(h => (
                <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100">{h.driver_name}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{h.driver_phone}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{fmtDate(h.assigned_at)}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{h.unassigned_at ? fmtDate(h.unassigned_at) : <span className="text-green-600 font-medium">Active</span>}</td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{h.total_days ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{h.total_earned != null ? fmt(h.total_earned) : '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {tab === 'docs' && (
        <DocumentsSection userType="VEHICLE" userId={vehicleId} />
      )}
    </Modal>
  );
}

// ── DRIVER DETAIL MODAL ───────────────────────────────────────────────────────
function DriverDetailModal({ driverId, onClose, onBack, breadcrumbs }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('overview');

  useEffect(() => {
    api(`/api/admin/drivers/${driverId}`)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [driverId]);

  if (loading) return <Modal title="Driver Details" onClose={onClose} onBack={onBack} breadcrumbs={breadcrumbs}><Spinner /></Modal>;
  if (!data)   return <Modal title="Driver Details" onClose={onClose} onBack={onBack} breadcrumbs={breadcrumbs}><p className="text-gray-500">Failed to load</p></Modal>;

  const { driver: d, transactions = [], vehicle_history = [], daily_logs = [] } = data;

  return (
    <Modal title={`${d.full_name || 'Driver'} · ${d.driver_code || ''}`}
      onClose={onClose} onBack={onBack} breadcrumbs={breadcrumbs} wide>
      <div className="flex gap-1 border-b dark:border-gray-700 mb-4 -mt-2 flex-wrap">
        {[['overview','Overview'],['transactions','Payments'],['vehicles','Vehicle History'],['logs','Daily Logs'],['docs','Documents']].map(([k,label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab===k ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Paid"      value={fmt(d.total_paid)}         color="green"  />
            <StatCard label="Paid Today"      value={fmt(d.paid_today)}          color="blue"   />
            <StatCard label="Paid This Month" value={fmt(d.paid_month)}          color="indigo" />
            <StatCard label="Transactions"    value={d.total_transactions || 0}  color="orange" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Personal</p>
              <Row label="Phone"      value={d.mobile_number} />
              <Row label="Status"     value={<Badge status={d.status} />} />
              <Row label="KYC"        value={<Badge status={d.kyc_status} />} />
              <Row label="DOB"        value={fmtDate(d.date_of_birth)} />
              <Row label="DL Number"  value={d.driving_license_number || '—'} />
              <Row label="DL Expiry"  value={fmtDate(d.driving_license_expiry)} />
              <Row label="Joined"     value={fmtDate(d.created_at)} />
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Fleet & Finance</p>
              <Row label="Owner"       value={d.owner_name || '—'} />
              <Row label="Owner Phone" value={d.owner_phone || '—'} />
              <Row label="Vehicle"     value={d.vehicle_number ? `${d.vehicle_number} · ${d.vehicle_model || ''}` : '—'} />
              <Row label="Assigned"    value={d.vehicle_since ? timeSince(d.vehicle_since) : '—'} />
              <Row label="Daily Rent"  value={d.daily_rent ? fmt(d.daily_rent) : '—'} />
              <Row label="Wallet"      value={fmt(d.wallet_balance)} />
              <Row label="Security"    value={fmt(d.security_deposit)} />
              <Row label="Last Payment" value={timeSince(d.last_payment_date)} />
            </div>
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Order ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0
                ? <tr><td colSpan={4} className="py-8 text-center text-gray-400 dark:text-gray-500">No transactions</td></tr>
                : transactions.map((t, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{fmtDate(t.order_initiation_date)}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-800 dark:text-gray-100">{fmt(t.order_amount)}</td>
                    <td className="px-3 py-2"><Badge status={t.transaction_status} /></td>
                    <td className="px-3 py-2 text-gray-400 dark:text-gray-500 text-xs">{t.order_id}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'vehicles' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Vehicle</th>
                <th className="px-3 py-2 text-left">Assigned</th>
                <th className="px-3 py-2 text-left">Released</th>
                <th className="px-3 py-2 text-right">Days</th>
                <th className="px-3 py-2 text-right">Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vehicle_history.length === 0
                ? <tr><td colSpan={5} className="py-8 text-center text-gray-400 dark:text-gray-500">No vehicle history</td></tr>
                : vehicle_history.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100">{h.vehicle_number} {h.vehicle_model ? `· ${h.vehicle_model}` : ''}</td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{fmtDate(h.assigned_at)}</td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{h.unassigned_at ? fmtDate(h.unassigned_at) : <span className="text-green-600 font-medium">Active</span>}</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{h.total_days ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{h.total_earned != null ? fmt(h.total_earned) : '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'logs' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-right">Active Minutes</th>
                <th className="px-3 py-2 text-right">Trips</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {daily_logs.length === 0
                ? <tr><td colSpan={3} className="py-8 text-center text-gray-400 dark:text-gray-500">No daily logs</td></tr>
                : daily_logs.map((l, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{fmtDate(l.log_date)}</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{l.active_minutes ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{l.trip_count ?? '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'docs' && <DocumentsSection userType="DRIVER" userId={d.id} />}
    </Modal>
  );
}

// ── OWNER DETAIL MODAL ────────────────────────────────────────────────────────
function OwnerDetailModal({ ownerId, onClose, onBack, breadcrumbs, onSelectDriver, onSelectVehicle }) {
  const [data, setData]         = useState(null);
  const [drivers, setDrivers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('overview');

  useEffect(() => {
    Promise.all([
      api(`/api/admin/owners/${ownerId}`).catch(() => null),
      api(`/api/admin/owners/${ownerId}/drivers`).catch(() => []),
    ]).then(([d, dr]) => {
      setData(d);
      setDrivers(Array.isArray(dr) ? dr : []);
      setLoading(false);
    });
  }, [ownerId]);

  if (loading) return <Modal title="Owner Details" onClose={onClose} onBack={onBack} breadcrumbs={breadcrumbs}><Spinner /></Modal>;
  if (!data)   return <Modal title="Owner Details" onClose={onClose} onBack={onBack} breadcrumbs={breadcrumbs}><p className="text-gray-500">Failed to load</p></Modal>;

  const o        = data.owner || {};
  const vehicles = data.vehicles || [];
  const payments = data.recent_payments || [];

  return (
    <Modal title={`${o.full_name || 'Owner'} · ${o.owner_code || ''}`}
      onClose={onClose} onBack={onBack} breadcrumbs={breadcrumbs} wide>
      <div className="flex gap-1 border-b dark:border-gray-700 mb-4 -mt-2 flex-wrap">
        {[['overview','Overview'],['drivers',`Drivers (${drivers.length})`],['vehicles',`Vehicles (${vehicles.length})`],['payments','Payments'],['docs','Documents']].map(([k,label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab===k ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Drivers"  value={o.total_drivers  || 0} color="blue"   />
            <StatCard label="Vehicles"       value={o.total_vehicles || 0} color="orange" />
            <StatCard label="Total Collection" value={fmt(o.collection_total)} color="green" />
            <StatCard label="This Month"     value={fmt(o.collection_month)}  color="indigo" />
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-sm space-y-2">
            <Row label="Phone"         value={o.mobile_number} />
            <Row label="Business"      value={o.business_name || '—'} />
            <Row label="Email"         value={o.email || '—'} />
            <Row label="City"          value={o.city || '—'} />
            <Row label="Subscription"  value={o.subscription_end_date ? fmtDate(o.subscription_end_date) : '—'} />
            <Row label="Joined"        value={fmtDate(o.created_at)} />
          </div>
        </div>
      )}

      {tab === 'drivers' && (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Driver</th>
              <th className="px-3 py-2 text-left">Phone</th>
              <th className="px-3 py-2 text-left">Vehicle</th>
              <th className="px-3 py-2 text-right">Total Paid</th>
              <th className="px-3 py-2 text-left">KYC</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {drivers.length === 0
              ? <tr><td colSpan={6} className="py-8 text-center text-gray-400 dark:text-gray-500">No drivers</td></tr>
              : drivers.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100">{d.full_name}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{d.mobile_number}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{d.vehicle_number || '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{fmt(d.total_paid)}</td>
                  <td className="px-3 py-2"><Badge status={d.kyc_status} /></td>
                  <td className="px-3 py-2">
                    <button onClick={() => onSelectDriver && onSelectDriver(d.id, d.full_name)}
                      className="text-xs text-indigo-600 hover:underline font-medium">View</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {tab === 'vehicles' && (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Vehicle</th>
              <th className="px-3 py-2 text-left">Model</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Driver</th>
              <th className="px-3 py-2 text-right">Daily Rent</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vehicles.length === 0
              ? <tr><td colSpan={6} className="py-8 text-center text-gray-400 dark:text-gray-500">No vehicles</td></tr>
              : vehicles.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100">{v.vehicle_number}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{v.vehicle_model || '—'}</td>
                  <td className="px-3 py-2"><Badge status={v.status || v.operational_status} /></td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{v.driver_mobile || '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{v.daily_rent ? fmt(v.daily_rent) : '—'}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => onSelectVehicle && onSelectVehicle(v.id, v.vehicle_number)}
                      className="text-xs text-indigo-600 hover:underline font-medium">View</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {tab === 'payments' && (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Driver</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.length === 0
              ? <tr><td colSpan={3} className="py-8 text-center text-gray-400 dark:text-gray-500">No payments</td></tr>
              : payments.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{fmtDate(p.order_completion_date)}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{p.driver_name}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800 dark:text-gray-100">{fmt(p.order_amount)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {tab === 'docs' && <DocumentsSection userType="OWNER" userId={o.id} />}
    </Modal>
  );
}

// ── COMPANY DETAIL MODAL ──────────────────────────────────────────────────────
// Company-level docs: all owner+driver docs for this company
function CompanyDocsSection({ companyId }) {
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile]       = useState(null);
  const [docType, setDocType] = useState('AGREEMENT');
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState('');

  const load = () => {
    setLoading(true);
    api(`/api/admin/companies/${companyId}/docs`)
      .then(d => { setDocs(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, [companyId]);

  const handleUpload = async () => {
    if (!file) { setError('File choose karo'); return; }
    setError(''); setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('doc_type', docType);
    fd.append('user_type', 'COMPANY');
    fd.append('user_id', companyId);
    try {
      await apiUpload('/api/admin/user-docs/upload', fd);
      setFile(null); load();
    } catch { setError('Upload failed'); }
    setUploading(false);
  };

  const updateStatus = async (docId, status) => {
    await api(`/api/admin/user-docs/${docId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, status } : d));
  };

  return (
    <div>
      {/* Upload form */}
      <div className="bg-indigo-50 rounded-lg p-3 mb-4 border border-indigo-100">
        <p className="text-sm font-medium text-indigo-800 mb-3">Upload Company Document</p>
        <div className="flex gap-2 flex-wrap">
          <select value={docType} onChange={e => setDocType(e.target.value)}
            className="border dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 flex-shrink-0">
            <option value="AGREEMENT">Agreement</option>
            <option value="GST">GST Certificate</option>
            <option value="PAN">PAN Card</option>
            <option value="REGISTRATION">Company Registration</option>
            <option value="OTHER">Other</option>
          </select>
          <input type="file" onChange={e => setFile(e.target.files[0])}
            className="text-xs flex-1 min-w-0 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-white file:text-indigo-700" />
          <button onClick={handleUpload} disabled={uploading}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50 flex-shrink-0">
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>

      {loading ? <Spinner /> : docs.length === 0 ? (
        <p className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">No documents uploaded yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Document</th>
                <th className="px-3 py-2 text-left">File</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Uploaded</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100">{d.user_name || d.user_id}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{d.user_type}</td>
                  <td className="px-3 py-2">{d.doc_type?.replace(/_/g,' ')}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs truncate max-w-[140px]">{d.original_name}</td>
                  <td className="px-3 py-2"><Badge status={d.status} /></td>
                  <td className="px-3 py-2 text-gray-400 dark:text-gray-500 text-xs">{timeSince(d.uploaded_at)}</td>
                  <td className="px-3 py-2">
                    {d.status === 'UPLOADED' && (
                      <div className="flex gap-1">
                        <button onClick={() => updateStatus(d.id, 'APPROVED')}
                          className="text-xs text-green-600 hover:underline">✓ Approve</button>
                        <button onClick={() => updateStatus(d.id, 'REJECTED')}
                          className="text-xs text-red-500 hover:underline ml-1">✗ Reject</button>
                      </div>
                    )}
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

function CompanyDetailModal({ company, onClose, onBack, breadcrumbs, onSelectOwner }) {
  const [owners, setOwners]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState('owners');
  const [payMode, setPayMode]         = useState(company.payment_mode || 'BOTH');
  const [payModeSaving, setPayModeSaving] = useState(false);
  const [payModeMsg, setPayModeMsg]   = useState('');

  useEffect(() => {
    api(`/api/admin/companies/${company.id}/owners`)
      .then(d => { setOwners(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [company.id]);

  const savePaymentMode = async () => {
    setPayModeSaving(true); setPayModeMsg('');
    try {
      await api(`/api/admin/companies/${company.id}/payment-mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_mode: payMode }),
      });
      setPayModeMsg('✓ Saved');
    } catch (e) {
      setPayModeMsg('Error: ' + (e.message || 'failed'));
    } finally {
      setPayModeSaving(false);
    }
  };

  const totalCollection = owners.reduce((s, o) => s + parseFloat(o.collection_total || 0), 0);

  return (
    <Modal title={
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: `hsl(${(company.name?.charCodeAt(0) || 65) * 137 % 360}, 60%, 45%)` }}>
          {company.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <span>{company.name} — {company.city || 'N/A'}</span>
      </div>
    }
      onClose={onClose} onBack={onBack} breadcrumbs={breadcrumbs} wide>
      <div className="flex gap-1 border-b dark:border-gray-700 mb-4 -mt-2">
        {[['owners','Owners'],['docs','Documents'],['settings','Settings']].map(([k,label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab===k ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'owners' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="Owners"    value={owners.length}                                            color="blue"   />
            <StatCard label="Drivers"   value={owners.reduce((s, o) => s + (o.total_drivers || 0), 0)}  color="green"  />
            <StatCard label="Vehicles"  value={owners.reduce((s, o) => s + (o.total_vehicles || 0), 0)} color="orange" />
            <StatCard label="Collection" value={fmt(totalCollection)}                                    color="indigo" />
          </div>
          {loading ? <Spinner /> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Owner</th>
                  <th className="px-3 py-2 text-left">Phone</th>
                  <th className="px-3 py-2 text-right">Drivers</th>
                  <th className="px-3 py-2 text-right">Vehicles</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Month</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {owners.length === 0
                  ? <tr><td colSpan={7} className="py-8 text-center text-gray-400 dark:text-gray-500">No owners found</td></tr>
                  : owners.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100">{o.full_name}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{o.mobile_number}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{o.total_drivers || 0}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{o.total_vehicles || 0}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{fmt(o.collection_total)}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{fmt(o.collection_month)}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => onSelectOwner && onSelectOwner(o.id, o.full_name)}
                          className="text-xs text-indigo-600 hover:underline font-medium">View</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {tab === 'docs' && <CompanyDocsSection companyId={company.id} />}

      {tab === 'settings' && (
        <div className="space-y-6 max-w-md">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Payment Mode</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Controls which payment options drivers of this company can use.
            </p>
            <select
              value={payMode}
              onChange={e => { setPayMode(e.target.value); setPayModeMsg(''); }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="BOTH">Both (Cash + Online)</option>
              <option value="CASH_ONLY">Cash Only</option>
              <option value="ONLINE_ONLY">Online Only</option>
            </select>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={savePaymentMode}
                disabled={payModeSaving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg disabled:opacity-50"
              >
                {payModeSaving ? 'Saving…' : 'Save'}
              </button>
              {payModeMsg && (
                <span className={`text-sm ${payModeMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                  {payModeMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── COMPANIES ─────────────────────────────────────────────────────────────────
function Companies() {
  const [companies, setCompanies] = useState([]);
  const [q, setQ]               = useState('');
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [newCo, setNewCo]       = useState({ name: '', cin: '', city: '' });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [renaming, setRenaming] = useState(null); // { id, name }
  const [renameVal, setRenameVal] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);

  // Drill-down stack: each entry = { type, id, label }
  const [stack, setStack] = useState([]);
  const push = (entry) => setStack(prev => [...prev, entry]);
  const pop  = ()      => setStack(prev => prev.slice(0, -1));
  const closeAll = ()  => setStack([]);

  const load = useCallback(() => {
    setLoading(true);
    api('/api/admin/companies')
      .then(d => { setCompanies(d.data || d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const startRename = (e, c) => {
    e.stopPropagation();
    setRenaming({ id: c.id, name: c.name });
    setRenameVal(c.name);
  };

  const saveRename = async () => {
    if (!renameVal.trim() || renameVal.trim() === renaming.name) { setRenaming(null); return; }
    setRenameSaving(true);
    try {
      await api(`/api/admin/companies/${renaming.id}/name`, { method: 'PATCH', body: JSON.stringify({ name: renameVal.trim() }) });
      setRenaming(null);
      load();
    } catch (err) { alert(err.message); }
    finally { setRenameSaving(false); }
  };

  const toggleStatus = async (id, current) => {
    const next = current === 'Active' || current === 'ACTIVE' ? 'Inactive' : 'Active';
    await api(`/api/admin/companies/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
    load();
  };

  const addCompany = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api('/api/admin/companies', { method: 'POST', body: JSON.stringify(newCo) });
      setShowAdd(false); setNewCo({ name: '', cin: '', city: '' }); load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const filtered = companies.filter(c =>
    c.name?.toLowerCase().includes(q.toLowerCase()) || c.city?.toLowerCase().includes(q.toLowerCase())
  );

  // Build breadcrumbs from stack
  const breadcrumbs = ['Companies', ...stack.map(s => s.label)];
  const top = stack[stack.length - 1];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Companies</h2>
        <button onClick={() => setShowAdd(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          + Onboard Company
        </button>
      </div>

      <input type="text" placeholder="Search companies…" value={q} onChange={e => setQ(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />

      {loading ? <Spinner /> : (
        <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">City</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-indigo-50 cursor-pointer"
                  onClick={() => push({ type: 'company', id: c.id, data: c, label: c.name })}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: `hsl(${(c.name?.charCodeAt(0) || 65) * 137 % 360}, 60%, 45%)` }}>
                        {c.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="font-medium text-indigo-700 hover:underline">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{c.city || '—'}</td>
                  <td className="px-4 py-3"><Badge status={c.status} /></td>
                  <td className="px-4 py-3 text-gray-400">{fmtDate(c.created_at)}</td>
                  <td className="px-4 py-3 flex gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleStatus(c.id, c.status)}
                      className={`text-xs px-3 py-1 rounded-full border font-medium transition ${
                        c.status === 'Active' || c.status === 'ACTIVE'
                          ? 'border-red-300 text-red-600 hover:bg-red-50'
                          : 'border-green-300 text-green-600 hover:bg-green-50'
                      }`}>
                      {c.status === 'Active' || c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={e => startRename(e, c)}
                      className="text-xs px-3 py-1 rounded-full border border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-medium transition">
                      ✏️ Rename
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">No companies found</p>}
        </div>
      )}

      {/* Rename Company */}
      {renaming && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">Rename Company</h3>
            <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenaming(null); }}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4" />
            <div className="flex gap-2">
              <button onClick={saveRename} disabled={renameSaving}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {renameSaving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setRenaming(null)}
                className="flex-1 border dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Company */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">Onboard New Company</h3>
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <form onSubmit={addCompany} className="space-y-3">
              <input required placeholder="Company Name" value={newCo.name}
                onChange={e => setNewCo({ ...newCo, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input placeholder="CIN (optional)" value={newCo.cin}
                onChange={e => setNewCo({ ...newCo, cin: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input placeholder="City" value={newCo.city}
                onChange={e => setNewCo({ ...newCo, city: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving…' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 border dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drill-down modals using stack */}
      {top?.type === 'company' && (
        <CompanyDetailModal
          company={top.data}
          breadcrumbs={breadcrumbs.slice(0, -1)}
          onBack={pop}
          onClose={closeAll}
          onSelectOwner={(id, label) => push({ type: 'owner', id, label })}
        />
      )}
      {top?.type === 'owner' && (
        <OwnerDetailModal
          ownerId={top.id}
          breadcrumbs={breadcrumbs.slice(0, -1)}
          onBack={pop}
          onClose={closeAll}
          onSelectDriver={(id, label) => push({ type: 'driver', id, label })}
          onSelectVehicle={(id, label) => push({ type: 'vehicle', id, label })}
        />
      )}
      {top?.type === 'driver' && (
        <DriverDetailModal
          driverId={top.id}
          breadcrumbs={breadcrumbs.slice(0, -1)}
          onBack={pop}
          onClose={closeAll}
        />
      )}
      {top?.type === 'vehicle' && (
        <VehicleDetailModal
          vehicleId={top.id}
          breadcrumbs={breadcrumbs.slice(0, -1)}
          onBack={pop}
          onClose={closeAll}
        />
      )}
    </div>
  );
}

// ── KYC REVIEW ────────────────────────────────────────────────────────────────
function KycReview() {
  const [tab, setTab]             = useState('pending');
  const [drivers, setDrivers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason]       = useState('');
  const [saving, setSaving]       = useState(false);
  const [stack, setStack]         = useState([]);
  const push = (entry) => setStack(prev => [...prev, entry]);
  const pop  = ()      => setStack(prev => prev.slice(0, -1));
  const closeAll = ()  => setStack([]);
  const top = stack[stack.length - 1];

  const load = useCallback(() => {
    setLoading(true);
    const path = tab === 'pending' ? '/api/admin/kyc/pending'
                : tab === 'all'    ? '/api/admin/kyc/all'
                : `/api/admin/kyc/all?status=${tab}`;
    api(path)
      .then(d => { setDrivers(d.data || d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    setSaving(true);
    await api(`/api/admin/kyc/${id}/approve`, { method: 'PATCH' }).catch(() => {});
    setSaving(false); load();
  };
  const reject = async () => {
    setSaving(true);
    await api(`/api/admin/kyc/${rejectTarget}/reject`, {
      method: 'PATCH', body: JSON.stringify({ reason }),
    }).catch(() => {});
    setSaving(false); setRejectTarget(null); setReason(''); load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">KYC Review</h2>
      <div className="flex gap-2 border-b dark:border-gray-700">
        {[['pending','Pending Review'],['VERIFIED','Approved'],['REJECTED','Rejected'],['all','All']].map(([k,label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${tab===k ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Driver</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">KYC Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {drivers.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <button onClick={() => push({ type: 'driver', id: d.id, label: d.full_name || d.driver_name })}
                      className="font-medium text-indigo-700 hover:underline text-left">
                      {d.full_name || d.driver_name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{d.mobile_number}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{d.owner_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{d.company_name || '—'}</td>
                  <td className="px-4 py-3"><Badge status={d.kyc_status} /></td>
                  <td className="px-4 py-3">
                    {(d.kyc_status === 'PENDING' || d.kyc_status === 'SUBMITTED' || d.kyc_status === 'UNDER_REVIEW') && (
                      <div className="flex gap-2">
                        <button onClick={() => approve(d.id)} disabled={saving}
                          className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium hover:bg-green-200 disabled:opacity-50">
                          Approve
                        </button>
                        <button onClick={() => { setRejectTarget(d.id); setReason(''); }}
                          className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-full font-medium hover:bg-red-200">
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {drivers.length === 0 && <p className="text-center text-gray-400 py-8">No drivers</p>}
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">Rejection Reason</h3>
            <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Reason…"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-4" />
            <div className="flex gap-2">
              <button onClick={reject} disabled={saving || !reason}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Rejecting…' : 'Confirm Reject'}
              </button>
              <button onClick={() => setRejectTarget(null)}
                className="flex-1 border dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {top?.type === 'driver' && (
        <DriverDetailModal
          driverId={top.id}
          breadcrumbs={['KYC Review', top.label]}
          onBack={pop}
          onClose={closeAll}
        />
      )}
    </div>
  );
}

// ── ALL DRIVERS ───────────────────────────────────────────────────────────────
function AllDrivers() {
  const [drivers, setDrivers]   = useState([]);
  const [q, setQ]               = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading]   = useState(true);
  const [stack, setStack]       = useState([]);
  const push = (entry) => setStack(prev => [...prev, entry]);
  const pop  = ()      => setStack(prev => prev.slice(0, -1));
  const closeAll = ()  => setStack([]);
  const top = stack[stack.length - 1];

  useEffect(() => {
    api('/api/admin/all-drivers')
      .then(d => { setDrivers(d.data || d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = drivers.filter(d => {
    const matchQ = !q ||
      d.full_name?.toLowerCase().includes(q.toLowerCase()) ||
      d.mobile_number?.includes(q) ||
      d.owner_name?.toLowerCase().includes(q.toLowerCase()) ||
      d.company_name?.toLowerCase().includes(q.toLowerCase()) ||
      d.vehicle_number?.toLowerCase().includes(q.toLowerCase());
    return matchQ && (!statusFilter || d.kyc_status === statusFilter);
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">All Drivers <span className="text-sm font-normal text-gray-400 dark:text-gray-500">({drivers.length})</span></h2>
      <div className="flex gap-2">
        <input type="text" placeholder="Search name, phone, owner, vehicle…" value={q} onChange={e => setQ(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none">
          <option value="">All KYC</option>
          {['PENDING','SUBMITTED','UNDER_REVIEW','VERIFIED','REJECTED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-xl shadow-sm border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Driver</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Vehicle</th>
                <th className="px-4 py-3 text-right">Today</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">KYC</th>
                <th className="px-4 py-3 text-left">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => push({ type: 'driver', id: d.id, label: d.full_name })}>
                  <td className="px-4 py-3 font-medium text-indigo-700 hover:underline">{d.full_name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{d.mobile_number}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{d.owner_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{d.company_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{d.vehicle_number || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmt(d.paid_today)}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmt(d.total_paid)}</td>
                  <td className="px-4 py-3"><Badge status={d.kyc_status} /></td>
                  <td className="px-4 py-3 text-gray-400">{timeSince(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">No drivers</p>}
        </div>
      )}

      {top?.type === 'driver' && (
        <DriverDetailModal
          driverId={top.id}
          breadcrumbs={['All Drivers', top.label]}
          onBack={pop}
          onClose={closeAll}
        />
      )}
    </div>
  );
}

// ── ALL OWNERS ────────────────────────────────────────────────────────────────
function AllOwners() {
  const [owners, setOwners]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [q, setQ]                   = useState('');
  const [stack, setStack]           = useState([]);
  const [editPhone, setEditPhone]   = useState(null);   // { id, name }
  const [editPhoneVal, setEditPhoneVal]   = useState('');
  const [editPhoneSaving, setEditPhoneSaving] = useState(false);
  const push = (entry) => setStack(prev => [...prev, entry]);
  const pop  = ()      => setStack(prev => prev.slice(0, -1));
  const closeAll = ()  => setStack([]);
  const top = stack[stack.length - 1];
  const breadcrumbs = ['Owners', ...stack.map(s => s.label)];

  const startEditPhone = (e, o) => {
    e.stopPropagation();
    setEditPhone({ id: o.id, name: o.full_name });
    setEditPhoneVal(o.mobile_number || '');
  };
  const savePhone = async () => {
    if (!/^\d{10}$/.test(editPhoneVal.trim())) { alert('10-digit number daalo'); return; }
    const cur = owners.find(o => o.id === editPhone.id)?.mobile_number;
    if (editPhoneVal.trim() === cur) { setEditPhone(null); return; }
    setEditPhoneSaving(true);
    try {
      await api(`/api/admin/owners/${editPhone.id}/phone`, {
        method: 'PATCH', body: JSON.stringify({ phone: editPhoneVal.trim() })
      });
      setOwners(prev => prev.map(o => o.id === editPhone.id ? { ...o, mobile_number: editPhoneVal.trim() } : o));
      setEditPhone(null);
    } catch (err) { alert(err.message); }
    finally { setEditPhoneSaving(false); }
  };

  useEffect(() => {
    api('/api/admin/companies')
      .then(async (cos) => {
        const list = cos.data || cos || [];
        const allOwners = await Promise.all(
          list.map(c => api(`/api/admin/companies/${c.id}/owners`).catch(() => []))
        );
        const flat = allOwners.flat().filter((o, i, arr) => arr.findIndex(x => x.id === o.id) === i);
        setOwners(flat);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = owners.filter(o =>
    !q ||
    o.full_name?.toLowerCase().includes(q.toLowerCase()) ||
    o.mobile_number?.includes(q) ||
    o.owner_code?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Fleet Owners <span className="text-sm font-normal text-gray-400 dark:text-gray-500">({owners.length})</span></h2>
      <input type="text" placeholder="Search name, phone, code…" value={q} onChange={e => setQ(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />

      {loading ? <Spinner /> : (
        <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-xl shadow-sm border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-right">Drivers</th>
                <th className="px-4 py-3 text-right">Vehicles</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Month</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-indigo-50 cursor-pointer"
                  onClick={() => push({ type: 'owner', id: o.id, label: o.full_name })}>
                  <td className="px-4 py-3 font-medium text-indigo-700 hover:underline">{o.full_name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400" onClick={e => e.stopPropagation()}>
                    <span>{o.mobile_number}</span>
                    <button onClick={e => startEditPhone(e, o)} className="ml-2 text-gray-300 hover:text-indigo-500 text-xs" title="Edit phone">✏️</button>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{o.owner_code}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{o.total_drivers || 0}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{o.total_vehicles || 0}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmt(o.collection_total)}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmt(o.collection_month)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">No owners</p>}
        </div>
      )}

      {editPhone && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditPhone(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">Change Phone Number</h3>
            <p className="text-sm text-gray-500 mb-4">{editPhone.name}</p>
            <input type="tel" autoFocus maxLength={10}
              value={editPhoneVal}
              onChange={e => setEditPhoneVal(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') savePhone(); if (e.key === 'Escape') setEditPhone(null); }}
              className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
              placeholder="10-digit mobile number" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditPhone(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={savePhone} disabled={editPhoneSaving}
                className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white disabled:opacity-50">
                {editPhoneSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {top?.type === 'owner' && (
        <OwnerDetailModal
          ownerId={top.id}
          breadcrumbs={breadcrumbs.slice(0, -1)}
          onBack={pop}
          onClose={closeAll}
          onSelectDriver={(id, label) => push({ type: 'driver', id, label })}
          onSelectVehicle={(id, label) => push({ type: 'vehicle', id, label })}
        />
      )}
      {top?.type === 'driver' && (
        <DriverDetailModal
          driverId={top.id}
          breadcrumbs={breadcrumbs.slice(0, -1)}
          onBack={pop}
          onClose={closeAll}
        />
      )}
      {top?.type === 'vehicle' && (
        <VehicleDetailModal
          vehicleId={top.id}
          breadcrumbs={breadcrumbs.slice(0, -1)}
          onBack={pop}
          onClose={closeAll}
        />
      )}
    </div>
  );
}

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────
function Transactions() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)           params.set('search',   search);
    if (status !== 'ALL') params.set('status',   status);
    if (dateFrom)         params.set('dateFrom', dateFrom);
    if (dateTo)           params.set('dateTo',   dateTo);
    api(`/api/admin/transactions?${params}`)
      .then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search, status, dateFrom, dateTo]);

  useEffect(() => { load(); }, []); // eslint-disable-line

  const totalSuccess = rows.filter(r => r.transaction_status === 'SUCCESS')
    .reduce((s, r) => s + parseFloat(r.order_amount || 0), 0);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Transactions</h2>
      <div className="flex flex-wrap gap-2">
        <input type="text" placeholder="Search order ID, phone…" value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none">
          <option value="ALL">All Status</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Pending</option>
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none" />
        <button onClick={load}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          Filter
        </button>
      </div>
      {!loading && (
        <div className="flex gap-4 text-sm text-gray-600">
          <span><strong>{rows.length}</strong> records</span>
          <span className="text-green-700"><strong>{fmt(totalSuccess)}</strong> total successful</span>
        </div>
      )}
      {loading ? <Spinner /> : (
        <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-xl shadow-sm border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Driver</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Order ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtDate(r.order_initiation_date)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.driver_name || r.payer_mobile || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.owner_name || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-100">{fmt(r.order_amount)}</td>
                  <td className="px-4 py-3"><Badge status={r.transaction_status} /></td>
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">{r.order_id || r.pg_transaction_id || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="text-center text-gray-400 py-8">No transactions</p>}
        </div>
      )}
    </div>
  );
}

// ── AUDIT LOG ─────────────────────────────────────────────────────────────────
function AuditLog() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/admin/audit-log')
      .then(d => { setLogs(d.logs || d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const actionColors = {
    KYC_APPROVED: 'text-green-600', KYC_REJECTED: 'text-red-600',
    COMPANY_STATUS_CHANGED: 'text-blue-600', COMPANY_CREATED: 'text-indigo-600',
    ADMIN_DOC_UPLOADED: 'text-purple-600', DOC_APPROVED: 'text-green-600', DOC_REJECTED: 'text-red-600',
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Audit Log</h2>
      {loading ? <Spinner /> : (
        <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Entity</th>
                <th className="px-4 py-3 text-left">By</th>
                <th className="px-4 py-3 text-left">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(l => {
                let details = '';
                try { details = typeof l.details === 'string' ? JSON.stringify(JSON.parse(l.details)) : JSON.stringify(l.details); }
                catch { details = String(l.details || ''); }
                return (
                  <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{timeSince(l.created_at)}</td>
                    <td className={`px-4 py-3 font-medium ${actionColors[l.action] || 'text-gray-700 dark:text-gray-300'}`}>{l.action}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{l.entity_type} #{l.entity_id}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{l.performed_by}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{details}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {logs.length === 0 && <p className="text-center text-gray-400 py-8">No audit events yet</p>}
        </div>
      )}
    </div>
  );
}

// ── CHAT VIEWER ───────────────────────────────────────────────────────────────
function ChatViewer() {
  const [threads, setThreads]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [q, setQ]               = useState('');

  useEffect(() => {
    api('/api/admin/chat/threads')
      .then(d => { setThreads(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const openThread = (thread) => {
    setSelected(thread); setMsgLoading(true);
    api(`/api/admin/chat/messages?driver_id=${thread.driver_id}`)
      .then(d => { setMessages(Array.isArray(d) ? d : []); setMsgLoading(false); })
      .catch(() => setMsgLoading(false));
  };

  const filtered = threads.filter(t =>
    !q ||
    t.driver_name?.toLowerCase().includes(q.toLowerCase()) ||
    t.owner_name?.toLowerCase().includes(q.toLowerCase()) ||
    t.driver_phone?.includes(q)
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Chat Viewer</h2>
      <p className="text-sm text-gray-500">Read-only view of all owner ↔ driver conversations.</p>

      <div className="flex gap-4 h-[600px]">
        <div className="w-72 flex flex-col bg-white dark:bg-gray-800 dark:border-gray-700 rounded-xl border shadow-sm overflow-hidden">
          <div className="p-3 border-b dark:border-gray-700">
            <input type="text" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)}
              className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? <Spinner /> : filtered.map(t => (
              <button key={t.driver_id} onClick={() => openThread(t)}
                className={`w-full text-left px-4 py-3 border-b dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-700 transition ${selected?.driver_id === t.driver_id ? 'bg-indigo-50 dark:bg-indigo-900/30 border-l-2 border-l-indigo-500' : ''}`}>
                <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{t.driver_name}</p>
                <p className="text-xs text-gray-500 truncate">Owner: {t.owner_name || '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{t.last_message}</p>
                <p className="text-xs text-gray-300 mt-0.5">{timeSince(t.last_at)}</p>
              </button>
            ))}
            {!loading && filtered.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">No conversations</p>
            )}
          </div>
        </div>

        <div className="flex-1 bg-white dark:bg-gray-800 dark:border-gray-700 rounded-xl border shadow-sm overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Select a conversation to view
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <p className="font-semibold text-gray-800 dark:text-gray-100">{selected.driver_name} ↔ {selected.owner_name}</p>
                <p className="text-xs text-gray-500">{selected.driver_phone}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgLoading ? <Spinner /> : messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_type === 'OWNER' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-xs rounded-xl px-4 py-2 text-sm shadow-sm ${m.sender_type === 'OWNER' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100' : 'bg-indigo-600 text-white'}`}>
                      <p>{m.message}</p>
                      <p className={`text-xs mt-1 ${m.sender_type === 'OWNER' ? 'text-gray-400' : 'text-indigo-200'}`}>
                        {m.sender_type === 'OWNER' ? m.owner_name : m.driver_name} · {timeSince(m.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                {!msgLoading && messages.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-8">No messages</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAIN ADMIN PANEL ──────────────────────────────────────────────────────────
function AdminPanelInner() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!getToken());
  const [tab, setTab]               = useState('dashboard');

  if (!isLoggedIn) return <LoginPage onLogin={() => setIsLoggedIn(true)} />;

  const navItems = [
    { key: 'dashboard',    label: 'Dashboard',   icon: '📊' },
    { key: 'companies',    label: 'Companies',    icon: '🏢' },
    { key: 'owners',       label: 'Owners',       icon: '👤' },
    { key: 'drivers',      label: 'All Drivers',  icon: '🚗' },
    { key: 'kyc',          label: 'KYC Review',   icon: '🪪' },
    { key: 'transactions', label: 'Transactions', icon: '💳' },
    { key: 'chat',         label: 'Chat',         icon: '💬' },
    { key: 'audit',        label: 'Audit Log',    icon: '📋' },
  ];

  const logout = () => { clearToken(); window.location.href = '/login'; };
  const tabLabel = navItems.find(n => n.key === tab)?.label || tab;

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950 font-sans">
      <aside className="w-56 bg-gray-900 flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">M</div>
            <div>
              <p className="text-white text-sm font-semibold">MobilityGrid</p>
              <p className="text-gray-400 text-xs">Super Admin</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <button key={item.key} onClick={() => setTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                tab === item.key ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-700">
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition">
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{tabLabel}</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-xs text-gray-400 dark:text-gray-500">Super Admin · MobilityGrid</span>
          </div>
        </header>
        <div className="p-6">
          {tab === 'dashboard'    && <Dashboard />}
          {tab === 'companies'    && <Companies />}
          {tab === 'owners'       && <AllOwners />}
          {tab === 'drivers'      && <AllDrivers />}
          {tab === 'kyc'          && <KycReview />}
          {tab === 'transactions' && <Transactions />}
          {tab === 'chat'         && <ChatViewer />}
          {tab === 'audit'        && <AuditLog />}
        </div>
      </main>
    </div>
  );
}

export default function AdminPanel() {
  return (
    <ErrorBoundary>
      <AdminPanelInner />
    </ErrorBoundary>
  );
}
