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
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={async () => {
                        try {
                          const r = await api(`/api/admin/user-docs/${d.id}/view`);
                          if (r.view_url) window.open(r.view_url, '_blank');
                          else alert('No file stored for this document');
                        } catch { alert('Could not load document URL'); }
                      }}
                      className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium hover:bg-indigo-100">
                      👁 View
                    </button>
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
function LoginPage({ onLogin }) {
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPass, setShowPass] = useState(false);

  const login = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const data = await api('/api/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify({ phone_number: phone, password }),
      });
      setToken(data.token);
      onLogin();
    } catch (err) { setError(err.message || 'Invalid credentials'); }
    finally { setLoading(false); }
  };

  const inputCls = "w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition";

  return (
    <div style={{
      minHeight:'100vh', background:'#030712',
      display:'flex', alignItems:'stretch',
      fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'
    }}>
      {/* ── Left panel — branding ── */}
      <div style={{
        flex:'0 0 45%', background:'linear-gradient(135deg,#1e1b4b 0%,#0f172a 60%,#0c1222 100%)',
        display:'flex', flexDirection:'column', justifyContent:'space-between',
        padding:'48px', borderRight:'1px solid rgba(255,255,255,0.06)',
        position:'relative', overflow:'hidden'
      }} className="hidden lg:flex">
        {/* Ambient glow */}
        <div style={{position:'absolute',top:'-80px',left:'-80px',width:320,height:320,borderRadius:'50%',background:'radial-gradient(circle,rgba(99,102,241,0.15) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:'-60px',right:'-60px',width:240,height:240,borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,0.1) 0%,transparent 70%)',pointerEvents:'none'}}/>

        {/* Logo */}
        <div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 24px rgba(99,102,241,0.4)'}}>
              <span style={{color:'white',fontWeight:900,fontSize:18}}>M</span>
            </div>
            <div>
              <p style={{color:'white',fontWeight:700,fontSize:16,letterSpacing:'-0.02em'}}>MobilityGrid</p>
              <p style={{color:'rgba(255,255,255,0.35)',fontSize:11,fontWeight:500,marginTop:1}}>by PayYantra</p>
            </div>
          </div>
        </div>

        {/* Center copy */}
        <div>
          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:20,padding:'4px 12px',marginBottom:24}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#6366f1',display:'inline-block'}}/>
            <span style={{color:'#a5b4fc',fontSize:11,fontWeight:600,letterSpacing:'0.04em'}}>SUPER ADMIN CONSOLE</span>
          </div>
          <h1 style={{color:'white',fontSize:36,fontWeight:800,lineHeight:1.15,letterSpacing:'-0.03em',marginBottom:16}}>
            Fleet operations,<br/><span style={{color:'#818cf8'}}>fully in control.</span>
          </h1>
          <p style={{color:'rgba(255,255,255,0.4)',fontSize:14,lineHeight:1.65,maxWidth:340}}>
            Manage fleets, drivers, KYC, payments, and compliance across all companies on the MobilityGrid platform.
          </p>

          {/* Metrics strip */}
          <div style={{display:'flex',gap:32,marginTop:40}}>
            {[['Fleets','Multi-company'],['KYC','Automated'],['Payments','Real-time']].map(([val,label])=>(
              <div key={val}>
                <p style={{color:'white',fontWeight:700,fontSize:16}}>{val}</p>
                <p style={{color:'rgba(255,255,255,0.35)',fontSize:11,marginTop:2}}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{color:'rgba(255,255,255,0.2)',fontSize:11}}>© 2026 PayYantra · Confidential</p>
      </div>

      {/* ── Right panel — form ── */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'48px 24px'}}>
        <div style={{width:'100%',maxWidth:400}}>

          {/* Mobile logo (hidden on desktop) */}
          <div className="lg:hidden" style={{display:'flex',alignItems:'center',gap:10,marginBottom:40}}>
            <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{color:'white',fontWeight:900,fontSize:16}}>M</span>
            </div>
            <p style={{color:'white',fontWeight:700,fontSize:15}}>MobilityGrid Admin</p>
          </div>

          {/* Heading */}
          <div style={{marginBottom:32}}>
            <h2 style={{color:'white',fontWeight:700,fontSize:24,letterSpacing:'-0.02em',marginBottom:6}}>
              Sign in to console
            </h2>
            <p style={{color:'rgba(255,255,255,0.35)',fontSize:13}}>Authorised personnel only.</p>
          </div>

          {/* Error */}
          {error && (
            <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,padding:'10px 14px',color:'#f87171',fontSize:13,marginBottom:20}}>
              {error}
            </div>
          )}

          {/* Login form — phone + password only, no OTP self-service */}
          <form onSubmit={login} style={{display:'flex',flexDirection:'column',gap:16}}>
            <div>
              <label style={{display:'block',color:'rgba(255,255,255,0.5)',fontSize:12,fontWeight:500,marginBottom:8,letterSpacing:'0.02em'}}>PHONE NUMBER</label>
              <input type="tel" value={phone} autoFocus
                onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                required placeholder="10-digit mobile number"
                className={inputCls} />
            </div>
            <div>
              <label style={{display:'block',color:'rgba(255,255,255,0.5)',fontSize:12,fontWeight:500,marginBottom:8,letterSpacing:'0.02em'}}>PASSWORD</label>
              <div style={{position:'relative'}}>
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                  className={inputCls} style={{paddingRight:56}} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.3)',fontSize:12,fontWeight:500,background:'none',border:'none',cursor:'pointer'}}>
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} style={{
              width:'100%',padding:'14px',marginTop:8,
              background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color:'white',fontWeight:600,fontSize:14,borderRadius:12,border:'none',cursor:'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
              transition:'all 0.2s'
            }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <p style={{color:'rgba(255,255,255,0.15)',fontSize:11,marginTop:40,textAlign:'center'}}>
            MobilityGrid Admin Console · PayYantra · Confidential
          </p>
        </div>
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
                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={async () => {
                          try {
                            const r = await api(`/api/admin/user-docs/${d.id}/view`);
                            if (r.view_url) window.open(r.view_url, '_blank');
                            else alert('No file stored for this document');
                          } catch { alert('Could not load document URL'); }
                        }}
                        className="text-xs text-indigo-600 hover:underline">👁 View</button>
                      {d.status !== 'APPROVED' && (
                        <button onClick={() => updateStatus(d.id, 'APPROVED')}
                          className="text-xs text-green-600 hover:underline ml-1">✓ Approve</button>
                      )}
                      {d.status !== 'REJECTED' && (
                        <button onClick={() => updateStatus(d.id, 'REJECTED')}
                          className="text-xs text-red-500 hover:underline ml-1">✗ Reject</button>
                      )}
                    </div>
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
  // Payment mode requests (fix: these were previously undefined)
  const [pmRequests, setPmRequests]   = useState([]);
  const [pmLoading, setPmLoading]     = useState(false);
  // Branches
  const [branches, setBranches]         = useState([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [addingBranch, setAddingBranch]   = useState(false);
  const [newBranch, setNewBranch]         = useState({ name: '', city: '', state: '' });
  const [branchSaving, setBranchSaving]   = useState(false);
  const [selBranch, setSelBranch]         = useState(null);
  const [branchDrivers, setBranchDrivers] = useState([]);
  const [branchVehicles, setBranchVehicles] = useState([]);
  const [branchDetailLoading, setBranchDetailLoading] = useState(false);

  useEffect(() => {
    api(`/api/admin/companies/${company.id}/owners`)
      .then(d => { setOwners(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
    // Load pending payment mode requests for this company
    api(`/api/admin/payment-mode-requests?status=PENDING&company_id=${company.id}`)
      .then(d => setPmRequests(Array.isArray(d.requests) ? d.requests : []))
      .catch(() => {});
  }, [company.id]);

  const loadBranches = useCallback(() => {
    setBranchLoading(true);
    api(`/api/admin/companies/${company.id}/branches`)
      .then(d => { setBranches(Array.isArray(d.branches) ? d.branches : []); setBranchLoading(false); })
      .catch(() => setBranchLoading(false));
  }, [company.id]);

  useEffect(() => { if (tab === 'branches') loadBranches(); }, [tab, loadBranches]);

  const approvePmRequest = async (id, newMode) => {
    setPmLoading(true);
    try {
      await api(`/api/admin/payment-mode-requests/${id}/approve`, { method: 'PATCH' });
      setPmRequests(prev => prev.filter(r => r.id !== id));
    } catch(e) { alert(e.message); } finally { setPmLoading(false); }
  };

  const rejectPmRequest = async (id) => {
    setPmLoading(true);
    try {
      await api(`/api/admin/payment-mode-requests/${id}/reject`, { method: 'PATCH' });
      setPmRequests(prev => prev.filter(r => r.id !== id));
    } catch(e) { alert(e.message); } finally { setPmLoading(false); }
  };

  const createBranch = async (e) => {
    e.preventDefault();
    if (!newBranch.name.trim()) return;
    setBranchSaving(true);
    try {
      await api(`/api/admin/companies/${company.id}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBranch),
      });
      setNewBranch({ name: '', city: '', state: '' });
      setAddingBranch(false);
      loadBranches();
    } catch (err) { alert(err.message); } finally { setBranchSaving(false); }
  };

  const deleteBranch = async (branchId) => {
    if (!window.confirm('Delete this branch? Drivers and vehicles will be unassigned.')) return;
    try {
      await api(`/api/admin/companies/${company.id}/branches/${branchId}`, { method: 'DELETE' });
      loadBranches();
      if (selBranch?.id === branchId) setSelBranch(null);
    } catch (err) { alert(err.message); }
  };

  const viewBranch = async (branch) => {
    setSelBranch(branch);
    setBranchDetailLoading(true);
    try {
      const [dr, vr] = await Promise.all([
        api(`/api/admin/branches/${branch.id}/drivers`),
        api(`/api/admin/branches/${branch.id}/vehicles`),
      ]);
      setBranchDrivers(Array.isArray(dr.drivers) ? dr.drivers : []);
      setBranchVehicles(Array.isArray(vr.vehicles) ? vr.vehicles : []);
    } catch {} finally { setBranchDetailLoading(false); }
  };

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
        {[['owners','Owners'],['docs','Documents'],['branches','Branches'],['settings', pmRequests.length > 0 ? 'Settings 🔴' : 'Settings']].map(([k,label]) => (
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

      {tab === 'branches' && (
        <div>
          {/* Branch detail drill-down */}
          {selBranch ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setSelBranch(null)}
                  className="text-sm text-indigo-600 hover:underline">← Branches</button>
                <span className="text-gray-400">/</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{selBranch.name}</span>
              </div>
              {branchDetailLoading ? <Spinner /> : (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 mb-2">Drivers ({branchDrivers.length})</h4>
                    {branchDrivers.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 py-3">No drivers assigned to this branch</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
                          <tr>
                            <th className="px-3 py-2 text-left">Name</th>
                            <th className="px-3 py-2 text-left">Phone</th>
                            <th className="px-3 py-2 text-left">Vehicle</th>
                            <th className="px-3 py-2 text-left">KYC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {branchDrivers.map(d => (
                            <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                              onClick={() => onSelectOwner && null /* extend if needed */}>
                              <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100">{d.full_name}</td>
                              <td className="px-3 py-2 text-gray-500">{d.mobile_number}</td>
                              <td className="px-3 py-2 text-gray-500">{d.reg_number || '—'}</td>
                              <td className="px-3 py-2"><Badge status={d.kyc_status || 'PENDING'} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 mb-2">Vehicles ({branchVehicles.length})</h4>
                    {branchVehicles.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 py-3">No vehicles assigned to this branch</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
                          <tr>
                            <th className="px-3 py-2 text-left">Reg Number</th>
                            <th className="px-3 py-2 text-left">Type</th>
                            <th className="px-3 py-2 text-left">Driver</th>
                            <th className="px-3 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {branchVehicles.map(v => (
                            <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100">{v.reg_number}</td>
                              <td className="px-3 py-2 text-gray-500">{v.vehicle_type}</td>
                              <td className="px-3 py-2 text-gray-500">{v.driver_name || '—'}</td>
                              <td className="px-3 py-2"><Badge status={v.status || 'ACTIVE'} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Branch list */
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Geographic branches of <strong>{company.name}</strong>. Each branch has its own drivers and vehicles.
                </p>
                <button onClick={() => setAddingBranch(true)}
                  className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700">
                  + Add Branch
                </button>
              </div>

              {addingBranch && (
                <form onSubmit={createBranch} className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-4 mb-4 space-y-3">
                  <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">New Branch</p>
                  <div className="flex gap-2 flex-wrap">
                    <input required placeholder="Branch Name (e.g. Delhi Branch)" value={newBranch.name}
                      onChange={e => setNewBranch({ ...newBranch, name: e.target.value })}
                      className="flex-1 min-w-[160px] border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
                    <input placeholder="City" value={newBranch.city}
                      onChange={e => setNewBranch({ ...newBranch, city: e.target.value })}
                      className="w-28 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
                    <input placeholder="State" value={newBranch.state}
                      onChange={e => setNewBranch({ ...newBranch, state: e.target.value })}
                      className="w-28 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={branchSaving}
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                      {branchSaving ? 'Saving…' : 'Create Branch'}
                    </button>
                    <button type="button" onClick={() => setAddingBranch(false)}
                      className="px-4 py-1.5 border dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {branchLoading ? <Spinner /> : branches.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-3xl mb-2">🌿</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No branches yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add branches to organize drivers and vehicles by location</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {branches.map(b => (
                    <div key={b.id}
                      className="border dark:border-gray-700 rounded-xl p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition cursor-pointer"
                      onClick={() => viewBranch(b)}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-100">{b.name}</p>
                          {(b.city || b.state) && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              📍 {[b.city, b.state].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                        <button onClick={e => { e.stopPropagation(); deleteBranch(b.id); }}
                          className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5">✕</button>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-3">
                        <div className="text-center">
                          <p className="text-lg font-bold text-indigo-600">{b.driver_count || 0}</p>
                          <p className="text-[10px] text-gray-400 uppercase">Drivers</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-violet-600">{b.vehicle_count || 0}</p>
                          <p className="text-[10px] text-gray-400 uppercase">Vehicles</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-emerald-600">{fmt(b.collection_today || 0)}</p>
                          <p className="text-[10px] text-gray-400 uppercase">Today</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-blue-600">{fmt(b.collection_month || 0)}</p>
                          <p className="text-[10px] text-gray-400 uppercase">This Month</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-6 max-w-md">

          {pmRequests.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-800">
                🔔 Payment Mode Change Request{pmRequests.length > 1 ? 's' : ''}
              </p>
              {pmRequests.map(req => (
                <div key={req.id} className="bg-white rounded-lg p-3 border border-amber-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-700">{req.owner_name}</p>
                    <span className="text-[10px] text-gray-400">{new Date(req.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">{req.current_mode || 'BOTH'}</span>
                    {' → '}
                    <span className="font-bold text-indigo-700">{req.requested_mode}</span>
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => approvePmRequest(req.id, req.requested_mode)} disabled={pmLoading}
                      className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-semibold disabled:opacity-50">
                      ✓ Approve
                    </button>
                    <button onClick={() => rejectPmRequest(req.id)} disabled={pmLoading}
                      className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs rounded-lg font-semibold border border-red-200 disabled:opacity-50">
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

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
  const [confirmCo, setConfirmCo] = useState(null); // confirm deactivate

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
                    <button
                      onClick={() =>
                        (c.status === 'Active' || c.status === 'ACTIVE')
                          ? setConfirmCo(c)
                          : toggleStatus(c.id, c.status)
                      }
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

      {/* Deactivate Confirm */}
      {confirmCo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-red-600 text-xl">⚠</span>
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">Deactivate Company?</h3>
            <p className="text-sm font-semibold text-indigo-700 mb-1">{confirmCo.name}</p>
            <p className="text-xs text-gray-500 mb-5">All owners and drivers in this company will lose access until reactivated.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmCo(null)}
                className="flex-1 border dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => { setConfirmCo(null); toggleStatus(confirmCo.id, confirmCo.status); }}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700">
                Yes, Deactivate
              </button>
            </div>
          </div>
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

// ── DOCUMENT APPROVALS ────────────────────────────────────────────────────────
function DocApprovals() {
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = () => {
    setLoading(true);
    api('/api/admin/document-approvals')
      .then(d => { setDocs(d.docs || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    await api(`/api/admin/document-approvals/${id}/approve`, { method: 'PUT' }).catch(() => {});
    load();
  };

  const reject = async () => {
    if (!rejectId) return;
    await api(`/api/admin/document-approvals/${rejectId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason: rejectReason }),
    }).catch(() => {});
    setRejectId(null);
    setRejectReason('');
    load();
  };

  return (
    <div className="space-y-4">
      {/* Reject reason modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Reject Document</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Optional: provide reason for rejection.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Image blurry, wrong document type…"
              className="w-full border dark:border-gray-600 rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-gray-800 dark:text-gray-200"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setRejectId(null); setRejectReason(''); }}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                Cancel
              </button>
              <button onClick={reject}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition">
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Document Approvals</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Review and approve documents uploaded by drivers and owners.
          </p>
        </div>
        <button onClick={load} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1.5 bg-indigo-50 rounded-lg">
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : docs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <div className="text-5xl mb-3">✅</div>
          <p className="font-medium">No pending documents</p>
          <p className="text-sm mt-1">All uploads have been reviewed.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {docs.map(d => (
            <div key={d.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition">
              {/* Document preview */}
              <div
                className="h-40 bg-gray-50 dark:bg-gray-700 flex items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition relative group"
                onClick={() => d.view_url && window.open(d.view_url, '_blank')}
              >
                {d.mime_type?.startsWith('image/') && d.view_url ? (
                  <img src={d.view_url} alt={d.original_name} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
                    <span className="text-4xl">📄</span>
                    <span className="text-xs font-medium">Click to View PDF</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 text-white bg-black/50 rounded-full px-3 py-1 text-xs font-medium transition">
                    👁 Open
                  </span>
                </div>
              </div>

              {/* Meta */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                      {d.doc_type?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {d.user_name || '—'} · {d.user_type}
                    </p>
                    {d.company_name && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{d.company_name}</p>
                    )}
                  </div>
                  <span className="text-xs text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full font-medium shrink-0">
                    PENDING
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1 truncate">{d.original_name}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{fileSize(d.file_size)} · {timeSince(d.uploaded_at)}</p>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => approve(d.id)}
                    className="flex-1 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition">
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => setRejectId(d.id)}
                    className="flex-1 py-2 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition border border-red-200 dark:border-red-800">
                    ✕ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN ADMIN PANEL ──────────────────────────────────────────────────────────
function useAdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  const fetchNotifs = () => {
    api('/api/admin/notifications')
      .then(r => r.json())
      .then(d => { if (d.success) { setNotifications(d.notifications || []); setUnread(d.unread || 0); } })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifs();
    const id = setInterval(fetchNotifs, 30000); // poll every 30s
    return () => clearInterval(id);
  }, []);

  const markAllRead = () => {
    api('/api/admin/notifications/read-all', { method: 'PUT' })
      .then(() => { setUnread(0); setNotifications(n => n.map(x => ({ ...x, is_read: true }))); })
      .catch(() => {});
  };

  return { notifications, unread, markAllRead };
}

// ── Admin nav icons (inline SVG, no external dep) ────────────────────────────
const NavIcon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((path, i) => <path key={i} d={path} />) : <path d={d} />}
  </svg>
);

const NAV_ICONS = {
  dashboard:    ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
  companies:    ['M3 21V7l9-4 9 4v14', 'M9 21v-6h6v6'],
  owners:       ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75', 'M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8'],
  drivers:      ['M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v5', 'M14 17a3 3 0 1 0 6 0 3 3 0 0 0-6 0', 'M5 17a3 3 0 1 0 6 0 3 3 0 0 0-6 0'],
  kyc:          ['M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z', 'M16 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4', 'M8 12h.01'],
  docs:         ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M9 15l2 2 4-4'],
  transactions: ['M8 3H5a2 2 0 0 0-2 2v3', 'M21 8V5a2 2 0 0 0-2-2h-3', 'M3 16v3a2 2 0 0 0 2 2h3', 'M16 21h3a2 2 0 0 0 2-2v-3', 'M7 12h10', 'M12 7l5 5-5 5'],
  chat:         ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  audit:        ['M9 11l3 3L22 4', 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'],
  pins:         ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M12 8v4', 'M12 16h.01'],
};



// ═══════════════════════════════════════════════════════════════════════════════
// PIN MANAGEMENT SECTION
// ═══════════════════════════════════════════════════════════════════════════════
function LeadsSection() {
  const [leads, setLeads] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(API + '/api/admin/leads', {
      headers: { Authorization: 'Bearer ' + (localStorage.getItem('mg_admin_token') || '') }
    })
      .then(r => r.json())
      .then(d => { setLeads(d.leads || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const downloadCSV = () => {
    const headers = ['Name', 'Phone', 'Company', 'Role', 'Fleet Size', 'City', 'Type', 'Submitted At'];
    const rows = leads.map(l => [l.name, l.phone, l.company||'', l.role||'', l.fleet||'', l.city||'', l.type||'', new Date(l.submitted_at).toLocaleString('en-IN')]);
    const csv = [headers, ...rows].map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    a.download = 'mg_leads.csv'; a.click();
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Landing Page Leads</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>{leads.length} total submissions</p>
        </div>
        <button onClick={downloadCSV} style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          Download CSV
        </button>
      </div>
      {loading ? <p style={{ color: '#64748b' }}>Loading…</p> : leads.length === 0 ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '48px 0' }}>No leads yet</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Name', 'Phone', 'Company', 'Role', 'Fleet', 'City', 'Date'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{l.name}</td>
                  <td style={{ padding: '10px 12px', color: '#4f46e5', fontWeight: 600 }}>{l.phone}</td>
                  <td style={{ padding: '10px 12px', color: '#334155' }}>{l.company || '—'}</td>
                  <td style={{ padding: '10px 12px', color: '#334155' }}>{l.role || '—'}</td>
                  <td style={{ padding: '10px 12px', color: '#334155' }}>{l.fleet || '—'}</td>
                  <td style={{ padding: '10px 12px', color: '#334155' }}>{l.city || '—'}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{new Date(l.submitted_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


function PinManagementSection() {
  const [status, setStatus]             = React.useState(null);
  const [companies, setCompanies]       = React.useState([]);
  const [owners, setOwners]             = React.useState([]);
  const [scopeCompany, setScopeCompany] = React.useState('');
  const [scopeOwner, setScopeOwner]     = React.useState('');
  const [generating, setGenerating]     = React.useState(false);
  const [pins, setPins]                 = React.useState([]);
  const [msg, setMsg]                   = React.useState('');
  const [resetPhone, setResetPhone]     = React.useState('');
  const [resetRole, setResetRole]       = React.useState('OWNER');
  const [resetting, setResetting]       = React.useState(false);
  const [resetResult, setResetResult]   = React.useState(null);

  React.useEffect(function() {
    loadStatus();
    api('/api/admin/companies-list').then(function(d) { if (d.success) setCompanies(d.companies); }).catch(function(){});
  }, []);

  React.useEffect(function() {
    if (!scopeCompany) { setOwners([]); setScopeOwner(''); return; }
    api('/api/admin/owners-list?company_id=' + scopeCompany)
      .then(function(d) { if (d.success) setOwners(d.owners); }).catch(function(){});
    setScopeOwner('');
  }, [scopeCompany]);

  function loadStatus() {
    api('/api/admin/pin-status').then(function(d) { if (d.success) setStatus(d); }).catch(function(){});
  }

  async function generatePins() {
    setGenerating(true); setMsg(''); setPins([]);
    try {
      var body = {};
      if (scopeOwner)        body.owner_id   = parseInt(scopeOwner);
      else if (scopeCompany) body.company_id  = parseInt(scopeCompany);
      var d = await api('/api/admin/generate-pins', { method: 'POST', body: JSON.stringify(body) });
      if (d.success) {
        setPins(d.pins);
        setMsg(d.count === 0 ? 'All users in this scope already have PINs.' : d.count + ' PINs generated. Download the list below.');
        loadStatus();
      } else { setMsg(d.message || 'Failed'); }
    } catch { setMsg('Network error'); }
    setGenerating(false);
  }

  function downloadCSV() {
    var header = 'Role,Name,Phone,Code,PIN';
    var rows = pins.map(function(p) { return [p.role, '"' + p.name + '"', p.phone, p.code || '', p.pin].join(','); });
    var csv  = [header].concat(rows).join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    var scope = scopeOwner ? ('owner_' + scopeOwner) : scopeCompany ? ('co_' + scopeCompany) : 'all';
    a.href = url; a.download = 'mg_pins_' + scope + '.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function doResetPin() {
    if (resetPhone.length < 10) return;
    setResetting(true); setResetResult(null);
    try {
      var d = await api('/api/admin/reset-pin', { method: 'POST', body: JSON.stringify({ phone_number: resetPhone, role: resetRole }) });
      if (d.success) setResetResult(d);
      else setMsg('Reset failed: ' + (d.message || ''));
    } catch { setMsg('Network error'); }
    setResetting(false);
  }

  var scopeLabel = scopeOwner
    ? 'Owner: ' + ((owners.find(function(o) { return String(o.id) === scopeOwner; }) || {}).full_name || scopeOwner)
    : scopeCompany
      ? 'Company: ' + ((companies.find(function(co) { return String(co.id) === scopeCompany; }) || {}).name || scopeCompany)
      : 'All companies (platform-wide)';

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-900">PIN Management</h2>
        <p className="text-sm text-slate-500 mt-1">Generate initial PINs per company or owner — each CSV is scoped so no owner sees another's drivers.</p>
      </div>

      {status && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Owners with PIN',     val: status.owners_with_pin,     color: 'emerald' },
            { label: 'Owners without PIN',  val: status.owners_without_pin,  color: 'amber'   },
            { label: 'Drivers with PIN',    val: status.drivers_with_pin,    color: 'emerald' },
            { label: 'Drivers without PIN', val: status.drivers_without_pin, color: 'amber'   },
          ].map(function(card) {
            return (
              <div key={card.label} className={'bg-' + card.color + '-50 border border-' + card.color + '-200 rounded-2xl p-4 text-center'}>
                <p className={'text-2xl font-black text-' + card.color + '-700'}>{card.val}</p>
                <p className={'text-xs font-semibold text-' + card.color + '-600 mt-1'}>{card.label}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="font-black text-slate-800">Generate Initial PINs</h3>
          <p className="text-xs text-slate-500 mt-1">Pick a scope, generate, download CSV, share ONLY with that owner. Leave blank for platform-wide.</p>
        </div>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="text-xs font-black text-slate-600 block mb-1">Company</label>
            <select value={scopeCompany} onChange={function(e) { setScopeCompany(e.target.value); }}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 min-w-[160px]">
              <option value="">All companies</option>
              {companies.map(function(co) { return <option key={co.id} value={String(co.id)}>{co.name}</option>; })}
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-slate-600 block mb-1">Owner (optional)</label>
            <select value={scopeOwner} onChange={function(e) { setScopeOwner(e.target.value); }}
              disabled={!scopeCompany}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 min-w-[180px] disabled:opacity-40">
              <option value="">All owners in company</option>
              {owners.map(function(o) { return <option key={o.id} value={String(o.id)}>{o.full_name} · {o.mobile_number}</option>; })}
            </select>
          </div>
        </div>
        <div className="text-xs text-indigo-700 font-semibold bg-indigo-50 rounded-xl px-3 py-2">
          📋 Scope: {scopeLabel}
        </div>
        <button onClick={generatePins} disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black disabled:opacity-50">
          {generating ? '⏳ Generating…' : '🔑 Generate PINs for this scope'}
        </button>
        {msg && (
          <div className={'text-sm font-semibold px-4 py-3 rounded-xl ' + (pins.length > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
            {msg}
          </div>
        )}
        {pins.length > 0 && (
          <div className="space-y-3">
            <button onClick={downloadCSV}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-black">
              ⬇️ Download PIN List (CSV)
            </button>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>{['Role','Name','Phone','Code','PIN'].map(function(h){return <th key={h} className="px-3 py-2 text-left font-black text-slate-600">{h}</th>;})}</tr>
                </thead>
                <tbody>
                  {pins.map(function(p, i) {
                    return (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2"><span className={'px-2 py-0.5 rounded-full text-[10px] font-black ' + (p.role==='OWNER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700')}>{p.role}</span></td>
                        <td className="px-3 py-2 font-medium text-slate-800">{p.name}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{p.phone}</td>
                        <td className="px-3 py-2 text-slate-500">{p.code}</td>
                        <td className="px-3 py-2 font-mono font-black text-indigo-700 tracking-widest">{p.pin}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400">⚠️ Save this file now — PINs cannot be retrieved after you leave this page.</p>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="font-black text-slate-800">Reset a User's PIN</h3>
          <p className="text-xs text-slate-500 mt-1">Enter phone number — no need to look up IDs. User will be forced to change PIN on next login.</p>
        </div>
        <div className="flex gap-2 flex-wrap items-end">
          <div>
            <label className="text-xs font-black text-slate-600 block mb-1">Phone Number</label>
            <input type="tel" placeholder="10-digit number" maxLength={10} value={resetPhone}
              onChange={function(e) { setResetPhone(e.target.value.replace(/\D/g,'').slice(0,10)); setResetResult(null); }}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-44 focus:outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-black text-slate-600 block mb-1">Role</label>
            <select value={resetRole} onChange={function(e) { setResetRole(e.target.value); setResetResult(null); }}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400">
              <option value="OWNER">Owner</option>
              <option value="DRIVER">Driver</option>
            </select>
          </div>
          <button onClick={doResetPin} disabled={resetting || resetPhone.length < 10}
            className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-black disabled:opacity-50">
            {resetting ? 'Resetting…' : '🔄 Reset PIN'}
          </button>
        </div>
        {resetResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm font-black text-emerald-700">✅ PIN reset for {resetResult.name} ({resetResult.phone})</p>
            <p className="text-sm mt-2">New PIN: <span className="font-mono font-black text-indigo-700 tracking-widest text-lg">{resetResult.pin}</span></p>
            <p className="text-[11px] text-slate-400 mt-2">Share this with the user — it won't be shown again.</p>
          </div>
        )}
      </div>
    </div>
  );
}



function AdminPanelInner() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!getToken());
  const [tab, setTab]               = useState('dashboard');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const { notifications, unread, markAllRead } = useAdminNotifications();

  if (!isLoggedIn) return <LoginPage onLogin={() => setIsLoggedIn(true)} />;

  const navItems = [
    { key: 'dashboard',    label: 'Dashboard',     icon: 'dashboard' },
    { key: 'companies',    label: 'Companies',      icon: 'companies' },
    { key: 'owners',       label: 'Owners',         icon: 'owners' },
    { key: 'drivers',      label: 'All Drivers',    icon: 'drivers' },
    { key: 'kyc',          label: 'KYC Review',     icon: 'kyc' },
    { key: 'docs',         label: 'Doc Approvals',  icon: 'docs' },
    { key: 'transactions', label: 'Transactions',   icon: 'transactions' },
    { key: 'chat',         label: 'Chat',           icon: 'chat' },
    { key: 'audit',        label: 'Audit Log',      icon: 'audit' },
    { key: 'pins',         label: 'PIN Management', icon: 'pins' },
    { key: 'leads',        label: 'Leads',          icon: 'leads' },
  ];

  const doLogout = () => { clearToken(); window.location.href = '/login'; };
  const logout = () => setShowLogoutConfirm(true);
  const tabLabel = navItems.find(n => n.key === tab)?.label || tab;

  return (
    <div style={{ display:'flex', height:'100vh', background:'#f4f6f9', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{
        width: 224, background: '#0d1117', display: 'flex', flexDirection: 'column',
        flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)'
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99,102,241,0.35)', flexShrink: 0
            }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>M</span>
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em', margin: 0 }}>MobilityGrid</p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 500, margin: 0, marginTop: 1 }}>Super Admin Console</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {navItems.map(item => {
            const active = tab === item.key;
            return (
              <button key={item.key} onClick={() => setTab(item.key)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                marginBottom: 2, textAlign: 'left', fontSize: 13, fontWeight: active ? 600 : 500,
                background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: active ? '#818cf8' : 'rgba(255,255,255,0.45)',
                borderLeft: active ? '2px solid #6366f1' : '2px solid transparent',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}}
              >
                <span style={{ opacity: active ? 1 : 0.6, flexShrink: 0 }}>
                  <NavIcon d={NAV_ICONS[item.icon]} size={15} />
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Bottom — logout */}
        <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={logout} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'rgba(255,255,255,0.3)', fontSize: 13,
            fontWeight: 500, textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#f87171'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <header style={{
          background: '#fff', borderBottom: '1px solid #e5e7eb',
          padding: '0 24px', height: 56, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10,
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#9ca3af', fontSize: 12, fontWeight: 500 }}>Admin</span>
            <span style={{ color: '#d1d5db', fontSize: 12 }}>›</span>
            <span style={{ color: '#111827', fontSize: 14, fontWeight: 600 }}>{tabLabel}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThemeToggle />

            {/* Bell */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => { setShowNotifs(v => !v); if (!showNotifs && unread > 0) markAllRead(); }}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb',
                  background: showNotifs ? '#f3f4f6' : '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#6b7280', position: 'relative', transition: 'all 0.15s'
                }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unread > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    minWidth: 16, height: 16, background: '#ef4444',
                    color: '#fff', fontSize: 9, fontWeight: 700,
                    borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px'
                  }}>
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div style={{
                  position: 'absolute', right: 0, top: 44, width: 320,
                  background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  border: '1px solid #e5e7eb', zIndex: 50, overflow: 'hidden'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Notifications</span>
                    <button onClick={markAllRead} style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>
                  </div>
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '24px 0' }}>No notifications</p>
                    ) : notifications.map(n => (
                      <div key={n.id} style={{
                        padding: '12px 16px', borderBottom: '1px solid #f9fafb',
                        background: !n.is_read ? '#fafaff' : '#fff'
                      }}>
                        {!n.is_read && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#6366f1', marginRight: 6, verticalAlign: 'middle' }} />}
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{n.title}</p>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{n.message}</p>
                        <p style={{ fontSize: 10, color: '#9ca3af', margin: '4px 0 0' }}>{new Date(n.created_at).toLocaleString('en-IN')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 12px 4px 4px', borderRadius: 20,
              border: '1px solid #e5e7eb', background: '#fff', cursor: 'default'
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>SA</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Super Admin</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div style={{ padding: 24, flex: 1 }}>
          {tab === 'dashboard'    && <Dashboard />}
          {tab === 'companies'    && <Companies />}
          {tab === 'owners'       && <AllOwners />}
          {tab === 'drivers'      && <AllDrivers />}
          {tab === 'kyc'          && <KycReview />}
          {tab === 'docs'         && <DocApprovals />}
          {tab === 'transactions' && <Transactions />}
          {tab === 'chat'         && <ChatViewer />}
          {tab === 'audit'        && <AuditLog />}
          {tab === 'pins'         && <PinManagementSection />}
          {tab === 'leads'        && <LeadsSection />}
        </div>
      </main>

      {showLogoutConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 320, padding: 24, textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Sign out?</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>You'll need to sign in again to access the console.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowLogoutConfirm(false)} style={{
                flex: 1, padding: '10px', background: '#f3f4f6', borderRadius: 10,
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151'
              }}>Cancel</button>
              <button onClick={doLogout} style={{
                flex: 1, padding: '10px', background: '#ef4444', borderRadius: 10,
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#fff'
              }}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
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
