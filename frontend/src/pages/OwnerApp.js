// frontend/src/pages/OwnerApp.js
// FIXED: 4 tabs (Home, Vehicle, Driver, Account)
//        Notification bell with real data
//        Vehicle tab with driver dropdown on add
//        Owner ID shown in Account
//        Logout button
//        Recent payment feed in Home (driver name + vehicle + amount)
import React, { useState, useEffect, useCallback } from 'react';
import {
  Wifi, Battery, Bell, BellRing, Home, Car, Users, User,
  Plus, X, CheckCircle, Clock, LogOut, Shield, Copy,
  ChevronRight, Truck, TrendingUp, AlertTriangle, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = 'https://mg-qw5s.onrender.com';

export default function OwnerApp() {
  const navigate    = useNavigate();
  const [tab, setTab]       = useState('home');
  const [user, setUser]     = useState(null);
  const [time, setTime]     = useState('');
  const [loading, setLoading] = useState(true);

  // ── Data ──
  const [stats, setStats]               = useState({ total_vehicles: 0, total_drivers: 0, total_earnings: 0, paid_today: 0 });
  const [vehicles, setVehicles]         = useState([]);
  const [drivers, setDrivers]           = useState([]);
  const [recentPayments, setRecentPay]  = useState([]);
  const [notifications, setNotifs]      = useState([]);
  const [unread, setUnread]             = useState(0);

  // ── UI toggles ──
  const [showNotif,     setShowNotif]     = useState(false);
  const [showAddVeh,    setShowAddVeh]    = useState(false);
  const [showAddDrv,    setShowAddDrv]    = useState(false);
  const [submitting,    setSubmitting]    = useState(false);

  // ── Forms ──
  const [newVeh, setNewVeh] = useState({ number: '', model: '', rent: '', driverId: '' });
  const [newDrv, setNewDrv] = useState({ name: '', phone: '' });

  // ── Init ──
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(u);
    if (!u?.id) setLoading(false);
  }, []);

  // ── Clock ──
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      let h = now.getHours(), m = String(now.getMinutes()).padStart(2, '0');
      const ap = h >= 12 ? 'PM' : 'AM';
      setTime(`${h % 12 || 12}:${m} ${ap}`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const tk      = () => localStorage.getItem('token');
  const ownerId = user?.id || '1';

  // ── Fetch all data ──
  const fetchAll = useCallback(async () => {
    if (!user?.id) return;
    try {
      const headers = { Authorization: `Bearer ${tk()}` };
      const [sR, vR, dR, nR, pR] = await Promise.all([
        fetch(`${API}/api/payment/owner/stats?ownerId=${ownerId}`,          { headers }),
        fetch(`${API}/api/payment/owner/vehicles?ownerId=${ownerId}`,       { headers }),
        fetch(`${API}/api/payment/owner/drivers/list?ownerId=${ownerId}`,   { headers }),
        fetch(`${API}/api/payment/owner/notifications?ownerId=${ownerId}`,  { headers }),
        fetch(`${API}/api/payment/owner/recent-payments?ownerId=${ownerId}`, { headers }),
      ]);
      if (sR.ok) setStats(await sR.json());
      if (vR.ok) setVehicles(await vR.json());
      if (dR.ok) { const d = await dR.json(); setDrivers(d.drivers || []); }
      if (nR.ok) {
        const n = await nR.json();
        setNotifs(Array.isArray(n) ? n : []);
        setUnread((Array.isArray(n) ? n : []).filter(x => !x.is_read).length);
      }
      if (pR.ok) setRecentPay(await pR.json());
    } catch (e) {
      console.error('fetchAll:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Mark notifications read ──
  const markRead = async () => {
    setUnread(0);
    setNotifs(p => p.map(n => ({ ...n, is_read: true })));
    try {
      await fetch(`${API}/api/payment/notifications/mark-read?userId=${ownerId}`,
        { method: 'PUT', headers: { Authorization: `Bearer ${tk()}` } });
    } catch (_) {}
  };

  // ── Add Vehicle ──
  const handleAddVehicle = async () => {
    if (!newVeh.number || !newVeh.model || !newVeh.rent)
      return alert('Please fill Vehicle Number, Model and Daily Rent');
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/payment/owner/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({
          owner_id:       ownerId,
          vehicle_number: newVeh.number.toUpperCase(),
          vehicle_model:  newVeh.model,
          daily_rent:     parseFloat(newVeh.rent),
          driver_id:      newVeh.driverId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      alert('✅ Vehicle added!');
      setShowAddVeh(false);
      setNewVeh({ number: '', model: '', rent: '', driverId: '' });
      fetchAll();
    } catch (e) {
      alert('❌ ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Add Driver ──
  const handleAddDriver = async () => {
    if (!newDrv.name) return alert('Enter driver name');
    if (!/^\d{10}$/.test(newDrv.phone)) return alert('Enter valid 10-digit phone number');
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/payment/owner/add-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ full_name: newDrv.name, mobile_number: newDrv.phone, owner_id: ownerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      alert('✅ Driver added! Login: ' + newDrv.phone);
      setShowAddDrv(false);
      setNewDrv({ name: '', phone: '' });
      fetchAll();
    } catch (e) {
      alert('❌ ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const logout = () => { localStorage.clear(); navigate('/login'); };

  // ════════════════════════════════════════════════
  // HOME TAB
  // ════════════════════════════════════════════════
  const HomeTab = () => (
    <div className="space-y-4">

      {/* Earnings Hero */}
      <div className="bg-gradient-to-br from-blue-700 to-indigo-900 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full" />
        <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest block">
          Today's Fleet Collections
        </span>
        <h2 className="text-4xl font-black mt-1 tracking-tight">
          ₹{Number(stats.total_earnings || 0).toLocaleString('en-IN')}
        </h2>
        <p className="text-xs text-blue-300 mt-2">
          {stats.paid_today || 0} driver{stats.paid_today !== 1 ? 's' : ''} paid today
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Vehicles', value: stats.total_vehicles || 0, color: 'text-blue-600' },
          { label: 'Drivers',  value: stats.total_drivers  || 0, color: 'text-indigo-600' },
          { label: 'Paid Today', value: stats.paid_today  || 0, color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 text-center">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Live payment feed */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Live Payment Feed</h3>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <button onClick={fetchAll} className="text-slate-400 hover:text-blue-600"><RefreshCw size={12} /></button>
          </div>
        </div>
        <div className="divide-y max-h-72 overflow-y-auto">
          {recentPayments.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">No payments today yet</div>
          ) : recentPayments.map((p, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${p.transaction_status === 'SUCCESS' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                  {p.transaction_status === 'SUCCESS'
                    ? <CheckCircle size={16} className="text-emerald-600" />
                    : <Clock size={16} className="text-amber-600" />}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800">{p.driver_name || 'Driver'}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {p.vehicle_number || '—'} •{' '}
                    {new Date(p.order_initiation_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <span className={`text-sm font-black ${p.transaction_status === 'SUCCESS' ? 'text-emerald-600' : 'text-amber-500'}`}>
                +₹{Number(p.order_amount).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════
  // VEHICLE TAB
  // ════════════════════════════════════════════════
  const VehicleTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide">My Fleet</h3>
        <button
          onClick={() => setShowAddVeh(true)}
          className="flex items-center gap-1 bg-blue-600 text-white text-[10px] font-black px-3 py-2 rounded-xl shadow-sm uppercase tracking-wider"
        >
          <Plus size={12} /> Add Vehicle
        </button>
      </div>

      {vehicles.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-slate-200">
          <Car size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400">No vehicles added yet</p>
          <button onClick={() => setShowAddVeh(true)} className="mt-4 text-xs text-blue-600 font-black">+ Add your first vehicle</button>
        </div>
      ) : vehicles.map((v, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${v.status === 'ASSIGNED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {v.status || 'AVAILABLE'}
              </span>
              <h4 className="font-black text-slate-800 mt-1 font-mono tracking-wide">{v.vehicle_number}</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">{v.vehicle_model}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-blue-600">₹{v.daily_rent}/day</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-3 mt-2 border-t border-dashed border-slate-100">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black ${v.driver_name ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              {v.driver_name ? v.driver_name.charAt(0).toUpperCase() : '?'}
            </div>
            <span className="text-[10px] font-bold text-slate-600">
              {v.driver_name || 'No driver assigned'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  // ════════════════════════════════════════════════
  // DRIVER TAB
  // ════════════════════════════════════════════════
  const DriverTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide">My Drivers</h3>
        <button
          onClick={() => setShowAddDrv(true)}
          className="flex items-center gap-1 bg-blue-600 text-white text-[10px] font-black px-3 py-2 rounded-xl shadow-sm uppercase tracking-wider"
        >
          <Plus size={12} /> Add Driver
        </button>
      </div>

      {drivers.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-slate-200">
          <Users size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400">No drivers added yet</p>
          <button onClick={() => setShowAddDrv(true)} className="mt-4 text-xs text-blue-600 font-black">+ Add your first driver</button>
        </div>
      ) : drivers.map((d, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center font-black text-white text-lg shadow-md shadow-blue-500/20">
            {d.full_name?.charAt(0).toUpperCase() || 'D'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-800 text-sm truncate">{d.full_name}</p>
            <p className="text-[10px] text-slate-400 font-mono">{d.phone_number}</p>
            <p className="text-[9px] font-black text-blue-500 font-mono mt-0.5">{d.driver_code}</p>
          </div>
          <div className="text-right shrink-0">
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${d.assigned_vehicle && d.assigned_vehicle !== 'Not Assigned' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {d.assigned_vehicle && d.assigned_vehicle !== 'Not Assigned' ? d.assigned_vehicle : 'Unassigned'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  // ════════════════════════════════════════════════
  // ACCOUNT TAB
  // ════════════════════════════════════════════════
  const AccountTab = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-950 rounded-3xl p-6 text-white text-center shadow-xl relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/5 rounded-full" />
        <div className="w-20 h-20 bg-blue-600/30 rounded-full flex items-center justify-center text-3xl font-black mx-auto border-2 border-white/10 shadow-inner">
          {user?.name?.charAt(0)?.toUpperCase() || 'O'}
        </div>
        <h2 className="text-xl font-black mt-3">{user?.name || user?.phone || 'Fleet Owner'}</h2>
        <p className="text-slate-400 text-xs mt-1 font-mono tracking-widest">{user?.phone}</p>
        <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase mt-3">
          <Shield size={10} /> Verified Owner
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y text-xs">
        <div className="flex justify-between items-center px-4 py-3">
          <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Owner ID</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-slate-800 text-[11px]">
              {(user?.id || 'N/A').substring(0, 16)}…
            </span>
            <button onClick={() => { navigator.clipboard.writeText(user?.id || ''); alert('Copied!'); }}>
              <Copy size={12} className="text-blue-500" />
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center px-4 py-3">
          <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Vehicles</span>
          <span className="font-black text-slate-800">{stats.total_vehicles}</span>
        </div>
        <div className="flex justify-between items-center px-4 py-3">
          <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Drivers</span>
          <span className="font-black text-slate-800">{stats.total_drivers}</span>
        </div>
        <div className="flex justify-between items-center px-4 py-3">
          <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Account Status</span>
          <span className="font-black text-emerald-600 uppercase text-[10px]">Active</span>
        </div>
      </div>

      <button
        onClick={logout}
        className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 border border-red-100"
      >
        <LogOut size={14} /> Logout Securely
      </button>
    </div>
  );

  // ════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════
  return (
    <div className="h-[100dvh] w-full bg-slate-200 flex justify-center overflow-hidden font-sans">
      <div className="w-full max-w-[412px] bg-slate-50 h-full flex flex-col shadow-2xl relative overflow-hidden">

        {/* STATUS BAR */}
        <div className="bg-slate-950 text-white text-[11px] px-5 py-2 flex justify-between items-center shrink-0 z-50">
          <span className="font-black text-blue-400 tracking-widest text-[10px]">OWNER PORTAL</span>
          <span className="font-medium">{time}</span>
          <div className="flex gap-1.5"><Wifi size={11} className="text-blue-400" /><Battery size={11} /></div>
        </div>

        {/* HEADER */}
        <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 shadow-sm z-40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-600/20">MG</div>
            <div>
              <span className="font-black text-slate-800 text-sm tracking-tight block">MobilityGrid</span>
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest -mt-0.5 block">
                {tab === 'home' ? 'Dashboard' : tab === 'vehicle' ? 'My Fleet' : tab === 'drivers' ? 'My Drivers' : 'Account'}
              </span>
            </div>
          </div>

          {/* Notification Bell */}
          <button
            onClick={() => { setShowNotif(!showNotif); if (!showNotif) markRead(); }}
            className="relative p-2 rounded-xl bg-slate-100 hover:bg-blue-50 transition"
          >
            {unread > 0 ? <BellRing size={18} className="text-blue-600" /> : <Bell size={18} className="text-slate-600" />}
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>

        {/* NOTIFICATION DROPDOWN */}
        {showNotif && (
          <div className="absolute top-[108px] right-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[60] overflow-hidden">
            <div className="px-4 py-2.5 border-b flex justify-between items-center bg-slate-50">
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Notifications</span>
              <button onClick={() => setShowNotif(false)}><X size={14} className="text-slate-400" /></button>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No notifications yet</div>
              ) : notifications.slice(0, 12).map((n, i) => (
                <div key={i} className={`px-4 py-3 ${!n.is_read ? 'bg-blue-50/40' : ''}`}>
                  <p className="text-xs font-black text-slate-800">{n.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-[9px] text-slate-400 mt-1 font-mono">
                    {new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 bg-slate-50">
          {loading ? (
            <div className="text-center py-16 text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">
              Loading Dashboard…
            </div>
          ) : (
            <>
              {tab === 'home'    && <HomeTab    />}
              {tab === 'vehicle' && <VehicleTab />}
              {tab === 'drivers' && <DriverTab  />}
              {tab === 'account' && <AccountTab />}
            </>
          )}
        </div>

        {/* BOTTOM NAV — 4 TABS */}
        <div className="shrink-0 h-16 bg-white border-t border-slate-200 flex justify-around items-center z-50 shadow-[0_-4px_15px_rgba(0,0,0,0.04)]">
          {[
            { id: 'home',    Icon: Home,  label: 'HOME'    },
            { id: 'vehicle', Icon: Car,   label: 'VEHICLE' },
            { id: 'drivers', Icon: Users, label: 'DRIVER'  },
            { id: 'account', Icon: User,  label: 'ACCOUNT' },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-1 transition-all px-3 ${tab === id ? 'text-blue-600 -translate-y-0.5' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Icon size={tab === id ? 22 : 20} />
              <span className="text-[9px] font-black tracking-wide">{label}</span>
            </button>
          ))}
        </div>

        {/* ── ADD VEHICLE MODAL ── */}
        {showAddVeh && (
          <div className="absolute inset-0 bg-slate-900/50 z-[100] flex items-end backdrop-blur-sm">
            <div className="bg-white rounded-t-3xl w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-black text-slate-800">Add New Vehicle</h3>
                <button onClick={() => setShowAddVeh(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Vehicle Number *</label>
                  <input
                    value={newVeh.number}
                    onChange={e => setNewVeh({ ...newVeh, number: e.target.value.toUpperCase() })}
                    placeholder="e.g. MH12AB1234"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black font-mono uppercase tracking-widest focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Vehicle Model *</label>
                  <input
                    value={newVeh.model}
                    onChange={e => setNewVeh({ ...newVeh, model: e.target.value })}
                    placeholder="e.g. Tata Ace EV"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Daily Rent (₹) *</label>
                  <input
                    type="number"
                    value={newVeh.rent}
                    onChange={e => setNewVeh({ ...newVeh, rent: e.target.value })}
                    placeholder="e.g. 850"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black font-mono focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Assign Driver (optional)</label>
                  <select
                    value={newVeh.driverId}
                    onChange={e => setNewVeh({ ...newVeh, driverId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">— No Driver —</option>
                    {drivers
                      .filter(d => !d.assigned_vehicle || d.assigned_vehicle === 'Not Assigned')
                      .map((d, i) => (
                        <option key={i} value={d.id}>{d.full_name} ({d.phone_number})</option>
                      ))}
                  </select>
                  {drivers.filter(d => !d.assigned_vehicle || d.assigned_vehicle === 'Not Assigned').length === 0 && (
                    <p className="text-[10px] text-amber-600 font-bold mt-1 ml-1">⚠ All drivers are already assigned. Add a new driver first.</p>
                  )}
                </div>
                <button
                  onClick={handleAddVehicle}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 mt-2 disabled:opacity-60 transition-all active:scale-95"
                >
                  {submitting ? 'ADDING VEHICLE…' : 'CONFIRM & ADD VEHICLE'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ADD DRIVER MODAL ── */}
        {showAddDrv && (
          <div className="absolute inset-0 bg-slate-900/50 z-[100] flex items-end backdrop-blur-sm">
            <div className="bg-white rounded-t-3xl w-full p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-black text-slate-800">Add New Driver</h3>
                <button onClick={() => setShowAddDrv(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Full Name (letters only)</label>
                  <input
                    value={newDrv.name}
                    onChange={e => setNewDrv({ ...newDrv, name: e.target.value.replace(/[^a-zA-Z\s.]/g, '') })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Mobile Number</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={newDrv.phone}
                    onChange={e => setNewDrv({ ...newDrv, phone: e.target.value.replace(/\D/g, '') })}
                    placeholder="9876543210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black font-mono tracking-widest focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 ml-1">Driver's default password = their mobile number</p>
                </div>
                <button
                  onClick={handleAddDriver}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 mt-2 disabled:opacity-60 transition-all active:scale-95"
                >
                  {submitting ? 'ADDING DRIVER…' : 'CONFIRM & ADD DRIVER'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}