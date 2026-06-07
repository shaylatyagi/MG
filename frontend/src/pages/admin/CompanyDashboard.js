import React, { useState, useEffect, useCallback, Component } from 'react';

// ── Error Boundary — prevents white page on any crash ─────────
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
            <button onClick={() => { localStorage.removeItem('mg_admin_token'); window.location.reload(); }}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              Clear & Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const API = 'https://mg-qw5s.onrender.com';
const TOKEN_KEY = 'mg_admin_token';

const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const timeSince = (d) => {
  if (!d) return '—';
  const hrs = Math.floor((Date.now() - new Date(d)) / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 30 ? `${days}d ago` : fmtDate(d);
};

const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
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
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
};

// ── Status Badge ─────────────────────────────────────────────
const Badge = ({ status }) => {
  const map = {
    ACTIVE: 'bg-green-100 text-green-700', Active: 'bg-green-100 text-green-700',
    INACTIVE: 'bg-red-100 text-red-700', Inactive: 'bg-red-100 text-red-700',
    VERIFIED: 'bg-green-100 text-green-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    UNDER_REVIEW: 'bg-purple-100 text-purple-700',
    REJECTED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status || 'N/A'}
    </span>
  );
};

// ── Stat Card ─────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color = 'indigo' }) => {
  const colors = {
    indigo: 'border-indigo-400 bg-indigo-50',
    green: 'border-green-400 bg-green-50',
    blue: 'border-blue-400 bg-blue-50',
    orange: 'border-orange-400 bg-orange-50',
  };
  return (
    <div className={`border-l-4 rounded-lg p-4 shadow-sm ${colors[color]}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
};

// ── LOGIN ─────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [secret, setSecret] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api('/api/auth/admin-send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone_number: phone, admin_secret: secret }),
      });
      setStep(2);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await api('/api/auth/admin-verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone_number: phone, otp, admin_secret: secret }),
      });
      setToken(data.token);
      onLogin();
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

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        {step === 1 ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Phone Number</label>
              <input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
                placeholder="9876543210"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Secret Key</label>
              <input
                type="password" value={secret} onChange={e => setSecret(e.target.value)} required
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading ? 'Sending OTP…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <p className="text-sm text-gray-600 text-center">OTP sent to <strong>+91{phone}</strong></p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
              <input
                type="text" value={otp} onChange={e => setOtp(e.target.value)} required
                placeholder="6-digit OTP (or 000000 for demo)"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-center text-xl tracking-widest"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Login'}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-500 hover:text-gray-700">
              ← Back
            </button>
          </form>
        )}
        <p className="text-center text-xs text-gray-400 mt-6">MobilityGrid by PayYantra · Confidential</p>
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────
function Dashboard() {
  const [stats, setStats] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api('/api/admin/platform-stats').catch(() => null),
      api('/api/admin/kyc/summary').catch(() => null),
    ]).then(([s, k]) => { setStats(s); setKyc(k); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;

  const s = stats || {};
  const k = kyc || {};
  const pending = (k.PENDING || 0) + (k.SUBMITTED || 0) + (k.UNDER_REVIEW || 0);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Platform Dashboard</h2>

      {pending > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-sm">
          ⚠️ <strong>{pending} KYC verification(s)</strong> pending review
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Companies" value={s.total_companies || 0} color="indigo" />
        <StatCard label="Fleet Owners" value={s.total_owners || 0} color="blue" />
        <StatCard label="Drivers" value={s.total_drivers || 0} color="green" />
        <StatCard label="Vehicles" value={s.total_vehicles || 0} color="orange" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="GMV Today" value={fmt(s.gmv_today)} color="green" />
        <StatCard label="GMV This Month" value={fmt(s.gmv_month)} color="blue" />
        <StatCard label="GMV All Time" value={fmt(s.gmv_total)} color="indigo" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-gray-700 mb-4">KYC Status Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['VERIFIED', 'PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'REJECTED'].map(status => (
            <div key={status} className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-800">{k[status] || 0}</p>
              <Badge status={status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── COMPANIES ─────────────────────────────────────────────────
function Companies() {
  const [companies, setCompanies] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newCo, setNewCo] = useState({ name: '', cin: '', city: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api('/api/admin/companies').then(d => { setCompanies(d.data || d || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

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

  const filtered = companies.filter(c => c.name?.toLowerCase().includes(q.toLowerCase()) || c.city?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Companies</h2>
        <button onClick={() => setShowAdd(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          + Onboard Company
        </button>
      </div>

      <input
        type="text" placeholder="Search companies…" value={q} onChange={e => setQ(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />

      {loading ? <div className="text-center py-8 text-gray-400">Loading…</div> : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">City</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.city || '—'}</td>
                  <td className="px-4 py-3"><Badge status={c.status} /></td>
                  <td className="px-4 py-3 text-gray-400">{fmtDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleStatus(c.id, c.status)}
                      className={`text-xs px-3 py-1 rounded-full border font-medium transition ${
                        c.status === 'Active' || c.status === 'ACTIVE'
                          ? 'border-red-300 text-red-600 hover:bg-red-50'
                          : 'border-green-300 text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {c.status === 'Active' || c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">No companies found</p>}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-gray-800 mb-4">Onboard New Company</h3>
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <form onSubmit={addCompany} className="space-y-3">
              <input required placeholder="Company Name" value={newCo.name} onChange={e => setNewCo({ ...newCo, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input placeholder="CIN (optional)" value={newCo.cin} onChange={e => setNewCo({ ...newCo, cin: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input placeholder="City" value={newCo.city} onChange={e => setNewCo({ ...newCo, city: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Create Company'}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 border text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── KYC REVIEW ────────────────────────────────────────────────
function KycReview() {
  const [tab, setTab] = useState('pending');
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const path = tab === 'pending' ? '/api/admin/kyc/pending' : `/api/admin/kyc/all?status=${tab.toUpperCase()}`;
    api(tab === 'all' ? '/api/admin/kyc/all' : path)
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
    await api(`/api/admin/kyc/${rejectTarget}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }).catch(() => {});
    setSaving(false); setRejectTarget(null); setReason(''); load();
  };

  const tabs = [
    { key: 'pending', label: 'Pending Review' },
    { key: 'VERIFIED', label: 'Approved' },
    { key: 'REJECTED', label: 'Rejected' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">KYC Review</h2>

      <div className="flex gap-2 border-b">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-8 text-gray-400">Loading…</div> : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Driver</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">KYC Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {drivers.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{d.full_name || d.driver_name}</td>
                  <td className="px-4 py-3 text-gray-500">{d.mobile_number || d.driver_phone}</td>
                  <td className="px-4 py-3 text-gray-500">{d.owner_name || '—'}</td>
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
          {drivers.length === 0 && <p className="text-center text-gray-400 py-8">No drivers in this category</p>}
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-gray-800 mb-3">Rejection Reason</h3>
            <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Reason for rejection…"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-4" />
            <div className="flex gap-2">
              <button onClick={reject} disabled={saving || !reason}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Rejecting…' : 'Confirm Reject'}
              </button>
              <button onClick={() => setRejectTarget(null)} className="flex-1 border text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ALL DRIVERS ───────────────────────────────────────────────
function AllDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/admin/kyc/all')
      .then(d => { setDrivers(d.data || d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = drivers.filter(d => {
    const matchQ = !q || d.full_name?.toLowerCase().includes(q.toLowerCase()) || d.mobile_number?.includes(q) || d.owner_name?.toLowerCase().includes(q.toLowerCase());
    const matchStatus = !statusFilter || d.kyc_status === statusFilter;
    return matchQ && matchStatus;
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">All Drivers</h2>
      <div className="flex gap-2">
        <input type="text" placeholder="Search name, phone, owner…" value={q} onChange={e => setQ(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All KYC Status</option>
          {['PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <div className="text-center py-8 text-gray-400">Loading…</div> : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Driver</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">KYC</th>
                <th className="px-4 py-3 text-left">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{d.full_name}</td>
                  <td className="px-4 py-3 text-gray-500">{d.mobile_number}</td>
                  <td className="px-4 py-3 text-gray-500">{d.owner_name || '—'}</td>
                  <td className="px-4 py-3"><Badge status={d.kyc_status} /></td>
                  <td className="px-4 py-3 text-gray-400">{timeSince(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">No drivers found</p>}
        </div>
      )}
    </div>
  );
}

// ── MAIN ADMIN PANEL ──────────────────────────────────────────
function AdminPanelInner() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!getToken());
  const [tab, setTab] = useState('dashboard');

  if (!isLoggedIn) return <LoginPage onLogin={() => setIsLoggedIn(true)} />;

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'companies', label: 'Companies', icon: '🏢' },
    { key: 'kyc', label: 'KYC Review', icon: '🪪' },
    { key: 'drivers', label: 'All Drivers', icon: '🚗' },
  ];

  const logout = () => { clearToken(); setIsLoggedIn(false); };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 flex flex-col">
        <div className="p-5 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">M</div>
            <div>
              <p className="text-white text-sm font-semibold">MobilityGrid</p>
              <p className="text-gray-400 text-xs">Super Admin</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button key={item.key} onClick={() => setTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text