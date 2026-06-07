// frontend/src/pages/ManagerApp.jsx — Manager role dashboard
// Shows only tabs permitted by owner-assigned permissions
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, Users, CreditCard, Wallet, Truck, MessageCircle,
  ShieldAlert, LogOut, ChevronRight, X
} from 'lucide-react';

const API = 'https://mg-qw5s.onrender.com';

const token = () => localStorage.getItem('token') || '';
const getUser = () => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } };
const getPerms = () => {
  const u = getUser();
  if (typeof u.permissions === 'object' && u.permissions !== null) return u.permissions;
  try { return JSON.parse(u.permissions || '{}'); } catch { return {}; }
};

export default function ManagerApp() {
  const navigate = useNavigate();
  const user = getUser();
  const perms = getPerms();
  const ownerId = user.owner_id;

  const [tab, setTab] = useState('home');
  const [stats, setStats] = useState({ totalDrivers: 0, todayCollection: 0, pendingDues: 0, totalVehicles: 0 });
  const [drivers, setDrivers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [chats, setChats] = useState([]);
  const [chatDriver, setChatDriver] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatMsg, setChatMsg] = useState('');
  const [cashDriver, setCashDriver] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [cashNote, setCashNote] = useState('');
  const [loading, setLoading] = useState(true);

  const H = { Authorization: `Bearer ${token()}` };

  const fetchAll = useCallback(async () => {
    if (!ownerId) { navigate('/login'); return; }
    try {
      const [s, d, v] = await Promise.all([
        fetch(`${API}/api/payment/owner/stats?ownerId=${ownerId}`, { headers: H }).then(r => r.json()).catch(() => ({})),
        perms.view_drivers ? fetch(`${API}/api/payment/owner/drivers?ownerId=${ownerId}`, { headers: H }).then(r => r.json()).catch(() => []) : [],
        perms.assign_vehicle ? fetch(`${API}/api/payment/owner/vehicles?ownerId=${ownerId}`, { headers: H }).then(r => r.json()).catch(() => []) : [],
      ]);
      setStats({ totalDrivers: s.totalDrivers || 0, todayCollection: s.todayCollection || 0, pendingDues: s.pendingDues || 0, totalVehicles: s.totalVehicles || 0 });
      setDrivers(Array.isArray(d) ? d : d.drivers || []);
      setVehicles(Array.isArray(v) ? v : v.vehicles || []);

      if (perms.view_collections) {
        const tx = await fetch(`${API}/api/payment/owner/transactions?ownerId=${ownerId}`, { headers: H }).then(r => r.json()).catch(() => []);
        setTransactions(Array.isArray(tx) ? tx : []);
      }
      if (perms.sos_alerts) {
        const sos = await fetch(`${API}/api/payment/owner/sos-alerts?ownerId=${ownerId}`, { headers: H }).then(r => r.json()).catch(() => []);
        setSosAlerts(Array.isArray(sos) ? sos : sos.alerts || []);
      }
    } finally { setLoading(false); }
  }, [ownerId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const recordCash = async () => {
    if (!cashDriver || !cashAmount) return alert('Driver aur amount required');
    const d = drivers.find(x => x.full_name === cashDriver || x.mobile_number === cashDriver);
    if (!d) return alert('Driver nahi mila');
    const res = await fetch(`${API}/api/payment/owner/cash-payment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...H },
      body: JSON.stringify({ driverPhone: d.mobile_number, driverName: d.full_name, amount: parseFloat(cashAmount), ownerId, purpose: cashNote || 'RENT' })
    }).then(r => r.json());
    if (res.success) { alert('✅ Cash recorded!'); setCashDriver(''); setCashAmount(''); setCashNote(''); fetchAll(); }
    else alert('Error: ' + (res.error || res.message));
  };

  const openChat = async (d) => {
    setChatDriver(d);
    const msgs = await fetch(`${API}/api/payment/chat/messages?driverPhone=${d.mobile_number}&ownerId=${ownerId}`, { headers: H }).then(r => r.json()).catch(() => []);
    setChatMessages(Array.isArray(msgs) ? msgs : msgs.messages || []);
  };

  const sendChat = async () => {
    if (!chatMsg.trim() || !chatDriver) return;
    await fetch(`${API}/api/payment/chat/send`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...H },
      body: JSON.stringify({ driverPhone: chatDriver.mobile_number, message: chatMsg, senderType: 'OWNER', ownerId })
    });
    setChatMsg('');
    const msgs = await fetch(`${API}/api/payment/chat/messages?driverPhone=${chatDriver.mobile_number}&ownerId=${ownerId}`, { headers: H }).then(r => r.json()).catch(() => []);
    setChatMessages(Array.isArray(msgs) ? msgs : msgs.messages || []);
  };

  const dismissSOS = async (id) => {
    await fetch(`${API}/api/payment/owner/sos-dismiss/${id}`, { method: 'PUT', headers: H });
    setSosAlerts(p => p.filter(s => s.id !== id));
  };

  const logout = () => { localStorage.clear(); navigate('/login'); };

  // Nav tabs based on permissions
  const navItems = [
    { key: 'home', icon: <Home size={20} />, label: 'Home', always: true },
    { key: 'drivers', icon: <Users size={20} />, label: 'Drivers', perm: 'view_drivers' },
    { key: 'collections', icon: <CreditCard size={20} />, label: 'Collections', perm: 'view_collections' },
    { key: 'cash', icon: <Wallet size={20} />, label: 'Cash', perm: 'record_cash' },
    { key: 'vehicles', icon: <Truck size={20} />, label: 'Vehicles', perm: 'assign_vehicle' },
    { key: 'chat', icon: <MessageCircle size={20} />, label: 'Chat', perm: 'chat' },
    { key: 'sos', icon: <ShieldAlert size={20} />, label: 'SOS', perm: 'sos_alerts' },
  ].filter(n => n.always || perms[n.perm]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 max-w-[412px] mx-auto">
      {/* Header */}
      <div className="bg-indigo-700 text-white px-4 pt-10 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Manager</p>
            <p className="text-lg font-black">{user.full_name || 'Manager'}</p>
          </div>
          <button onClick={logout} className="p-2 rounded-xl bg-indigo-600 active:bg-indigo-800">
            <LogOut size={16}/>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 space-y-4">

        {/* HOME */}
        {tab === 'home' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Drivers', value: stats.totalDrivers, color: 'bg-blue-50 text-blue-700' },
                { label: "Today's Collection", value: `₹${(stats.todayCollection||0).toLocaleString('en-IN')}`, color: 'bg-emerald-50 text-emerald-700' },
                { label: 'Pending Dues', value: `₹${(stats.pendingDues||0).toLocaleString('en-IN')}`, color: 'bg-amber-50 text-amber-700' },
                { label: 'Total Vehicles', value: stats.totalVehicles, color: 'bg-purple-50 text-purple-700' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-2xl p-4 ${color}`}>
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-70">{label}</p>
                  <p className="text-2xl font-black mt-1">{value}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3">Your Permissions</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(perms).filter(([,v]) => v).map(([k]) => (
                  <span key={k} className="text-[10px] font-black px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 uppercase">{k.replace(/_/g,' ')}</span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* DRIVERS */}
        {tab === 'drivers' && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b bg-blue-50">
              <p className="text-[10px] font-black text-blue-700 uppercase">Drivers ({drivers.length})</p>
            </div>
            {drivers.length === 0 ? <p className="text-xs text-slate-400 text-center py-8">No drivers found</p> : (
              <div className="divide-y max-h-[70vh] overflow-y-auto">
                {drivers.map((d, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-800">{d.full_name}</p>
                      <p className="text-[10px] text-slate-400">{d.mobile_number}</p>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${d.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{d.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COLLECTIONS */}
        {tab === 'collections' && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b bg-emerald-50">
              <p className="text-[10px] font-black text-emerald-700 uppercase">Transactions</p>
            </div>
            {transactions.length === 0 ? <p className="text-xs text-slate-400 text-center py-8">No transactions</p> : (
              <div className="divide-y max-h-[70vh] overflow-y-auto">
                {transactions.map((tx, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-800">{tx.driver_name || tx.payer_mobile}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{new Date(tx.order_initiation_date).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800">₹{parseFloat(tx.order_amount).toLocaleString('en-IN')}</p>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${tx.transaction_status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : tx.payment_mode === 'CASH' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'}`}>
                        {tx.payment_mode === 'CASH' ? '💵 CASH' : tx.transaction_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RECORD CASH */}
        {tab === 'cash' && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Record Cash Payment</p>
            <select value={cashDriver} onChange={e => setCashDriver(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">Select Driver</option>
              {drivers.map((d, i) => <option key={i} value={d.full_name}>{d.full_name} — {d.mobile_number}</option>)}
            </select>
            <input type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)}
              placeholder="Amount (₹)" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
            <input type="text" value={cashNote} onChange={e => setCashNote(e.target.value)}
              placeholder="Note (optional)" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
            <button onClick={recordCash} className="w-full py-3 bg-emerald-600 text-white text-sm font-black rounded-xl active:bg-emerald-700">
              Record ₹{cashAmount || '0'}
            </button>
          </div>
        )}

        {/* VEHICLES */}
        {tab === 'vehicles' && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b bg-purple-50">
              <p className="text-[10px] font-black text-purple-700 uppercase">Vehicles ({vehicles.length})</p>
            </div>
            {vehicles.length === 0 ? <p className="text-xs text-slate-400 text-center py-8">No vehicles</p> : (
              <div className="divide-y max-h-[70vh] overflow-y-auto">
                {vehicles.map((v, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-800">{v.vehicle_number}</p>
                      <p className="text-[10px] text-slate-400">{v.model || v.vehicle_type}</p>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${v.operational_status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : v.operational_status === 'ASSIGNED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {v.operational_status || 'AVAILABLE'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHAT */}
        {tab === 'chat' && !chatDriver && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b bg-indigo-50">
              <p className="text-[10px] font-black text-indigo-700 uppercase">Chat — Select Driver</p>
            </div>
            {drivers.length === 0 ? <p className="text-xs text-slate-400 text-center py-8">No drivers</p> : (
              <div className="divide-y">
                {drivers.map((d, i) => (
                  <button key={i} onClick={() => openChat(d)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100">
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-800">{d.full_name}</p>
                      <p className="text-[10px] text-slate-400">{d.mobile_number}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300"/>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'chat' && chatDriver && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col" style={{ height: '70vh' }}>
            <div className="px-4 py-3 border-b bg-indigo-50 flex items-center justify-between">
              <p className="text-xs font-black text-indigo-700">{chatDriver.full_name}</p>
              <button onClick={() => setChatDriver(null)} className="text-slate-400"><X size={16}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.sender_type === 'OWNER' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs ${m.sender_type === 'OWNER' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                    {m.message}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-3 flex gap-2">
              <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Type message…" className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none"/>
              <button onClick={sendChat} className="px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl">Send</button>
            </div>
          </div>
        )}

        {/* SOS */}
        {tab === 'sos' && (
          <div className="space-y-3">
            {sosAlerts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                <ShieldAlert size={32} className="mx-auto text-slate-200 mb-2"/>
                <p className="text-xs text-slate-400">No active SOS alerts</p>
              </div>
            ) : sosAlerts.map((s, i) => (
              <div key={i} className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-black text-red-700">🚨 {s.driver_name || s.driver_id}</p>
                  <button onClick={() => dismissSOS(s.id)} className="text-[10px] font-black text-red-500 underline">Dismiss</button>
                </div>
                <p className="text-[10px] text-red-500">{s.latitude && s.longitude ? `📍 ${s.latitude}, ${s.longitude}` : 'Location unavailable'}</p>
                <p className="text-[10px] text-red-400 mt-1">{new Date(s.created_at).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[412px] mx-auto bg-white border-t border-slate-100 px-2 py-2 flex justify-around">
        {navItems.map(n => (
          <button key={n.key} onClick={() => { setTab(n.key); if (n.key !== 'chat') setChatDriver(null); }}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${tab === n.key ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>
            {n.icon}
            <span className="text-[9px] font-black">{n.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
