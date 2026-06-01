// frontend/src/pages/admin/CompanyDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Building2, Users, Truck, Wallet, TrendingUp, Upload, X, Search, CheckCircle, Shield, Activity, RefreshCw, Clock, CreditCard, Bell, LogOut } from 'lucide-react';

const API = 'https://mg-qw5s.onrender.com';
const fmt  = (n) => `₹${parseFloat(n||0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}) : '—';
const timeSince = (d) => {
  if (!d) return '—';
  const hrs = Math.floor((Date.now()-new Date(d))/3600000);
  if (hrs<24) return `${hrs}h ago`;
  const days = Math.floor(hrs/24);
  if (days<30) return `${days}d ago`;
  return fmtDate(d);
};

export default function CompanyDashboard() {
  const [panel, setPanel]           = useState('overview');
  const [crumbs, setCrumbs]         = useState([]);
  const [selCompany, setSelCompany] = useState(null);
  const [selOwner, setSelOwner]     = useState(null);
  const [selDriver, setSelDriver]   = useState(null);

  const [pStats, setPStats]         = useState({});
  const [companies, setCompanies]   = useState([]);
  const [owners, setOwners]         = useState([]);
  const [ownerDetail, setOwnerDetail] = useState(null);
  const [drivers, setDrivers]       = useState([]);
  const [driverDetail, setDriverDetail] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [q, setQ]                   = useState('');

  const [showDoc, setShowDoc]       = useState(false);
  const [docTarget, setDocTarget]   = useState(null);
  const [showAddCo, setShowAddCo]   = useState(false);
  const [newCo, setNewCo]           = useState({name:'',cin:'',city:''});
  const [logs, setLogs]             = useState([`[${new Date().toISOString()}] Session started`]);
  const addLog = t => setLogs(p=>[`[${new Date().toISOString()}] ${t}`,...p]);

  const ADMIN_KEY = 'mg_admin_2026_secret';  // Render env se match karna chahiye

  const get = async (url) => {
    const r = await fetch(`${API}${url}`, {
      headers: { 'x-admin-key': ADMIN_KEY }
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${r.status}`);
    }
    return r.json();
  };

  const loadPStats   = useCallback(async () => { try { setPStats(await get('/api/admin/platform-stats')); } catch {} }, []);
  const loadCompanies= useCallback(async () => { setLoading(true); try { const d=await get('/api/admin/companies'); setCompanies(Array.isArray(d)?d:[]); } catch { setCompanies([]); } setLoading(false); }, []);

  useEffect(()=>{ loadPStats(); loadCompanies(); },[]);

  const drillCompany = async (co) => {
    setSelCompany(co); setSelOwner(null); setSelDriver(null); setOwnerDetail(null); setDriverDetail(null);
    setCrumbs([{label:co.name,level:'company'}]); setPanel('owners'); setQ(''); setError(null);
    setLoading(true);
    try {
      const data = await get(`/api/admin/companies/${co.id}/owners`);
      if (Array.isArray(data)) { setOwners(data); }
      else { setOwners([]); setError(`Server: ${JSON.stringify(data)}`); }
    } catch(e) {
      setOwners([]);
      setError(`API Error: ${e.message} — Make sure new admin.js is deployed on Render and app.use('/api/admin', ...) is in index.js`);
    }
    setLoading(false); addLog(`Company: ${co.name}`);
  };

  const drillOwner = async (o) => {
    setSelOwner(o); setSelDriver(null); setDriverDetail(null);
    setCrumbs(p=>[...p.filter(x=>x.level==='company'),{label:o.full_name,level:'owner'}]);
    setPanel('drivers'); setQ(''); setError(null);
    setLoading(true);
    try {
      const [drv, det] = await Promise.all([
        get(`/api/admin/owners/${o.id}/drivers`),
        get(`/api/admin/owners/${o.id}`),
      ]);
      setDrivers(Array.isArray(drv)?drv:[]);
      setOwnerDetail(det);
    } catch(e) { setDrivers([]); setError(`Owner drill error: ${e.message}`); }
    setLoading(false); addLog(`Owner: ${o.full_name}`);
  };

  const drillDriver = async (d) => {
    setSelDriver(d);
    setCrumbs(p=>[...p.filter(x=>x.level!=='driver'),{label:d.full_name,level:'driver'}]);
    setPanel('driver-detail'); setLoading(true); setError(null);
    try { setDriverDetail(await get(`/api/admin/drivers/${d.id}`)); } catch(e) { setDriverDetail(null); setError(`Driver detail error: ${e.message}`); }
    setLoading(false); addLog(`Driver: ${d.full_name}`);
  };

  const goBack = () => {
    if (panel==='driver-detail') { setPanel('drivers'); setSelDriver(null); setCrumbs(p=>p.filter(x=>x.level!=='driver')); }
    else if (panel==='drivers')  { setPanel('owners');  setSelOwner(null);  setCrumbs(p=>p.filter(x=>x.level!=='owner')); }
    else if (panel==='owners')   { setPanel('overview'); setSelCompany(null); setCrumbs([]); }
  };

  const filt = arr => arr.filter(x => !q || Object.values(x).some(v=>String(v||'').toLowerCase().includes(q.toLowerCase())));

  // ── UI Primitives ────────────────────────────────────────────────────────
  const Stat = ({label,value,sub,icon:I,blue,tiny}) => (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex justify-between items-start mb-2">
        <p className={`font-black text-slate-400 uppercase tracking-widest ${tiny?'text-[8px]':'text-[9px]'}`}>{label}</p>
        {I && <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${blue?'bg-blue-50':'bg-slate-100'}`}><I size={12} className={blue?'text-blue-600':'text-slate-500'}/></div>}
      </div>
      <p className="text-xl font-black text-slate-800 leading-none">{value}</p>
      {sub && <p className="text-[9px] text-slate-400 mt-1.5">{sub}</p>}
    </div>
  );

  const Badge = ({v,green,blue,red,amber}) => {
    const cls = green?'bg-emerald-50 text-emerald-700 border-emerald-200':blue?'bg-blue-50 text-blue-700 border-blue-200':red?'bg-red-50 text-red-700 border-red-200':amber?'bg-amber-50 text-amber-700 border-amber-200':'bg-slate-50 text-slate-500 border-slate-200';
    return <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${cls}`}>{v}</span>;
  };

  const Row = ({label,value,mono}) => (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-xs font-black text-slate-700 ${mono?'font-mono':''}`}>{value||'—'}</span>
    </div>
  );

  const UpBtn = (target) => (
    <button onClick={e=>{e.stopPropagation();setDocTarget(target);setShowDoc(true);}}
      className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition" title="Upload docs">
      <Upload size={11}/>
    </button>
  );

  const SideItems = [
    {id:'overview',icon:'▦',label:'Overview'},
    {id:'hierarchy',icon:'◈',label:'Fleet Hierarchy'},
    {id:'finance',icon:'◎',label:'Financials'},
    {id:'kyc',icon:'◷',label:'KYC Desk'},
    {id:'audit',icon:'◑',label:'Audit Logs'},
  ];
  const hierarchyPanels = ['overview','owners','drivers','driver-detail'];

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-50 font-sans">

      {/* Sidebar */}
      <aside className="w-52 bg-slate-950 flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">MG</div>
          <div><p className="text-white font-black text-sm">MobilityGrid</p><p className="text-[9px] text-slate-500 uppercase tracking-widest">Admin</p></div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {SideItems.map(item=>{
            const active = item.id==='hierarchy' ? hierarchyPanels.includes(panel) : panel===item.id;
            return <button key={item.id}
              onClick={()=>{ if(item.id==='hierarchy'){setPanel('overview');setCrumbs([]);setSelCompany(null);setSelOwner(null);setSelDriver(null);}else setPanel(item.id); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${active?'bg-blue-600 text-white':'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <span>{item.icon}</span>{item.label}
            </button>;
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"/><span className="text-[9px] text-slate-500">Live</span>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <button onClick={()=>{setPanel('overview');setCrumbs([]);setSelCompany(null);setSelOwner(null);setSelDriver(null);}} className="font-black text-slate-400 hover:text-blue-600 transition">Platform</button>
            {crumbs.map((b,i)=>(
              <React.Fragment key={i}>
                <ChevronRight size={11} className="text-slate-300"/>
                <button onClick={()=>{
                  if(b.level==='company'){setPanel('owners');setSelOwner(null);setSelDriver(null);setCrumbs([b]);}
                  else if(b.level==='owner'){setPanel('drivers');setSelDriver(null);setCrumbs(p=>p.filter(x=>x.level!=='driver'));}
                }} className={`font-black transition max-w-[180px] truncate ${i===crumbs.length-1?'text-slate-800':'text-slate-400 hover:text-blue-600'}`}>{b.label}</button>
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>{loadPStats();loadCompanies();}} className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 transition"><RefreshCw size={12}/></button>
            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600">SA</div>
            <button onClick={()=>{ localStorage.removeItem('admin_token'); window.location.href='/login'; }}
              className="p-2 rounded-lg bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 transition" title="Logout">
              <LogOut size={13}/>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">

          {/* ── OVERVIEW ─────────────────────────────────────────── */}
          {panel==='overview' && (
            <div className="space-y-5 max-w-5xl">
              <div className="flex items-center justify-between">
                <div><h2 className="text-base font-black text-slate-800">Platform Overview</h2><p className="text-xs text-slate-400">All data live from DB</p></div>
                <button onClick={()=>setShowAddCo(true)} className="flex items-center gap-1.5 text-xs font-black text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">+ Add Company</button>
              </div>
              <div className="grid grid-cols-5 gap-3">
                <Stat label="Companies"   value={pStats.total_companies||0} icon={Building2}/>
                <Stat label="Owners"      value={pStats.total_owners||0}    icon={Shield}/>
                <Stat label="Drivers"     value={(pStats.total_drivers||0).toLocaleString()}   icon={Users} blue/>
                <Stat label="Vehicles"    value={(pStats.total_vehicles||0).toLocaleString()}  icon={Truck}/>
                <Stat label="Today"       value={fmt(pStats.collection_today)} icon={Wallet} blue sub={fmt(pStats.collection_month)+' this month'}/>
              </div>
              {loading?<div className="py-10 text-center text-sm text-slate-400 animate-pulse">Loading...</div>:(
                <div className="space-y-2">
                  {companies.map((c,i)=>(
                    <div key={i} onClick={()=>drillCompany(c)} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition cursor-pointer group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center"><Building2 size={14} className="text-blue-600"/></div>
                          <div>
                            <p className="font-black text-slate-800">{c.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] text-slate-400 font-mono">ID #{c.id}</span>
                              <span className="text-slate-200">·</span>
                              <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{c.company_code || '—'}</span>
                              <span className="text-slate-200">·</span>
                              <span className="text-[9px] text-slate-400">{c.cin || 'No CIN'}</span>
                              <span className="text-slate-200">·</span>
                              <span className="text-[9px] text-slate-400">{c.city || '—'}</span>
                            </div>
                            <p className="text-[9px] text-slate-400 mt-0.5">Joined: {fmtDate(c.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-5">
                          {[['Owners',c.owners||0],['Drivers',c.drivers||0],['Vehicles',c.vehicles||0]].map(([k,v])=>(
                            <div key={k} className="text-center"><p className="text-[9px] text-slate-400 uppercase">{k}</p><p className="text-sm font-black text-slate-700">{parseInt(v||0)}</p></div>
                          ))}
                          <div className="text-center"><p className="text-[9px] text-slate-400 uppercase">Today</p><p className="text-sm font-black text-blue-600">{fmt(c.collection_today)}</p></div>
                          <div className="text-center"><p className="text-[9px] text-slate-400 uppercase">Month</p><p className="text-sm font-black text-slate-700">{fmt(c.collection_month)}</p></div>
                          <div className="flex gap-1">
                            {UpBtn({...c,level:'company',full_name:c.name})}
                            <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition"/>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!loading&&companies.length===0&&<div className="py-10 text-center text-sm text-slate-400">No companies — add one above</div>}
                </div>
              )}
            </div>
          )}

          {/* ── OWNERS ───────────────────────────────────────────── */}
          {panel==='owners' && selCompany && (
            <div className="space-y-4 max-w-6xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={goBack} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 transition"><ChevronLeft size={15}/></button>
                  <div>
                    <h2 className="text-base font-black text-slate-800">{selCompany.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-slate-400 font-mono">ID #{selCompany.id}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-[9px] font-black text-blue-600">{selCompany.company_code}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-[9px] text-slate-400">{selCompany.cin || 'No CIN'}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-[9px] text-slate-400">Joined {fmtDate(selCompany.created_at)}</span>
                    </div>
                  </div>
                </div>
                {UpBtn({...selCompany,level:'company',full_name:selCompany.name})}
              </div>
              <div className="grid grid-cols-5 gap-3">
                <Stat label="Today"       value={fmt(selCompany.collection_today)}  blue icon={Wallet}/>
                <Stat label="This Month"  value={fmt(selCompany.collection_month)}  icon={TrendingUp}/>
                <Stat label="All Time"    value={fmt(selCompany.collection_total)}  icon={TrendingUp}/>
                <Stat label="Drivers"     value={parseInt(selCompany.drivers||0)}   blue icon={Users}/>
                <Stat label="Vehicles"    value={parseInt(selCompany.vehicles||0)}  icon={Truck}/>
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search owner name, code, phone..."
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white"/>
              </div>
              {loading?<div className="py-10 text-center text-sm text-slate-400 animate-pulse">Loading owners...</div>:(
                <>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-xs font-black text-red-700 mb-1">⚠️ Error loading owners</p>
                    <p className="text-[10px] text-red-500 font-mono">{error}</p>
                  </div>
                )}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-slate-100 bg-slate-50/80">
                      {['Owner','Joined','Drivers','Vehicles','Today','Month','Total Wallet',''].map(h=><th key={h} className="text-left px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {filt(owners).map((o,i)=>(
                        <tr key={i} onClick={()=>drillOwner(o)} className="hover:bg-blue-50/20 cursor-pointer transition group">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-black">{o.full_name?.charAt(0)}</div>
                              <div>
                                <p className="font-black text-slate-800">{o.full_name}</p>
                                <p className="text-[9px] text-slate-400 font-mono">{o.owner_code} · {o.mobile_number}</p>
                                {o.business_name && <p className="text-[9px] text-slate-500">{o.business_name}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(o.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="text-center">
                              <p className="font-black text-slate-800">{o.total_drivers||0}</p>
                              <p className="text-[9px] text-slate-400">{o.active_drivers||0} w/ vehicle</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-center">
                              <p className="font-black text-slate-800">{o.total_vehicles||0}</p>
                              <p className="text-[9px] text-slate-400">{o.assigned_vehicles||0} assigned</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-black text-blue-600">{fmt(o.collection_today)}</td>
                          <td className="px-4 py-3 font-black text-slate-700">{fmt(o.collection_month)}</td>
                          <td className="px-4 py-3 font-black text-slate-600">{fmt(o.total_wallet_balance)}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                              {UpBtn({...o,level:'owner'})}
                              <ChevronRight size={13} className="text-slate-300 group-hover:text-blue-500"/>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filt(owners).length===0&&!error&&<div className="py-10 text-center text-sm text-slate-400">No owners found — check if SQL ran: <code className="bg-slate-100 px-1 rounded">UPDATE public.owners SET company_id=1 WHERE company_id IS NULL</code></div>}
                </div>
                </>
              )}
            </div>
          )}

          {/* ── DRIVERS ──────────────────────────────────────────── */}
          {panel==='drivers' && selOwner && (
            <div className="space-y-4 max-w-7xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={goBack} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 transition"><ChevronLeft size={15}/></button>
                  <div>
                    <h2 className="text-base font-black text-slate-800">{selOwner.full_name}</h2>
                    <p className="text-[10px] text-slate-400">{selOwner.business_name||selOwner.owner_code} · Joined {fmtDate(selOwner.created_at)}</p>
                  </div>
                </div>
                {UpBtn({...selOwner,level:'owner'})}
              </div>

              {ownerDetail && (
                <div className="grid grid-cols-4 gap-3">
                  <Stat label="Today"          value={fmt(ownerDetail.owner?.collection_today)}  blue icon={Wallet}/>
                  <Stat label="This Month"     value={fmt(ownerDetail.owner?.collection_month)}  icon={TrendingUp}/>
                  <Stat label="All Time"       value={fmt(ownerDetail.owner?.collection_total)}  icon={TrendingUp}/>
                  <Stat label="Total Vehicles" value={`${ownerDetail.owner?.total_vehicles||0} (${ownerDetail.owner?.assigned_vehicles||0} assigned)`} icon={Truck}/>
                </div>
              )}

              {/* Owner detail strip */}
              {ownerDetail && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Owner Info</p>
                    <Row label="Owner ID"   value={`#${ownerDetail.owner?.id}`} mono/>
                    <Row label="Owner Code" value={ownerDetail.owner?.owner_code} mono/>
                    <Row label="Phone"      value={ownerDetail.owner?.mobile_number} mono/>
                    <Row label="Email"      value={ownerDetail.owner?.email}/>
                    <Row label="Business"   value={ownerDetail.owner?.business_name}/>
                    <Row label="Address"    value={ownerDetail.owner?.address}/>
                    <Row label="Joined"     value={fmtDate(ownerDetail.owner?.created_at)}/>
                    <Row label="Status"     value={ownerDetail.owner?.status}/>
                    <Row label="Incentives" value={ownerDetail.incentive_rules?.is_enabled ? `${ownerDetail.incentive_rules?.rules?.length||0} rules active` : 'Disabled'}/>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Recent Payments</p>
                    {ownerDetail.recent_payments?.length===0 && <p className="text-xs text-slate-400 text-center py-2">No payments</p>}
                    {ownerDetail.recent_payments?.slice(0,5).map((p,i)=>(
                      <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                        <div><p className="text-xs font-black text-slate-700">{p.driver_name}</p><p className="text-[9px] text-slate-400">{fmtDate(p.order_completion_date)}</p></div>
                        <p className="text-sm font-black text-blue-600">{fmt(p.order_amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Vehicles — complete table */}
              {ownerDetail?.vehicles?.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">All Vehicles ({ownerDetail.vehicles.length})</p>
                    <div className="flex gap-3 text-[9px] text-slate-400">
                      <span>{ownerDetail.vehicles.filter(v=>v.driver_id).length} assigned</span>
                      <span>{ownerDetail.vehicles.filter(v=>!v.driver_id).length} free</span>
                    </div>
                  </div>
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                      {['Vehicle','Model/Type','Status','Driver','Assigned Since','Days','Rent/day','Earned','Total Assignments','Ins/FC Expiry'].map(h=><th key={h} className="text-left px-3 py-2.5 text-[9px] font-black text-slate-400 uppercase whitespace-nowrap">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {ownerDetail.vehicles.map((v,i)=>(
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 font-black text-blue-600 whitespace-nowrap">{v.vehicle_number}</td>
                          <td className="px-3 py-2.5"><p className="text-slate-700">{v.vehicle_model}</p><p className="text-slate-400 text-[9px]">{v.vehicle_type||'—'}</p></td>
                          <td className="px-3 py-2.5">
                            <Badge v={v.driver_id ? 'Assigned' : 'Free'}
                              blue={!!v.driver_id} green={!v.driver_id}/>
                          </td>
                          <td className="px-3 py-2.5">
                            {v.driver_name
                              ? <div><p className="font-black text-slate-800">{v.driver_name}</p><p className="text-slate-400 text-[9px] font-mono">{v.driver_mobile} · {v.driver_code}</p></div>
                              : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                            {v.assigned_since
                              ? fmtDate(v.assigned_since)
                              : v.driver_id
                              ? <span className="text-[9px] text-slate-400 italic">Run backfill SQL</span>
                              : '—'}
                          </td>
                          <td className="px-3 py-2.5 font-black text-slate-700 text-center">
                            {v.days_assigned != null ? v.days_assigned : v.driver_id ? '—' : '—'}
                          </td>
                          <td className="px-3 py-2.5 font-black text-slate-700">₹{v.daily_rent||0}</td>
                          <td className="px-3 py-2.5 font-black text-blue-600">
                            {v.earned_from_driver != null ? fmt(v.earned_from_driver) : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-center text-slate-600">{v.total_assignments||0}</td>
                          <td className="px-3 py-2.5">
                            <p className="text-[9px] text-slate-500">Ins: {fmtDate(v.insurance_expiry)}</p>
                            <p className="text-[9px] text-slate-500">FC: {fmtDate(v.fitness_expiry)}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search driver name, vehicle, phone..."
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white"/>
              </div>

              {loading?<div className="py-10 text-center text-sm text-slate-400 animate-pulse">Loading drivers...</div>:(
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-slate-100 bg-slate-50/80">
                      {['Driver','Joined','Vehicle / Since','Rent','Paid Total','Today','Wallet','Active Days',''].map(h=><th key={h} className="text-left px-3 py-3 text-[9px] font-black text-slate-400 uppercase">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {filt(drivers).map((d,i)=>(
                        <tr key={i} onClick={()=>drillDriver(d)} className="hover:bg-blue-50/20 cursor-pointer transition group">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-600">{d.full_name?.charAt(0)}</div>
                              <div>
                                <p className="font-black text-slate-800">{d.full_name}</p>
                                <p className="text-[9px] text-slate-400 font-mono">{d.driver_code} · {d.mobile_number}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-500">{fmtDate(d.created_at)}</td>
                          <td className="px-3 py-3">
                            {d.vehicle_number
                              ? <div><span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{d.vehicle_number}</span><p className="text-[9px] text-slate-400 mt-0.5">{timeSince(d.vehicle_since)}</p></div>
                              : <span className="text-xs text-slate-400">—</span>}
                          </td>
                          <td className="px-3 py-3 text-xs font-black text-slate-700">{d.daily_rent?`₹${d.daily_rent}/d`:'—'}</td>
                          <td className="px-3 py-3 font-black text-slate-700 text-sm">{fmt(d.total_paid)}</td>
                          <td className="px-3 py-3 font-black text-blue-600">{fmt(d.paid_today)}</td>
                          <td className="px-3 py-3 font-black text-slate-600">{fmt(d.wallet_balance)}</td>
                          <td className="px-3 py-3 text-center">
                            <p className="font-black text-slate-700">{d.total_active_days||0}</p>
                            <p className="text-[9px] text-slate-400">{Math.floor((d.total_active_minutes||0)/60)}h total</p>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                              {UpBtn({...d,level:'driver'})}
                              <ChevronRight size={13} className="text-slate-300 group-hover:text-blue-500"/>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filt(drivers).length===0&&<div className="py-10 text-center text-sm text-slate-400">No drivers</div>}
                </div>
              )}
            </div>
          )}

          {/* ── DRIVER DETAIL ────────────────────────────────────── */}
          {panel==='driver-detail' && selDriver && (
            <div className="space-y-4 max-w-5xl">
              <div className="flex items-center gap-3">
                <button onClick={goBack} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 transition"><ChevronLeft size={15}/></button>
                <div className="flex-1">
                  <h2 className="text-base font-black text-slate-800">{selDriver.full_name}</h2>
                  <p className="text-[10px] text-slate-400">{selDriver.driver_code} · {selDriver.mobile_number} · Joined {fmtDate(selDriver.created_at)}</p>
                </div>
                <Badge v={selDriver.status} green={selDriver.status==='ACTIVE'} amber={selDriver.status!=='ACTIVE'}/>
                {UpBtn({...selDriver,level:'driver'})}
              </div>

              {loading?<div className="py-10 text-center text-sm text-slate-400 animate-pulse">Loading...</div>:driverDetail&&(
                <>
                  {/* Top stats */}
                  <div className="grid grid-cols-5 gap-3">
                    <Stat label="Total Paid"    value={fmt(driverDetail.driver?.total_paid)}    blue icon={CreditCard} sub={`${driverDetail.driver?.total_transactions||0} transactions`}/>
                    <Stat label="Today"         value={fmt(driverDetail.driver?.paid_today)}    blue icon={Wallet}/>
                    <Stat label="Wallet Balance" value={fmt(driverDetail.driver?.wallet_balance)} icon={Wallet}/>
                    <Stat label="Security Dep." value={fmt(driverDetail.driver?.security_deposit)} icon={Shield}/>
                    <Stat label="Last Payment"  value={driverDetail.driver?.last_payment_date?timeSince(driverDetail.driver.last_payment_date):'Never'} icon={Clock}/>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {/* Profile */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Profile</p>
                      <Row label="Driver ID"   value={`#${driverDetail.driver?.id}`} mono/>
                      <Row label="Name"        value={driverDetail.driver?.full_name}/>
                      <Row label="Mobile"      value={driverDetail.driver?.mobile_number} mono/>
                      <Row label="Driver Code" value={driverDetail.driver?.driver_code} mono/>
                      <Row label="DOB"         value={fmtDate(driverDetail.driver?.date_of_birth)}/>
                      <Row label="License No." value={driverDetail.driver?.driving_license_number} mono/>
                      <Row label="DL Expiry"   value={fmtDate(driverDetail.driver?.driving_license_expiry)}/>
                      <Row label="Rent Type"   value={driverDetail.driver?.rent_type}/>
                      <Row label="Joined"      value={fmtDate(driverDetail.driver?.created_at)}/>
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Owner</p>
                        <Row label="Owner ID"   value={`#${driverDetail.driver?.owner_id}`} mono/>
                        <Row label="Name"       value={driverDetail.driver?.owner_name}/>
                        <Row label="Phone"      value={driverDetail.driver?.owner_phone} mono/>
                        <Row label="Code"       value={driverDetail.driver?.owner_code} mono/>
                        <Row label="Business"   value={driverDetail.driver?.owner_business}/>
                      </div>
                    </div>

                    {/* Current vehicle + docs */}
                    <div className="space-y-3">
                      <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Current Vehicle</p>
                        {driverDetail.driver?.vehicle_number?(
                          <>
                            <p className="text-lg font-black text-blue-600 mb-1">{driverDetail.driver.vehicle_number}</p>
                            <Row label="Model"       value={driverDetail.driver.vehicle_model}/>
                            <Row label="Daily Rent"  value={`₹${driverDetail.driver.daily_rent}`}/>
                            <Row label="Assigned"    value={timeSince(driverDetail.driver.vehicle_since)}/>
                            <Row label="Ins. Expiry" value={fmtDate(driverDetail.driver.insurance_expiry)}/>
                            <Row label="FC Expiry"   value={fmtDate(driverDetail.driver.fitness_expiry)}/>
                          </>
                        ):<p className="text-xs text-slate-400 text-center py-2">No vehicle assigned</p>}
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-3">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Documents</p>
                          <button onClick={()=>{setDocTarget({...selDriver,level:'driver'});setShowDoc(true);}} className="text-[9px] font-black text-blue-600 flex items-center gap-1"><Upload size={9}/>Upload</button>
                        </div>
                        {['AADHAAR','PAN_CARD','DRIVING_LICENSE','BANK_CHEQUE','PROFILE_PHOTO'].map(dt=>{
                          const doc = driverDetail.documents?.find(d=>d.doc_type===dt);
                          return <div key={dt} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                            <span className="text-xs text-slate-500">{dt.replace(/_/g,' ')}</span>
                            <Badge v={doc?.status==='VERIFIED'?'✓ Verified':doc?'Pending':'Missing'}
                              blue={doc?.status==='VERIFIED'} amber={doc&&doc?.status!=='VERIFIED'} red={!doc}/>
                          </div>;
                        })}
                      </div>
                    </div>

                    {/* Notifications */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1"><Bell size={10}/>Notifications</p>
                      {driverDetail.notifications?.length===0&&<p className="text-xs text-slate-400 text-center py-4">No notifications</p>}
                      {driverDetail.notifications?.map((n,i)=>(
                        <div key={i} className="py-1.5 border-b border-slate-50 last:border-0">
                          <p className="text-xs font-black text-slate-700">{n.title}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{n.message}</p>
                          <p className="text-[8px] text-slate-300 mt-0.5">{timeSince(n.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Vehicle History */}
                  {driverDetail.vehicle_history?.length>0&&(
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vehicle History ({driverDetail.vehicle_history.length})</p>
                      </div>
                      <table className="w-full text-xs">
                        <thead><tr className="border-b border-slate-100">
                          {['Vehicle','Model','Assigned','Returned','Days','Daily Rent','Total Earned','Reason'].map(h=><th key={h} className="text-left px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase">{h}</th>)}
                        </tr></thead>
                        <tbody className="divide-y divide-slate-50">
                          {driverDetail.vehicle_history.map((h,i)=>(
                            <tr key={i}>
                              <td className="px-4 py-2.5 font-black text-blue-600">{h.vehicle_number}</td>
                              <td className="px-4 py-2.5 text-slate-500">{h.vehicle_model}</td>
                              <td className="px-4 py-2.5 text-slate-500">{fmtDate(h.assigned_at)}</td>
                              <td className="px-4 py-2.5">{h.unassigned_at?fmtDate(h.unassigned_at):<Badge v="Current" blue/>}</td>
                              <td className="px-4 py-2.5 font-black text-slate-700">{h.total_days}d</td>
                              <td className="px-4 py-2.5 text-slate-600">₹{h.daily_rent}</td>
                              <td className="px-4 py-2.5 font-black text-blue-600">{fmt(h.total_earned)}</td>
                              <td className="px-4 py-2.5 text-slate-400">{h.reason||'—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Transactions + Activity side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Transactions */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex justify-between">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Transactions</p>
                        <p className="text-[9px] text-slate-400">{driverDetail.transactions?.length} shown</p>
                      </div>
                      <div className="divide-y divide-slate-50 max-h-52 overflow-y-auto">
                        {driverDetail.transactions?.length===0&&<p className="p-4 text-xs text-slate-400 text-center">No transactions</p>}
                        {driverDetail.transactions?.map((tx,i)=>(
                          <div key={i} className="px-4 py-2.5 flex justify-between items-center">
                            <div><p className="text-xs font-black text-slate-700">{fmt(tx.order_amount)}</p><p className="text-[9px] text-slate-400">{fmtDate(tx.order_initiation_date)} {fmtTime(tx.order_initiation_date)}</p></div>
                            <Badge v={tx.transaction_status==='SUCCESS'?'Paid':'Failed'} blue={tx.transaction_status==='SUCCESS'} red={tx.transaction_status!=='SUCCESS'}/>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Activity log */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex justify-between">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Activity Log (30 days)</p>
                      </div>
                      <div className="divide-y divide-slate-50 max-h-52 overflow-y-auto">
                        {driverDetail.daily_logs?.length===0&&<p className="p-4 text-xs text-slate-400 text-center">No activity</p>}
                        {driverDetail.daily_logs?.map((l,i)=>{
                          const hrs=Math.floor((l.active_minutes||0)/60), mins=(l.active_minutes||0)%60;
                          return <div key={i} className="px-4 py-2 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-black text-slate-700">{fmtDate(l.log_date)}</p>
                              {l.login_time&&<p className="text-[9px] text-slate-400">{fmtTime(l.login_time)} – {l.logout_time?fmtTime(l.logout_time):'Active'}</p>}
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-black text-slate-700">{hrs}h {mins}m</p>
                              {l.incentive_applied&&<p className="text-[9px] font-black text-blue-600">+{fmt(l.incentive_amount)}</p>}
                            </div>
                          </div>;
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── FINANCE ──────────────────────────────────────────── */}
          {panel==='finance'&&(
            <div className="space-y-5 max-w-5xl">
              <h2 className="text-base font-black text-slate-800">Financial Monitor</h2>
              <div className="grid grid-cols-3 gap-4">
                <Stat label="Today"      value={fmt(pStats.collection_today)}  blue icon={Wallet}/>
                <Stat label="This Month" value={fmt(pStats.collection_month)}  icon={TrendingUp}/>
                <Stat label="All Time"   value={fmt(pStats.collection_total)}  icon={TrendingUp}/>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Company Breakdown</p></div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100">{['Company','Today','Month','All Time','Owners','Drivers'].map(h=><th key={h} className="text-left px-4 py-3 text-[9px] font-black text-slate-400 uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {companies.map((c,i)=>(
                      <tr key={i} onClick={()=>drillCompany(c)} className="hover:bg-blue-50/20 cursor-pointer transition">
                        <td className="px-4 py-3 font-black text-slate-800">{c.name}</td>
                        <td className="px-4 py-3 font-black text-blue-600">{fmt(c.collection_today)}</td>
                        <td className="px-4 py-3 font-black text-slate-700">{fmt(c.collection_month)}</td>
                        <td className="px-4 py-3 font-black text-slate-700">{fmt(c.collection_total)}</td>
                        <td className="px-4 py-3 text-slate-600">{parseInt(c.owners||0)}</td>
                        <td className="px-4 py-3 text-slate-600">{parseInt(c.drivers||0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── KYC ──────────────────────────────────────────────── */}
          {panel==='kyc'&&<div className="max-w-4xl"><h2 className="text-base font-black text-slate-800 mb-5">KYC Desk</h2><div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm">✅ No pending KYC cases</div></div>}

          {/* ── AUDIT ────────────────────────────────────────────── */}
          {panel==='audit'&&(
            <div className="max-w-4xl">
              <h2 className="text-base font-black text-slate-800 mb-5">Audit Logs</h2>
              <div className="bg-slate-950 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"/><span className="text-xs font-black text-slate-400">Live</span></div>
                <div className="p-4 space-y-1.5 max-h-96 overflow-y-auto">{logs.map((l,i)=><p key={i} className="text-xs text-emerald-400 font-mono">{l}</p>)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Company Modal */}
      {showAddCo&&(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-5 py-4 border-b flex justify-between"><p className="font-black text-slate-800">Register Company</p><button onClick={()=>setShowAddCo(false)}><X size={17} className="text-slate-400"/></button></div>
            <div className="p-5 space-y-3">
              <input placeholder="Company Name *" value={newCo.name} onChange={e=>setNewCo(p=>({...p,name:e.target.value}))} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-blue-500"/>
              <input placeholder="CIN Number"     value={newCo.cin}  onChange={e=>setNewCo(p=>({...p,cin:e.target.value}))}  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-mono focus:outline-none focus:border-blue-500"/>
              <input placeholder="City"           value={newCo.city} onChange={e=>setNewCo(p=>({...p,city:e.target.value}))} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-blue-500"/>
              <div className="flex gap-3 pt-1">
                <button onClick={()=>setShowAddCo(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-black text-slate-600">Cancel</button>
                <button onClick={async()=>{
                  if(!newCo.name) return alert('Name required');
                  const r=await fetch(`${API}/api/admin/companies`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(newCo)});
                  const d=await r.json();
                  if(d.success){await loadCompanies();addLog(`Company: ${newCo.name}`);setShowAddCo(false);setNewCo({name:'',cin:'',city:''});}
                  else alert(d.error||'Failed');
                }} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doc Upload Modal */}
      {showDoc&&docTarget&&(()=>{
        const types = {company:['GST_CERTIFICATE','PAN_CARD','INCORPORATION_CERT','BANK_STATEMENT','AGREEMENT'],owner:['AADHAAR','PAN_CARD','BANK_CHEQUE','BUSINESS_REG','GST'],driver:['AADHAAR','PAN_CARD','DRIVING_LICENSE','BANK_CHEQUE','PROFILE_PHOTO']}[docTarget.level]||[];
        let docType='',file=null,uploading=false;
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
              <div className="px-5 py-4 border-b flex justify-between"><div><p className="font-black text-slate-800">Upload Document</p><p className="text-xs text-slate-400 mt-0.5 capitalize">{docTarget.level}: {docTarget.full_name||docTarget.name}</p></div><button onClick={()=>setShowDoc(false)}><X size={17} className="text-slate-400"/></button></div>
              <div className="p-5 space-y-4">
                <select onChange={e=>docType=e.target.value} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 focus:outline-none focus:border-blue-500">
                  <option value="">— Select type —</option>
                  {types.map(t=><option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                </select>
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition">
                  <Upload size={18} className="text-slate-400 mb-1"/><p className="text-xs text-slate-400">Click to upload PDF/Image</p>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>file=e.target.files[0]}/>
                </label>
                <div className="flex gap-3">
                  <button onClick={()=>setShowDoc(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-black text-slate-600">Cancel</button>
                  <button onClick={async()=>{
                    if(!file||!docType) return alert('Select type and file');
                    const fd=new FormData(); fd.append('file',file); fd.append('doc_type',docType); fd.append('user_type',docTarget.level.toUpperCase()); fd.append('user_id',String(docTarget.id));
                    const r=await fetch(`${API}/api/uploads/upload`,{method:'POST',body:fd}); const d=await r.json();
                    if(d.success){addLog(`Doc: ${docType} for ${docTarget.full_name||docTarget.name}`);alert('✅ Uploaded!');setShowDoc(false);}else alert(d.message||'Failed');
                  }} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition">Upload</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}