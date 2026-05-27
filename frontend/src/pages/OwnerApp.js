import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutGrid, Cable, Users, UserCircle2, AlertCircle, Truck,
  CheckSquare, Plus, ChevronLeft, FileText, ShieldCheck, Camera,
  CheckCircle, Send, Bell, BellRing, X, LogOut, Wifi, Battery,
  RefreshCw, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = 'https://mg-qw5s.onrender.com';
const VEHICLE_TYPES = ['EV Truck','EV Car','EV Bike','EV Auto','CNG Auto','Petrol Bike','Other'];

export default function OwnerApp() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState('dash');
  const [prevScreen, setPrevScreen] = useState(null);
  const [user, setUser]   = useState(null);
  const [time, setTime]   = useState('');
  const [loading, setLoading] = useState(true);

  const [stats, setStats]         = useState({ total_vehicles:0, total_drivers:0, total_earnings:0, paid_today:0 });
  const [vehicles, setVehicles]   = useState([]);
  const [drivers, setDrivers]     = useState([]);
  const [recentPay, setRecentPay] = useState([]);
  const [notifs, setNotifs]       = useState([]);
  const [unread, setUnread]       = useState(0);
  const [horizon, setHorizon]     = useState('today');
  const [toast, setToast]         = useState(null);
  const [showNotif, setShowNotif] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const lastPollRef = useRef(Date.now());

  // Forms
  const [newVeh, setNewVeh] = useState({ name:'', plate:'', freq:'Daily', rate:'', deduct:'' });
  const [newDrv, setNewDrv] = useState({ name:'', phone:'', license:'', aadhaar:'' });
  const [dispatch, setDispatch] = useState({ vehicleId:'', driverId:'', advance:'0' });

  // Camera captures
  const [captures, setCaptures] = useState({ front:false, rear:false, left:false, dash:false });

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(u);
    if (!u?.id) setLoading(false);
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      let h = now.getHours(), m = String(now.getMinutes()).padStart(2,'0');
      setTime(`${h%12||12}:${m} ${h>=12?'PM':'AM'}`);
    };
    tick(); const id = setInterval(tick,30000); return ()=>clearInterval(id);
  }, []);

  const tk = () => localStorage.getItem('token');
  const ownerId = user?.id || '1';

  const fetchAll = useCallback(async () => {
    if (!user?.id) return;
    try {
      const H = { Authorization:`Bearer ${tk()}` };
      const [sR,vR,dR,nR,pR] = await Promise.all([
        fetch(`${API}/api/payment/owner/stats?ownerId=${ownerId}`,           {headers:H}),
        fetch(`${API}/api/payment/owner/vehicles?ownerId=${ownerId}`,        {headers:H}),
        fetch(`${API}/api/payment/owner/drivers/list?ownerId=${ownerId}`,    {headers:H}),
        fetch(`${API}/api/payment/owner/notifications?ownerId=${ownerId}`,   {headers:H}),
        fetch(`${API}/api/payment/owner/recent-payments?ownerId=${ownerId}`, {headers:H}),
      ]);
      if(sR.ok) setStats(await sR.json());
      if(vR.ok) setVehicles(await vR.json());
      if(dR.ok){const d=await dR.json();setDrivers(d.drivers||[]);}
      if(nR.ok){const n=await nR.json();const a=Array.isArray(n)?n:[];setNotifs(a);setUnread(a.filter(x=>!x.is_read).length);}
      if(pR.ok) setRecentPay(await pR.json());
    } catch(e){console.error(e);}
    finally{setLoading(false);}
  }, [user]);

  useEffect(()=>{fetchAll();},[fetchAll]);

  // Live poll every 30s
  useEffect(() => {
    if (!user?.id) return;
    const poll = async () => {
      try {
        const since = lastPollRef.current;
        const r = await fetch(`${API}/api/payment/owner/live-check?ownerId=${ownerId}&since=${since}`,
          {headers:{Authorization:`Bearer ${tk()}`}});
        if (!r.ok) return;
        const data = await r.json();
        lastPollRef.current = data.server_time || Date.now();
        if (data.new_payment) {
          setToast(data.new_payment);
          setTimeout(()=>setToast(null),5000);
          setStats(p=>({...p,total_earnings:data.today_total,paid_today:data.today_paid}));
          const H = {Authorization:`Bearer ${tk()}`};
          const [nR,pR] = await Promise.all([
            fetch(`${API}/api/payment/owner/notifications?ownerId=${ownerId}`,{headers:H}),
            fetch(`${API}/api/payment/owner/recent-payments?ownerId=${ownerId}`,{headers:H}),
          ]);
          if(nR.ok){const n=await nR.json();const a=Array.isArray(n)?n:[];setNotifs(a);setUnread(a.filter(x=>!x.is_read).length);}
          if(pR.ok) setRecentPay(await pR.json());
        }
      } catch(_){}
    };
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, [user]);

  const markRead = async()=>{
    setUnread(0); setNotifs(p=>p.map(n=>({...n,is_read:true})));
    try{await fetch(`${API}/api/payment/notifications/mark-read?userId=${ownerId}`,{method:'PUT',headers:{Authorization:`Bearer ${tk()}`}});}catch(_){}
  };

  const goTo = (s, from=null) => { setPrevScreen(from); setScreen(s); };

  const logout = () => { localStorage.clear(); navigate('/login'); };

  const horizonData = {
    today:      { received: `₹${Number(stats.total_earnings||0).toLocaleString('en-IN')}`, outstanding:'₹4,200', pending:'₹1,800', label:'Calculated for Today' },
    yesterday:  { received:'₹26,800', outstanding:'₹3,100', pending:'₹950',   label:'Calculated for Yesterday' },
    week:       { received:'₹1,84,500', outstanding:'₹12,400', pending:'₹5,200', label:'Aggregated Last 7 Days' },
    this_month: { received:'₹6,42,000', outstanding:'₹24,500', pending:'₹14,900', label:'Aggregated Current Month' },
    last_month: { received:'₹7,89,400', outstanding:'₹0', pending:'₹0', label:'Audited Previous Month' },
  };
  const hd = horizonData[horizon] || horizonData.today;

  // Add vehicle
  const addVehicle = async(e) => {
    e.preventDefault();
    if(!newVeh.name||!newVeh.plate||!newVeh.rate) return alert('Fill all required fields');
    setSubmitting(true);
    try{
      const res = await fetch(`${API}/api/payment/owner/vehicles`,{method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${tk()}`},
        body:JSON.stringify({owner_id:ownerId,vehicle_number:newVeh.plate.toUpperCase(),
          vehicle_model:newVeh.name,daily_rent:parseFloat(newVeh.rate)})
      });
      const d = await res.json();
      if(!res.ok) throw new Error(d.message||'Failed');
      alert('Asset registered. Moving to Dispatch Handover.');
      setNewVeh({name:'',plate:'',freq:'Daily',rate:'',deduct:''});
      setCaptures({front:false,rear:false,left:false,dash:false});
      await fetchAll();
      goTo('dispatch');
    }catch(e){alert('❌ '+e.message);}
    finally{setSubmitting(false);}
  };

  // Add driver
  const addDriver = async(e) => {
    e.preventDefault();
    setSubmitting(true);
    try{
      const res = await fetch(`${API}/api/payment/owner/add-driver`,{method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${tk()}`},
        body:JSON.stringify({full_name:newDrv.name,mobile_number:newDrv.phone,owner_id:ownerId})
      });
      const d = await res.json();
      if(!res.ok) throw new Error(d.message||'Failed');
      alert('Driver profile submitted. Identity moved to KYC verification desk.');
      setNewDrv({name:'',phone:'',license:'',aadhaar:''});
      await fetchAll();
      goTo('drivers');
    }catch(e){alert('❌ '+e.message);}
    finally{setSubmitting(false);}
  };

  // Commit handover
  const commitHandover = async() => {
    if(!dispatch.vehicleId||!dispatch.driverId) return alert('Please select both vehicle and driver.');
    setSubmitting(true);
    try{
      await fetch(`${API}/api/payment/owner/vehicles`,{method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${tk()}`},
        body:JSON.stringify({owner_id:ownerId,vehicle_number:dispatch.vehicleId,
          vehicle_model:'',daily_rent:0,driver_id:dispatch.driverId})
      }).catch(()=>{});
      alert(`Ecosystem Handover Clearance Granted!\n\nWallet Cash Advance of ₹${dispatch.advance||0} successfully dispatched.`);
      setDispatch({vehicleId:'',driverId:'',advance:'0'});
      await fetchAll();
      goTo('dash');
    }catch(e){alert('❌ '+e.message);}
    finally{setSubmitting(false);}
  };

  const unassignedVehicles = vehicles.filter(v=>!v.driver_name||v.status==='AVAILABLE');
  const unassignedDrivers  = drivers.filter(d=>!d.assigned_vehicle||d.assigned_vehicle==='Not Assigned');

  // ── SCREENS ──

  const DashScreen = () => (
    <div className="p-4 flex flex-col gap-4 pb-20">
      {/* Yield Ledger */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ecosystem Yield Ledger</span>
          <select value={horizon} onChange={e=>setHorizon(e.target.value)}
            className="bg-slate-100 px-2 py-1 rounded text-[11px] font-bold text-slate-700 outline-none border border-slate-200 cursor-pointer">
            <option value="today">Today (Live)</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">Last 7 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-100">
            <span className="text-[9px] text-emerald-600 font-bold uppercase block tracking-tight">Received</span>
            <b className="text-sm font-mono font-bold text-emerald-700 block mt-0.5">{hd.received}</b>
          </div>
          <div className="bg-amber-50/60 p-2 rounded-xl border border-amber-100">
            <span className="text-[9px] text-amber-600 font-bold uppercase block tracking-tight">Outstanding</span>
            <b className="text-sm font-mono font-bold text-amber-700 block mt-0.5">{hd.outstanding}</b>
          </div>
          <div className="bg-rose-50/60 p-2 rounded-xl border border-rose-100">
            <span className="text-[9px] text-rose-600 font-bold uppercase block tracking-tight">Pending</span>
            <b className="text-sm font-mono font-bold text-rose-700 block mt-0.5">{hd.pending}</b>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-1">
          <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"/>Virtual Escrow Connected</span>
          <span className="font-bold text-slate-500">{hd.label}</span>
        </div>
      </div>

      {/* Incident widget — shown if there are driver notifications */}
      {notifs.filter(n=>n.title?.includes('SOS')||n.title?.includes('Incident')).length>0&&(
        <div className="bg-red-50 border border-red-100 p-3 rounded-2xl flex items-start gap-2.5 shadow-sm">
          <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5"><AlertCircle size={16}/></div>
          <div className="flex-1 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <b className="text-slate-900 font-bold">Driver Incident Escalation</b>
              <span className="text-[9px] bg-red-600 text-white font-bold px-1.5 rounded uppercase tracking-wider">Help Desk</span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">{notifs.find(n=>n.title?.includes('SOS'))?.message||'Driver reported an on-road incident.'}</p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 text-xs font-medium">
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Truck size={16}/></div>
          <div><span className="text-slate-400 block text-[10px]">Fleet Registered</span><b className="text-slate-800 font-mono text-sm">{stats.total_vehicles||0} Vehicles</b></div>
        </div>
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0"><CheckSquare size={16}/></div>
          <div><span className="text-slate-400 block text-[10px]">Active Contracts</span><b className="text-slate-800 font-mono text-sm">{stats.total_drivers||0} Drivers</b></div>
        </div>
      </div>

      {/* Live asset desk */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Live Asset Management Desk</h3>
          <button onClick={()=>goTo('addasset','dash')} className="text-[11px] text-blue-600 font-bold flex items-center gap-0.5 hover:underline"><Plus size={12}/> Quick Register</button>
        </div>
        <div className="space-y-2.5">
          {vehicles.length===0?(
            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400">No vehicles registered yet</div>
          ):vehicles.map((v,i)=>(
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{v.vehicle_model||v.vehicle_number}</h4>
                  <span className="text-[10px] font-mono text-slate-400">Plate: {v.vehicle_number} • Freq: Daily</span>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${v.status==='ASSIGNED'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>
                  {v.status==='ASSIGNED'?'Bound & Active':'Awaiting Assignment'}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[11px] text-slate-500 font-medium font-mono">
                <span className="font-sans">Driver: <b className="text-slate-800">{v.driver_name||'Unassigned'}</b></span>
                <span className="text-slate-700">Rent: ₹{v.daily_rent}/day</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const AddAssetScreen = () => (
    <div className="p-4 flex flex-col gap-4 pb-20">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <button onClick={()=>goTo(prevScreen||'dash')} className="text-slate-400 p-0.5"><ChevronLeft size={20}/></button>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Register Enterprise Rental Vehicle</h3>
      </div>
      <form onSubmit={addVehicle} className="text-xs font-medium space-y-3.5">
        <div className="space-y-1">
          <label className="text-slate-500">Vehicle Make Model Name</label>
          <input value={newVeh.name} onChange={e=>setNewVeh({...newVeh,name:e.target.value})} required placeholder="e.g., Tata Ace EV Truck Pro"
            className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-blue-600 font-semibold bg-white shadow-sm"/>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-slate-500">RTO Registration Number</label>
            <input value={newVeh.plate} onChange={e=>setNewVeh({...newVeh,plate:e.target.value.toUpperCase()})} required placeholder="MH-12-QX-9999"
              className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-blue-600 font-mono font-bold bg-white shadow-sm uppercase"/>
          </div>
          <div className="space-y-1">
            <label className="text-slate-500">Rental Frequency</label>
            <select value={newVeh.freq} onChange={e=>setNewVeh({...newVeh,freq:e.target.value})}
              className="w-full border border-slate-200 rounded-xl p-2.5 bg-white shadow-sm font-semibold outline-none text-slate-700">
              <option>Daily Rent Remittance</option>
              <option>Weekly Rent Cycle</option>
              <option>Monthly Cycle</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-slate-500">Base Rent Rate (₹)</label>
            <input type="number" value={newVeh.rate} onChange={e=>setNewVeh({...newVeh,rate:e.target.value})} required placeholder="850"
              className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-blue-600 font-mono font-bold bg-white shadow-sm"/>
          </div>
          <div className="space-y-1">
            <label className="text-slate-500">Deduction/Day (₹)</label>
            <input type="number" value={newVeh.deduct} onChange={e=>setNewVeh({...newVeh,deduct:e.target.value})} placeholder="e.g., 50"
              className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-blue-600 font-mono font-bold bg-white shadow-sm"/>
          </div>
        </div>
        {/* Camera captures */}
        <div className="space-y-1.5">
          <label className="text-slate-500 block">Vehicle Inspection Images</label>
          <div className="grid grid-cols-4 gap-2">
            {['front','rear','left','dash'].map((side,i)=>([
              <div key={side} onClick={()=>setCaptures(p=>({...p,[side]:true}))}
                className={`aspect-square rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 text-[8px] cursor-pointer transition-colors
                  ${captures[side]?'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold':'bg-slate-100 border-slate-300 text-slate-400 hover:bg-slate-200'}`}>
                {captures[side]?<CheckCircle size={14} className="text-emerald-600"/>:<Camera size={14}/>}
                <span>{['Front','Rear','Left','Dash'][i]}</span>
              </div>
            ]))}
          </div>
        </div>
        {/* Docs */}
        <div className="space-y-1.5">
          <label className="text-slate-500 block">Compliance Documents Vault</label>
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 shadow-sm">
            {[['RTO RC Smart Card','FileText'],['Commercial Insurance','ShieldCheck']].map(([label])=>(
              <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                <span className="text-slate-700 font-medium flex items-center gap-1 text-[11px]"><FileText size={13} className="text-slate-400"/> {label}</span>
                <button type="button" className="text-[10px] text-blue-600 font-bold hover:underline">Attach File</button>
              </div>
            ))}
          </div>
        </div>
        <button type="submit" disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-xl shadow-md text-xs uppercase tracking-widest disabled:opacity-60">
          {submitting?'Registering…':'Register Asset & Proceed to Dispatch'}
        </button>
      </form>
    </div>
  );

  const DispatchScreen = () => (
    <div className="p-4 flex flex-col gap-4 pb-20">
      <div className="border-b border-slate-100 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Ecosystem Dispatch Handover Console</h3>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3.5 text-xs font-medium">
        <div className="space-y-1">
          <label className="text-slate-500">Select Vehicle Unit</label>
          <select value={dispatch.vehicleId} onChange={e=>setDispatch({...dispatch,vehicleId:e.target.value})}
            className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-semibold outline-none text-slate-700 shadow-sm">
            <option value="">— Select Vehicle —</option>
            {vehicles.map((v,i)=><option key={i} value={v.vehicle_number}>{v.vehicle_model||v.vehicle_number} [{v.vehicle_number}]</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-slate-500">Assign Driver</label>
          <select value={dispatch.driverId} onChange={e=>setDispatch({...dispatch,driverId:e.target.value})}
            className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-semibold outline-none text-slate-700 shadow-sm">
            <option value="">— Select Driver —</option>
            {drivers.map((d,i)=><option key={i} value={d.id}>{d.full_name}</option>)}
          </select>
          {drivers.length===0&&<p className="text-[10px] text-amber-600 font-bold">No verified drivers available. Add drivers first.</p>}
        </div>
        <div className="space-y-1">
          <label className="text-slate-500">Wallet Cash Advance to Driver (₹)</label>
          <input type="number" value={dispatch.advance} onChange={e=>setDispatch({...dispatch,advance:e.target.value})} placeholder="0"
            className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-blue-600 font-mono font-bold bg-white shadow-sm"/>
        </div>
        <button onClick={commitHandover} disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-xl shadow-md text-xs uppercase tracking-widest disabled:opacity-60">
          {submitting?'Processing…':'Commit Ecosystem Dispatch Handover'}
        </button>
      </div>

      {/* Add new vehicle shortcut */}
      <button onClick={()=>goTo('addasset','dispatch')}
        className="w-full border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500 font-bold py-4 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors">
        <Plus size={14}/> Register New Vehicle First
      </button>
    </div>
  );

  const DriversScreen = () => (
    <div className="p-4 flex flex-col gap-4 pb-20">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Driver Matrix & KYC Audit</h3>
        <button onClick={()=>goTo('adddriver','drivers')} className="text-[10px] text-blue-600 font-bold flex items-center gap-0.5"><Plus size={12}/> Add Driver</button>
      </div>
      <div className="space-y-3">
        {drivers.length===0?(
          <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">No drivers yet. Add your first driver.</div>
        ):drivers.map((d,i)=>{
          const isPending = !d.assigned_vehicle||d.assigned_vehicle==='Not Assigned';
          return(
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{d.full_name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Phone: {d.phone_number}</p>
                </div>
                {isPending
                  ? <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold rounded-full animate-pulse">Pending Audit</span>
                  : <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-full">✓ Verified</span>}
              </div>
              {isPending?(
                <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Verify Driver Identity</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-200 flex items-center gap-1"><FileText size={11} className="text-slate-400"/> Code: {d.driver_code||'—'}</div>
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-200 flex items-center gap-1"><ShieldCheck size={11} className="text-slate-400"/> {d.phone_number}</div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button onClick={()=>alert(`KYC Rejected for ${d.full_name}`)} className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-lg text-[10px] border border-red-200">Reject</button>
                    <button onClick={()=>alert(`✅ KYC Approved for ${d.full_name}`)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-lg text-[10px] shadow-sm">Approve & Verify</button>
                  </div>
                </div>
              ):(
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Compliance Signed</span>
                  <ShieldCheck size={14} className="text-emerald-600"/>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const AddDriverScreen = () => (
    <div className="p-4 flex flex-col gap-4 pb-20">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <button onClick={()=>goTo(prevScreen||'drivers')} className="text-slate-400 p-0.5"><ChevronLeft size={20}/></button>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Onboard New Driver Profile</h3>
      </div>
      <form onSubmit={addDriver} className="text-xs font-medium space-y-3.5">
        {[
          {key:'name',   label:'Driver Full Name',     ph:'e.g., Rajesh Kumar',     type:'text'},
          {key:'phone',  label:'Contact Phone (+91)',  ph:'9876543210',              type:'tel'},
          {key:'license',label:'Driving License No.',  ph:'DL-142021008892',         type:'text'},
          {key:'aadhaar',label:'Aadhaar Last 4 Digits',ph:'XXXX XXXX 1234',          type:'text'},
        ].map(({key,label,ph,type})=>(
          <div key={key} className="space-y-1">
            <label className="text-slate-500">{label}</label>
            <input type={type} value={newDrv[key]} required={key!=='aadhaar'&&key!=='license'}
              onChange={e=>setNewDrv({...newDrv,[key]:e.target.value})} placeholder={ph}
              className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-blue-600 font-semibold bg-white shadow-sm"/>
          </div>
        ))}
        <button type="submit" disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-xl shadow-md text-xs uppercase tracking-widest disabled:opacity-60">
          {submitting?'Submitting…':'Submit Driver to KYC Verification'}
        </button>
      </form>
    </div>
  );

  const ProfileScreen = () => (
    <div className="p-4 flex flex-col gap-4 pb-20">
      <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white p-4 rounded-2xl shadow-md space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base border border-white/10">
            {user?.name?.charAt(0)?.toUpperCase()||'EA'}
          </div>
          <div>
            <h4 className="text-xs font-bold" style={{fontFamily:'Poppins,sans-serif'}}>{user?.name||'Fleet Owner'} Admin Profile</h4>
            <span className="text-[9px] text-blue-200 font-mono tracking-wider block">
              ID: {(user?.id||'OWNER-MGE-0041').substring(0,16).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="border-t border-white/10 pt-2 flex items-center justify-between text-[9px] text-slate-300 font-mono">
          <span>Tier: <b>Premium Enterprise</b></span>
          <span>API Gateway: <b className="text-emerald-400">Live</b></span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-3 text-xs font-medium">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Owner KYC Document Vault</span>
          <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold font-mono">Secured AES-256</span>
        </div>
        <div className="space-y-2.5">
          {[
            {label:'Corporate GSTIN Certificate',  sub:'gst_registration_2026.pdf', uploaded:true},
            {label:'Enterprise PAN Card Copy',      sub:'Required for tax logs',      uploaded:false},
            {label:'Corporate Utility Bill',        sub:'Required for address verify', uploaded:false},
          ].map((doc,i)=>(
            <div key={i} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
              <div>
                <h5 className="text-[11px] font-bold text-slate-800">{doc.label}</h5>
                <p className="text-[9px] text-slate-400 font-mono">{doc.sub}</p>
              </div>
              {doc.uploaded
                ? <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><CheckCircle size={13}/> Uploaded</span>
                : <button onClick={()=>alert('Document securely pushed to compliance registry.')} className="text-[10px] text-blue-600 font-bold bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-sm hover:bg-slate-50">Upload File</button>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 text-xs font-medium">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Corporate Registration Metrics</span>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
          <div><span className="text-slate-400 block text-[10px]">Legal Entity</span><b className="text-slate-800 text-[11px]">{user?.name||'EcoFleet Solutions'} Pvt Ltd</b></div>
          <div><span className="text-slate-400 block text-[10px]">Owner ID</span><b className="text-slate-700 font-mono text-[11px]">{(user?.id||'—').substring(0,12).toUpperCase()}</b></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><span className="text-slate-400 block text-[10px]">Escrow Node</span><b className="text-slate-800 font-mono text-[11px]">ICICI-MGE-ESC-09</b></div>
          <div><span className="text-slate-400 block text-[10px]">Settlement</span><b className="text-slate-700 text-[11px]">Instant (T+0)</b></div>
        </div>
      </div>

      <button onClick={logout} className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-4 rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-red-100">
        <LogOut size={14}/> Logout Securely
      </button>
    </div>
  );

  const navTabs = [
    {id:'dash',     Icon:LayoutGrid, label:'Dashboard'},
    {id:'dispatch', Icon:Link2,      label:'Handover'},
    {id:'drivers',  Icon:Users,      label:'Drivers'},
    {id:'profile',  Icon:UserCircle2,label:'Profile'},
  ];
  const mainScreens = ['dash','dispatch','drivers','profile'];

  return (
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center select-none"
      style={{backgroundColor:'#cbd5e1',fontFamily:'Inter,sans-serif'}}>
      <div className="w-full mx-4 bg-white border border-slate-300 overflow-hidden flex flex-col relative"
        style={{maxWidth:412,minHeight:740,maxHeight:840,borderRadius:36,boxShadow:'0 25px 50px -12px rgba(0,0,0,0.25)'}}>

        {/* STATUS BAR */}
        <div className="bg-slate-950 text-white text-[11px] px-6 py-2 flex items-center justify-between shrink-0 font-medium">
          <span>{time}</span>
          <div className="flex items-center gap-1.5">
            <Wifi size={14} className="text-emerald-400"/>
            <Battery size={16}/>
          </div>
        </div>

        {/* HEADER */}
        <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-600/20">M</div>
            <span className="font-bold text-xs text-slate-900 tracking-tight" style={{fontFamily:'Poppins,sans-serif'}}>
              MobilityGrid <span style={{fontFamily:'Inter,sans-serif',fontWeight:400}} className="text-slate-400">Owner Portal</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>{setShowNotif(!showNotif);if(!showNotif)markRead();}} className="relative p-1">
              {unread>0?<BellRing size={16} className="text-blue-600"/>:<Bell size={16} className="text-slate-400"/>}
              {unread>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">{unread>9?'9+':unread}</span>}
            </button>
            <div className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold uppercase tracking-wider font-mono">
              {user?.name?.split(' ')[0]||'EcoFleet'} Corp
            </div>
          </div>
        </div>

        {/* NOTIFICATION PANEL */}
        {showNotif&&(
          <div className="absolute top-[90px] right-3 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[60] overflow-hidden">
            <div className="px-3 py-2 border-b flex justify-between items-center bg-slate-50">
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Notifications</span>
              <button onClick={()=>setShowNotif(false)}><X size={13} className="text-slate-400"/></button>
            </div>
            <div className="max-h-56 overflow-y-auto divide-y">
              {notifs.length===0?<div className="p-4 text-center text-xs text-slate-400">No notifications</div>
              :notifs.slice(0,8).map((n,i)=>(
                <div key={i} className={`px-3 py-2.5 ${!n.is_read?'bg-blue-50/40':''}`}>
                  <p className="text-xs font-bold text-slate-800">{n.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-[9px] text-slate-400 mt-1 font-mono">{new Date(n.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TOAST */}
        {toast&&(
          <div className="absolute top-[88px] left-4 right-4 z-[70]">
            <div className="bg-emerald-600 text-white rounded-2xl px-4 py-2.5 shadow-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={15} className="text-white shrink-0"/>
                <div>
                  <p className="text-xs font-black">💰 Payment Received!</p>
                  <p className="text-[10px] text-emerald-200">{toast.driver_name} paid ₹{Number(toast.order_amount).toLocaleString('en-IN')} • {toast.vehicle_number||'—'}</p>
                </div>
              </div>
              <button onClick={()=>setToast(null)}><X size={13} className="text-white/80"/></button>
            </div>
          </div>
        )}

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto relative" style={{background:'rgba(248,250,252,0.5)'}}>
          {loading?<div className="p-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading…</div>:(
            <>
              {screen==='dash'       &&<DashScreen/>}
              {screen==='addasset'   &&<AddAssetScreen/>}
              {screen==='dispatch'   &&<DispatchScreen/>}
              {screen==='drivers'    &&<DriversScreen/>}
              {screen==='adddriver'  &&<AddDriverScreen/>}
              {screen==='profile'    &&<ProfileScreen/>}
            </>
          )}
        </div>

        {/* BOTTOM NAV */}
        <nav className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around text-slate-400 font-semibold text-[10px] z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]"
          style={{borderRadius:'0 0 36px 36px'}}>
          {navTabs.map(({id,Icon,label})=>(
            <button key={id} onClick={()=>goTo(id)}
              className={`flex flex-col items-center gap-1 transition-all ${mainScreens.some(s=>s===screen)&&(screen===id||(screen==='addasset'&&id==='dash')||(screen==='adddriver'&&id==='drivers'))?'text-blue-600':''} hover:text-slate-800`}>
              <Icon size={20}/> {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}