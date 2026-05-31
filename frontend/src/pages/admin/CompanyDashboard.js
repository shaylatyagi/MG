// frontend/src/pages/admin/CompanyDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight, ChevronLeft, Building2, Users, Truck, Wallet,
  TrendingUp, Upload, X, Search, ArrowUpRight,
  CheckCircle, Shield, Activity, RefreshCw
} from 'lucide-react';

const API = 'https://mg-qw5s.onrender.com';

export default function CompanyDashboard() {
  const [activePanel, setActivePanel] = useState('overview');
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);

  const [platformStats, setPlatformStats] = useState({});
  const [companies, setCompanies] = useState([]);
  const [owners, setOwners] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [driverDetail, setDriverDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [timeHorizon, setTimeHorizon] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDocModal, setShowDocModal] = useState(false);
  const [docTarget, setDocTarget] = useState(null);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', cin: '', city: '' });
  const [auditLogs, setAuditLogs] = useState([
    `[${new Date().toISOString()}] Admin session started`,
  ]);

  const addLog = (text) => setAuditLogs(p => [`[${new Date().toISOString()}] ${text}`, ...p]);
  const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;

  // ── Fetch platform stats ─────────────────────────────────────────────────
  const fetchPlatformStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/platform-stats`);
      const data = await res.json();
      setPlatformStats(data);
    } catch { console.error('Platform stats fetch failed'); }
  }, []);

  // ── Fetch companies ──────────────────────────────────────────────────────
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/companies`);
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : []);
    } catch { setCompanies([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlatformStats();
    fetchCompanies();
  }, [fetchPlatformStats, fetchCompanies]);

  // ── Drill to company → fetch owners ─────────────────────────────────────
  const drillToCompany = async (company) => {
    setSelectedCompany(company);
    setSelectedOwner(null);
    setSelectedDriver(null);
    setBreadcrumb([{ label: company.name, level: 'company', data: company }]);
    setActivePanel('owners');
    setSearchQuery('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/companies/${company.id}/owners`);
      const data = await res.json();
      setOwners(Array.isArray(data) ? data : []);
    } catch { setOwners([]); }
    setLoading(false);
    addLog(`Viewed company: ${company.name}`);
  };

  // ── Drill to owner → fetch drivers ──────────────────────────────────────
  const drillToOwner = async (owner) => {
    setSelectedOwner(owner);
    setSelectedDriver(null);
    setBreadcrumb(prev => [
      ...prev.filter(b => b.level === 'company'),
      { label: owner.full_name, level: 'owner', data: owner }
    ]);
    setActivePanel('drivers');
    setSearchQuery('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/owners/${owner.id}/drivers`);
      const data = await res.json();
      setDrivers(Array.isArray(data) ? data : []);
    } catch { setDrivers([]); }
    setLoading(false);
    addLog(`Viewed owner: ${owner.full_name}`);
  };

  // ── Drill to driver → fetch full detail ─────────────────────────────────
  const drillToDriver = async (driver) => {
    setSelectedDriver(driver);
    setBreadcrumb(prev => [
      ...prev.filter(b => b.level !== 'driver'),
      { label: driver.full_name, level: 'driver', data: driver }
    ]);
    setActivePanel('driver-detail');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/drivers/${driver.id}`);
      const data = await res.json();
      setDriverDetail(data);
    } catch { setDriverDetail(null); }
    setLoading(false);
    addLog(`Viewed driver: ${driver.full_name}`);
  };

  const goBack = () => {
    if (activePanel === 'driver-detail') { setActivePanel('drivers'); setSelectedDriver(null); setBreadcrumb(p => p.filter(b => b.level !== 'driver')); }
    else if (activePanel === 'drivers') { setActivePanel('owners'); setSelectedOwner(null); setBreadcrumb(p => p.filter(b => b.level !== 'owner')); }
    else if (activePanel === 'owners') { setActivePanel('overview'); setSelectedCompany(null); setBreadcrumb([]); }
  };

  const refresh = async () => {
    setRefreshing(true);
    await fetchPlatformStats();
    await fetchCompanies();
    setRefreshing(false);
  };

  const filtered = (arr) => arr.filter(item => {
    const q = searchQuery.toLowerCase();
    return !q || Object.values(item).some(v => String(v || '').toLowerCase().includes(q));
  });

  // ── Stat card ────────────────────────────────────────────────────────────
  const Stat = ({ label, value, sub, icon: Icon, blue }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        {Icon && <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${blue ? 'bg-blue-50' : 'bg-slate-100'}`}>
          <Icon size={13} className={blue ? 'text-blue-600' : 'text-slate-500'}/>
        </div>}
      </div>
      <p className="text-xl font-black text-slate-800">{value}</p>
      {sub && <p className="text-[9px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );

  // ── Doc upload modal ─────────────────────────────────────────────────────
  const DocModal = () => {
    const [file, setFile] = useState(null);
    const [docType, setDocType] = useState('');
    const [uploading, setUploading] = useState(false);
    const types = {
      company: ['GST_CERTIFICATE','PAN_CARD','INCORPORATION_CERT','BANK_STATEMENT','AGREEMENT'],
      owner:   ['AADHAAR','PAN_CARD','BANK_CHEQUE','BUSINESS_REG','GST'],
      driver:  ['AADHAAR','PAN_CARD','DRIVING_LICENSE','BANK_CHEQUE','PROFILE_PHOTO'],
    }[docTarget?.level] || [];

    const upload = async () => {
      if (!file || !docType) return alert('Select type and file');
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('doc_type', docType);
      formData.append('user_type', docTarget.level.toUpperCase());
      formData.append('user_id', String(docTarget.id));
      try {
        const res = await fetch(`${API}/api/uploads/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) { addLog(`Doc uploaded: ${docType} for ${docTarget.full_name || docTarget.name}`); alert('✅ Uploaded!'); setShowDocModal(false); }
        else alert('Upload failed: ' + data.message);
      } catch { alert('Network error'); }
      setUploading(false);
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
          <div className="px-5 py-4 border-b flex justify-between items-center">
            <div>
              <p className="font-black text-slate-800">Upload Document</p>
              <p className="text-xs text-slate-400 mt-0.5 capitalize">{docTarget?.level}: {docTarget?.full_name || docTarget?.name}</p>
            </div>
            <button onClick={() => setShowDocModal(false)}><X size={18} className="text-slate-400"/></button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs font-black text-slate-500 mb-1.5">Document Type</p>
              <select value={docType} onChange={e => setDocType(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 focus:outline-none focus:border-blue-500">
                <option value="">— Select —</option>
                {types.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition ${file ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
              {file
                ? <div className="text-center"><CheckCircle size={20} className="text-blue-600 mx-auto mb-1"/><p className="text-xs font-black text-blue-700">{file.name}</p></div>
                : <div className="text-center"><Upload size={18} className="text-slate-400 mx-auto mb-1"/><p className="text-xs text-slate-400">Click to upload</p></div>}
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0])}/>
            </label>
            <div className="flex gap-3">
              <button onClick={() => setShowDocModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-black text-slate-600">Cancel</button>
              <button onClick={upload} disabled={uploading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black disabled:opacity-60 hover:bg-blue-700 transition">
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Sidebar items ────────────────────────────────────────────────────────
  const sideItems = [
    { id: 'overview',  icon: '▦', label: 'Overview' },
    { id: 'hierarchy', icon: '◈', label: 'Fleet Hierarchy' },
    { id: 'finance',   icon: '◎', label: 'Financials' },
    { id: 'kyc',       icon: '◷', label: 'KYC Desk' },
    { id: 'audit',     icon: '◑', label: 'Audit Logs' },
  ];
  const hierarchyPanels = ['overview','owners','drivers','driver-detail'];
  const isHierarchy = (id) => id === 'hierarchy' || hierarchyPanels.includes(activePanel);

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-white font-sans">

      {/* Sidebar */}
      <aside className="w-52 bg-slate-950 flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">MG</div>
          <div><p className="text-white font-black text-sm">MobilityGrid</p><p className="text-[9px] text-slate-500 uppercase tracking-widest">Admin Panel</p></div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {sideItems.map(item => {
            const active = item.id === 'hierarchy' ? hierarchyPanels.includes(activePanel) : activePanel === item.id;
            return (
              <button key={item.id}
                onClick={() => {
                  if (item.id === 'hierarchy') { setActivePanel('overview'); setBreadcrumb([]); setSelectedCompany(null); setSelectedOwner(null); setSelectedDriver(null); }
                  else setActivePanel(item.id);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                <span>{item.icon}</span>{item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"/>
          <span className="text-[9px] text-slate-500">Live</span>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs">
            <button onClick={() => { setActivePanel('overview'); setBreadcrumb([]); setSelectedCompany(null); setSelectedOwner(null); setSelectedDriver(null); }}
              className="font-black text-slate-400 hover:text-blue-600 transition">Platform</button>
            {breadcrumb.map((b, i) => (
              <React.Fragment key={i}>
                <ChevronRight size={11} className="text-slate-300"/>
                <button
                  onClick={() => {
                    if (b.level === 'company') { setActivePanel('owners'); setSelectedOwner(null); setSelectedDriver(null); setBreadcrumb([b]); }
                    else if (b.level === 'owner') { setActivePanel('drivers'); setSelectedDriver(null); setBreadcrumb(prev => prev.filter(x => x.level !== 'driver')); }
                  }}
                  className={`font-black transition ${i === breadcrumb.length-1 ? 'text-slate-800' : 'text-slate-400 hover:text-blue-600'}`}>
                  {(b.label || '').length > 24 ? b.label.slice(0,24)+'...' : b.label}
                </button>
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className={`p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition ${refreshing ? 'animate-spin' : ''}`}>
              <RefreshCw size={13}/>
            </button>
            <select value={timeHorizon} onChange={e => setTimeHorizon(e.target.value)}
              className="border border-slate-200 text-xs font-black text-slate-600 px-3 py-1.5 rounded-lg bg-white focus:outline-none">
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
            </select>
            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600">SA</div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
          {activePanel === 'overview' && (
            <div className="space-y-6 max-w-5xl">
              <div className="flex items-center justify-between">
                <div><h2 className="text-base font-black text-slate-800">Platform Overview</h2><p className="text-xs text-slate-400">All fleet companies</p></div>
                <button onClick={() => setShowAddCompany(true)} className="flex items-center gap-1.5 text-xs font-black text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">
                  + Add Company
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Stat label="Collection Today" value={fmt(platformStats.collection_today)} sub={fmt(platformStats.collection_month) + ' this month'} icon={Wallet} blue/>
                <Stat label="Active Drivers" value={(platformStats.total_drivers || 0).toLocaleString()} sub={`${platformStats.total_owners || 0} owners`} icon={Users}/>
                <Stat label="Vehicles" value={(platformStats.total_vehicles || 0).toLocaleString()} sub={`${platformStats.total_companies || 0} companies`} icon={Truck}/>
              </div>

              {loading ? <div className="py-12 text-center text-sm text-slate-400 animate-pulse">Loading...</div> : (
                <div className="space-y-2">
                  {companies.map((c, i) => (
                    <div key={i} onClick={() => drillToCompany(c)}
                      className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition cursor-pointer group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                            <Building2 size={14} className="text-blue-600"/>
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-sm">{c.name}</p>
                            <p className="text-[10px] text-slate-400">{c.cin || 'No CIN'} · {c.city || '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-5">
                          {[['Owners', c.owners||0], ['Drivers', c.drivers||0], ['Vehicles', c.vehicles||0]].map(([k,v]) => (
                            <div key={k} className="text-center">
                              <p className="text-[9px] text-slate-400 uppercase tracking-wider">{k}</p>
                              <p className="text-sm font-black text-slate-700">{parseInt(v||0).toLocaleString()}</p>
                            </div>
                          ))}
                          <div className="text-center">
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider">Today</p>
                            <p className="text-sm font-black text-blue-600">{fmt(c.collection_today)}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={e => { e.stopPropagation(); setDocTarget({...c, level:'company'}); setShowDocModal(true); }}
                              className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition">
                              <Upload size={11}/>
                            </button>
                            <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition"/>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {companies.length === 0 && !loading && (
                    <div className="py-12 text-center text-sm text-slate-400">No companies yet — add one above</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── OWNERS ───────────────────────────────────────────────────── */}
          {activePanel === 'owners' && selectedCompany && (
            <div className="space-y-5 max-w-5xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={goBack} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 transition"><ChevronLeft size={15}/></button>
                  <div>
                    <h2 className="text-base font-black text-slate-800">{selectedCompany.name}</h2>
                    <p className="text-[10px] text-slate-400">{owners.length} owners</p>
                  </div>
                </div>
                <button onClick={() => { setDocTarget({...selectedCompany, level:'company'}); setShowDocModal(true); }}
                  className="flex items-center gap-1.5 text-xs font-black text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:border-blue-200 transition">
                  <Upload size={12}/> Company Docs
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <Stat label="Today" value={fmt(selectedCompany.collection_today)} icon={Wallet} blue/>
                <Stat label="This Month" value={fmt(selectedCompany.collection_month)} icon={TrendingUp}/>
                <Stat label="Drivers" value={parseInt(selectedCompany.drivers||0).toLocaleString()} icon={Users}/>
                <Stat label="Vehicles" value={parseInt(selectedCompany.vehicles||0).toLocaleString()} icon={Truck}/>
              </div>

              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search owner..."
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white"/>
              </div>

              {loading ? <div className="py-10 text-center text-sm text-slate-400 animate-pulse">Loading owners...</div> : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-slate-100 bg-slate-50">
                      {['Owner','Code','Drivers','Vehicles','Today',''].map(h => <th key={h} className="text-left px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtered(owners).map((o, i) => (
                        <tr key={i} onClick={() => drillToOwner(o)} className="hover:bg-slate-50/50 cursor-pointer transition group">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-sm">{o.full_name?.charAt(0)}</div>
                              <div>
                                <p className="font-black text-slate-800">{o.full_name}</p>
                                <p className="text-[9px] text-slate-400 font-mono">{o.mobile_number}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[10px] font-mono text-slate-500">{o.owner_code}</td>
                          <td className="px-4 py-3 font-black text-slate-700 text-center">{parseInt(o.total_drivers||0)}</td>
                          <td className="px-4 py-3 font-black text-slate-700 text-center">{parseInt(o.total_vehicles||0)}</td>
                          <td className="px-4 py-3 font-black text-blue-600 text-right">{fmt(o.collection_today)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition">
                              <button onClick={e=>{e.stopPropagation();setDocTarget({...o,level:'owner'});setShowDocModal(true);}} className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition"><Upload size={11}/></button>
                              <ChevronRight size={13} className="text-slate-300 group-hover:text-blue-500"/>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered(owners).length === 0 && <div className="py-10 text-center text-sm text-slate-400">No owners found</div>}
                </div>
              )}
            </div>
          )}

          {/* ── DRIVERS ──────────────────────────────────────────────────── */}
          {activePanel === 'drivers' && selectedOwner && (
            <div className="space-y-5 max-w-5xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={goBack} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 transition"><ChevronLeft size={15}/></button>
                  <div>
                    <h2 className="text-base font-black text-slate-800">{selectedOwner.full_name}</h2>
                    <p className="text-[10px] text-slate-400">{selectedOwner.business_name || selectedOwner.owner_code} · {drivers.length} drivers</p>
                  </div>
                </div>
                <button onClick={() => {setDocTarget({...selectedOwner,level:'owner'});setShowDocModal(true);}}
                  className="flex items-center gap-1.5 text-xs font-black text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:border-blue-200 transition">
                  <Upload size={12}/> Owner Docs
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <Stat label="Owner Code" value={selectedOwner.owner_code} icon={Shield}/>
                <Stat label="Phone" value={selectedOwner.mobile_number} icon={Activity}/>
                <Stat label="Drivers" value={parseInt(selectedOwner.total_drivers||drivers.length)} icon={Users} blue/>
                <Stat label="Collection" value={fmt(selectedOwner.collection_total)} icon={Wallet} blue/>
              </div>

              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search driver, vehicle..."
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white"/>
              </div>

              {loading ? <div className="py-10 text-center text-sm text-slate-400 animate-pulse">Loading drivers...</div> : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-slate-100 bg-slate-50">
                      {['Driver','Vehicle','Daily Rent','Total Paid','Today','Wallet',''].map(h => <th key={h} className="text-left px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtered(drivers).map((d, i) => (
                        <tr key={i} onClick={() => drillToDriver(d)} className="hover:bg-slate-50/50 cursor-pointer transition group">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-black text-sm">{d.full_name?.charAt(0)}</div>
                              <div>
                                <p className="font-black text-slate-800">{d.full_name}</p>
                                <p className="text-[9px] text-slate-400 font-mono">{d.driver_code} · {d.mobile_number}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {d.vehicle_number
                              ? <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">{d.vehicle_number}</span>
                              : <span className="text-xs text-slate-400">—</span>}
                          </td>
                          <td className="px-4 py-3 font-black text-slate-700">{d.daily_rent ? `₹${d.daily_rent}` : '—'}</td>
                          <td className="px-4 py-3 font-black text-slate-700">{fmt(d.total_paid)}</td>
                          <td className="px-4 py-3 font-black text-blue-600">{fmt(d.paid_today)}</td>
                          <td className="px-4 py-3 font-black text-slate-600">{fmt(d.wallet_balance)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition">
                              <button onClick={e=>{e.stopPropagation();setDocTarget({...d,level:'driver'});setShowDocModal(true);}} className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition"><Upload size={11}/></button>
                              <ChevronRight size={13} className="text-slate-300 group-hover:text-blue-500"/>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered(drivers).length === 0 && <div className="py-10 text-center text-sm text-slate-400">No drivers</div>}
                </div>
              )}
            </div>
          )}

          {/* ── DRIVER DETAIL ─────────────────────────────────────────────── */}
          {activePanel === 'driver-detail' && selectedDriver && (
            <div className="space-y-5 max-w-4xl">
              <div className="flex items-center gap-3">
                <button onClick={goBack} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 transition"><ChevronLeft size={15}/></button>
                <div className="flex-1">
                  <h2 className="text-base font-black text-slate-800">{selectedDriver.full_name}</h2>
                  <p className="text-[10px] text-slate-400">{selectedDriver.driver_code} · {selectedDriver.mobile_number}</p>
                </div>
                <button onClick={() => {setDocTarget({...selectedDriver,level:'driver'});setShowDocModal(true);}}
                  className="flex items-center gap-1.5 text-xs font-black text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:border-blue-200 transition">
                  <Upload size={12}/> Upload Driver Docs
                </button>
              </div>

              {loading ? <div className="py-10 text-center text-sm text-slate-400 animate-pulse">Loading...</div> : driverDetail && (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    <Stat label="Vehicle" value={driverDetail.driver?.vehicle_number || 'Unassigned'} icon={Truck} blue={!!driverDetail.driver?.vehicle_number}/>
                    <Stat label="Daily Rent" value={driverDetail.driver?.daily_rent ? `₹${driverDetail.driver.daily_rent}` : '—'} icon={Wallet}/>
                    <Stat label="Total Paid" value={fmt(driverDetail.driver?.total_paid)} icon={TrendingUp} blue/>
                    <Stat label="Wallet" value={fmt(driverDetail.driver?.wallet_balance)} icon={Activity}/>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Profile */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Profile</p>
                      {[
                        ['Name', driverDetail.driver?.full_name],
                        ['Mobile', driverDetail.driver?.mobile_number],
                        ['Driver Code', driverDetail.driver?.driver_code],
                        ['License No.', driverDetail.driver?.driving_license_number || '—'],
                        ['License Expiry', driverDetail.driver?.driving_license_expiry ? new Date(driverDetail.driver.driving_license_expiry).toLocaleDateString('en-IN') : '—'],
                        ['Security Deposit', fmt(driverDetail.driver?.security_deposit)],
                        ['Status', driverDetail.driver?.status],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between py-1.5 border-b border-slate-50">
                          <span className="text-xs text-slate-400">{k}</span>
                          <span className="text-xs font-black text-slate-700">{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Documents */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Documents</p>
                        <button onClick={() => {setDocTarget({...selectedDriver,level:'driver'});setShowDocModal(true);}}
                          className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:text-blue-700">
                          <Upload size={10}/> Add
                        </button>
                      </div>
                      {['PROFILE','AADHAAR','PAN_CARD','DRIVING_LICENSE','BANK_CHEQUE'].map(docType => {
                        const doc = driverDetail.documents?.find(d => d.doc_type === docType);
                        return (
                          <div key={docType} className="flex items-center justify-between py-1.5 border-b border-slate-50">
                            <span className="text-xs text-slate-600">{docType.replace(/_/g,' ')}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                              doc?.status === 'VERIFIED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              doc ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-slate-50 text-slate-400 border-slate-200'
                            }`}>
                              {doc?.status === 'VERIFIED' ? '✓ Verified' : doc ? '⏳ Pending' : 'Missing'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vehicle History */}
                  {driverDetail.vehicle_history?.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vehicle History</p>
                      </div>
                      <table className="w-full text-xs">
                        <thead><tr className="border-b border-slate-100">
                          {['Vehicle','From','To','Days','Rent/day'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase">{h}</th>)}
                        </tr></thead>
                        <tbody className="divide-y divide-slate-50">
                          {driverDetail.vehicle_history.map((h, i) => (
                            <tr key={i}>
                              <td className="px-4 py-2.5 font-black text-blue-600">{h.vehicle_number}</td>
                              <td className="px-4 py-2.5 text-slate-500">{new Date(h.assigned_at).toLocaleDateString('en-IN')}</td>
                              <td className="px-4 py-2.5 text-slate-500">{h.unassigned_at ? new Date(h.unassigned_at).toLocaleDateString('en-IN') : <span className="text-blue-600 font-black">Current</span>}</td>
                              <td className="px-4 py-2.5 font-black text-slate-700">{h.total_days}</td>
                              <td className="px-4 py-2.5 font-black text-slate-700">₹{h.daily_rent}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Daily Logs */}
                  {driverDetail.daily_logs?.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Activity Log (Last 30 Days)</p>
                      </div>
                      <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                        {driverDetail.daily_logs.map((log, i) => {
                          const hrs = Math.floor((log.active_minutes||0)/60);
                          const mins = (log.active_minutes||0)%60;
                          return (
                            <div key={i} className="px-4 py-2.5 flex justify-between items-center">
                              <span className="text-xs text-slate-600">{new Date(log.log_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',weekday:'short'})}</span>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="font-black text-slate-700">{hrs}h {mins}m</span>
                                {log.login_time && <span className="text-slate-400">{new Date(log.login_time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})}</span>}
                                {log.incentive_applied && <span className="font-black text-blue-600">+₹{parseFloat(log.incentive_amount||0).toFixed(0)}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── FINANCE ──────────────────────────────────────────────────── */}
          {activePanel === 'finance' && (
            <div className="space-y-5 max-w-5xl">
              <h2 className="text-base font-black text-slate-800">Financial Monitor</h2>
              <div className="grid grid-cols-3 gap-4">
                <Stat label="Today" value={fmt(platformStats.collection_today)} icon={Wallet} blue/>
                <Stat label="This Month" value={fmt(platformStats.collection_month)} icon={TrendingUp}/>
                <Stat label="Companies" value={platformStats.total_companies||0} icon={Building2}/>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Company-wise</p>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100">
                    {['Company','Today','This Month','Owners','Drivers'].map(h => <th key={h} className="text-left px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {companies.map((c, i) => (
                      <tr key={i} onClick={() => drillToCompany(c)} className="hover:bg-slate-50/50 cursor-pointer">
                        <td className="px-4 py-3 font-black text-slate-800">{c.name}</td>
                        <td className="px-4 py-3 font-black text-blue-600">{fmt(c.collection_today)}</td>
                        <td className="px-4 py-3 font-black text-slate-700">{fmt(c.collection_month)}</td>
                        <td className="px-4 py-3 text-slate-600">{parseInt(c.owners||0)}</td>
                        <td className="px-4 py-3 text-slate-600">{parseInt(c.drivers||0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── KYC ──────────────────────────────────────────────────────── */}
          {activePanel === 'kyc' && (
            <div className="space-y-5 max-w-4xl">
              <h2 className="text-base font-black text-slate-800">KYC Desk</h2>
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">
                ✅ No pending KYC cases
              </div>
            </div>
          )}

          {/* ── AUDIT ────────────────────────────────────────────────────── */}
          {activePanel === 'audit' && (
            <div className="space-y-5 max-w-4xl">
              <h2 className="text-base font-black text-slate-800">Audit Logs</h2>
              <div className="bg-slate-950 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"/>
                  <span className="text-xs font-black text-slate-400">Live Stream</span>
                </div>
                <div className="p-4 space-y-1.5 max-h-96 overflow-y-auto">
                  {auditLogs.map((log, i) => <p key={i} className="text-xs text-emerald-400 font-mono">{log}</p>)}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Add Company Modal */}
      {showAddCompany && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-5 py-4 border-b flex justify-between items-center">
              <p className="font-black text-slate-800">Register Company</p>
              <button onClick={() => setShowAddCompany(false)}><X size={18} className="text-slate-400"/></button>
            </div>
            <div className="p-5 space-y-3">
              <input placeholder="Company Name *" value={newCompany.name} onChange={e => setNewCompany(p=>({...p,name:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-blue-500"/>
              <input placeholder="CIN Number" value={newCompany.cin} onChange={e => setNewCompany(p=>({...p,cin:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-mono focus:outline-none focus:border-blue-500"/>
              <input placeholder="City" value={newCompany.city} onChange={e => setNewCompany(p=>({...p,city:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-blue-500"/>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowAddCompany(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-black text-slate-600">Cancel</button>
                <button onClick={async () => {
                  if (!newCompany.name) return alert('Name required');
                  const res = await fetch(`${API}/api/admin/companies`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(newCompany) });
                  const data = await res.json();
                  if (data.success) { await fetchCompanies(); addLog(`Company created: ${newCompany.name}`); setShowAddCompany(false); setNewCompany({name:'',cin:'',city:''}); }
                  else alert(data.error || 'Failed');
                }} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDocModal && <DocModal/>}
    </div>
  );
}