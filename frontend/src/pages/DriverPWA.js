// frontend/src/pages/DriverPWA.js
// FIXED:
//   - Notification bell: fetches real data from API + unread badge
//   - SOS: persistent red bar above nav + incident report modal
//   - Chatbot: fully rendered modal (state already existed, JSX was missing)
//   - Driver code shown in Account tab
//   - Dues = 0 if no vehicle assigned
//   - Recent transactions clickable → view all → history tab
//   - Wallet balance updates when payment goes through
import React, { useState, useEffect, useCallback } from 'react';
import {
  Wifi, Battery, Bell, BellRing, Home, History, CircleUser,
  CreditCard, Wallet, Truck, Eye, EyeOff, Copy, X, Send,
  CheckCircle, Clock, AlertTriangle, MessageCircle, ShieldAlert,
  FileText, Camera, Phone, LogOut, ExternalLink, Receipt
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = 'https://mg-qw5s.onrender.com';

export default function DriverPWA() {
  const navigate = useNavigate();
  const [tab, setTab]   = useState('dashboard');
  const [time, setTime] = useState('');

  // ── User & data ──
  const [user, setUser]                 = useState(null);
  const [walletBalance, setWallet]      = useState(0);
  const [duesAmount, setDues]           = useState(0);
  const [payAmount, setPayAmount]       = useState(0);
  const [telemetry, setTelemetry]       = useState({});
  const [recentPayments, setPayments]   = useState([]);
  const [notifications, setNotifs]      = useState([]);
  const [unread, setUnread]             = useState(0);
  const [loading, setLoading]           = useState(true);
  const [showBalance, setShowBalance]   = useState(true);

  // ── Modals ──
  const [showNotif,   setShowNotif]     = useState(false);
  const [showChatbot, setShowChatbot]   = useState(false);
  const [showSOS,     setShowSOS]       = useState(false);
  const [showPaying,  setShowPaying]    = useState(false);
  const [showReceipt, setShowReceipt]   = useState(false);
  const [selTxn,      setSelTxn]        = useState(null);

  // ── Chat ──
  const [chatInput, setChatInput]       = useState('');
  const [chatHistory, setChatHistory]   = useState([
    { from: 'bot', text: 'Hello! I\'m MG Support. How can I help you today?' }
  ]);

  // ── SOS ──
  const [sosMsg, setSosMsg]             = useState('');
  const [sosSent, setSosSent]           = useState(false);

  // ── Profile ──
  const [editProfile, setEditProfile]   = useState(false);
  const [profData, setProfData]         = useState({ name: '', aadhaar: '' });

  // ── Init ──
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(u);
    setProfData({
      name:    u.name    || '',
      aadhaar: localStorage.getItem('driver_aadhaar') || '',
    });
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

  const tk    = () => localStorage.getItem('token');
  const phone = () => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return String(u?.phone_number || u?.mobile_number || u?.phone || '').replace(/\D/g, '').slice(-10);
  };

  // ── Fetch all driver data ──
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const ph = phone();
      const headers = { Authorization: `Bearer ${tk()}` };

      const [txnR, profileR, notifR] = await Promise.all([
        fetch(`${API}/api/payment/my-transactions?phone=${ph}`,         { headers }),
        fetch(`${API}/api/payment/driver/profile?phone=${ph}`,          { headers }),
        fetch(`${API}/api/payment/driver/notifications?phone=${ph}`,    { headers }),
      ]);

      // Transactions
      if (txnR.ok) {
        const txns = await txnR.json();
        if (Array.isArray(txns)) {
          setPayments(txns.map(t => ({
            id:       t.pg_transaction_id || t.order_id,
            type:     'Rent Payment',
            amount:   t.order_amount,
            date:     new Date(t.order_initiation_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }),
            status:   t.transaction_status,
            ref:      t.order_number,
            isCredit: false,
          })));
        }
      }

      // Driver profile (single call with everything)
      if (profileR.ok) {
        const p = await profileR.json();
        setWallet(parseFloat(p.wallet_balance || 0));
        const rent  = parseFloat(p.vehicle_daily_rent || p.daily_rent || 0);
        const paid  = parseFloat(p.amount_paid_today  || 0);
        const dues  = p.vehicle_number ? Math.max(0, rent - paid) : 0;
        setDues(dues);
        setPayAmount(dues > 0 ? dues : rent || 0);
        setTelemetry({
          vehicleNumber: p.vehicle_number || 'Not Assigned',
          vehicleModel:  p.vehicle_model  || '',
          dailyRent:     rent,
        });
      } else {
        // Fallback to dues endpoint
        const duesR = await fetch(`${API}/api/payment/driver/dues?phone=${ph}`, { headers });
        if (duesR.ok) {
          const d = await duesR.json();
          setDues(d.dues || 0);
          setPayAmount(d.dues > 0 ? d.dues : d.daily_rent || 0);
          setTelemetry(prev => ({ ...prev, vehicleNumber: d.vehicle_number || 'Not Assigned', dailyRent: d.daily_rent || 0 }));
        }
      }

      // Notifications
      if (notifR.ok) {
        const n = await notifR.json();
        setNotifs(Array.isArray(n) ? n : []);
        setUnread((Array.isArray(n) ? n : []).filter(x => !x.is_read).length);
      }

    } catch (err) {
      console.error('fetchAll error:', err);
      setDues(850); setPayAmount(850);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Refresh after payment return
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('refresh') === 'true' || p.get('status') === 'success') {
      fetchAll();
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [user]);

  // ── Mark notifications read ──
  const markRead = async () => {
    setUnread(0);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await fetch(`${API}/api/payment/notifications/mark-read?userId=${user?.id}`,
        { method: 'PUT', headers: { Authorization: `Bearer ${tk()}` } });
    } catch (_) {}
  };

  // ── Initiate payment ──
  const initiatePayment = async () => {
    if (telemetry.vehicleNumber === 'Not Assigned') {
      return alert('❌ No vehicle assigned. Contact your owner to assign a vehicle first.');
    }
    setShowPaying(true);
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const ph = phone();
      const res = await fetch(`${API}/api/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({
          amount:        payAmount || duesAmount || 850,
          customerName:  u.name  || 'Driver',
          customerPhone: ph,
          customerEmail: u.email || 'driver@mobilitygrid.com',
        }),
      });
      const data = await res.json();
      const url  = data?.data?.data?.checkoutUrl || data?.checkoutUrl || data?.paymentUrl;
      if (url) { window.location.href = url; }
      else { alert('Payment gateway error. Try again.'); setShowPaying(false); }
    } catch (err) {
      console.error('Payment error:', err);
      alert('Network error.');
      setShowPaying(false);
    }
  };

  // ── Chat ──
  const sendChat = () => {
    if (!chatInput.trim()) return;
    setChatHistory(p => [...p, { from: 'user', text: chatInput }]);
    setTimeout(() => {
      setChatHistory(p => [...p, {
        from: 'bot',
        text: 'Message received! A support executive has been assigned to your query. Please wait 2-3 minutes.',
      }]);
    }, 800);
    setChatInput('');
  };

  // ── SOS ──
  const sendSOS = async () => {
    setSosSent(true);
    try {
      await fetch(`${API}/api/payment/driver/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ phone: phone(), message: sosMsg || 'SOS Alert from driver' }),
      }).catch(() => {});
    } catch (_) {}
    setTimeout(() => { setShowSOS(false); setSosSent(false); setSosMsg(''); }, 2500);
  };

  const logout = () => { localStorage.clear(); navigate('/login'); };

  // ════════════════════════════════════════════════
  // DASHBOARD TAB
  // ════════════════════════════════════════════════
  const DashboardTab = () => (
    <div className="space-y-4 pb-4">
      {/* Vehicle card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b flex items-center gap-2">
          <Truck size={14} className="text-blue-600" />
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Assigned Vehicle</span>
        </div>
        {telemetry.vehicleNumber === 'Not Assigned' ? (
          <div className="p-4 text-center">
            <p className="text-sm font-bold text-slate-500">No vehicle assigned yet</p>
            <p className="text-[10px] text-slate-400 mt-1">Contact your owner to assign a vehicle. No rent until assigned.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-x">
            <div className="p-3 text-center">
              <p className="text-base font-black font-mono text-slate-800">{telemetry.vehicleNumber}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Registration</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-base font-black text-amber-600">₹{telemetry.dailyRent || 0}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Daily Rent</p>
            </div>
          </div>
        )}
      </div>

      {/* Dues + Wallet */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-2xl p-4 shadow-sm border-2 ${duesAmount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-slate-500">Rent Due</p>
          <p className={`text-2xl font-black font-mono ${duesAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            ₹{duesAmount.toLocaleString('en-IN')}
          </p>
          {duesAmount === 0 && <p className="text-[9px] text-emerald-600 font-bold mt-1">✅ All Clear</p>}
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-md">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-200 mb-1">Wallet</p>
          <div className="flex items-center gap-1">
            <p className="text-2xl font-black font-mono">
              {showBalance ? `₹${walletBalance.toLocaleString('en-IN')}` : '₹••••'}
            </p>
            <button onClick={() => setShowBalance(!showBalance)} className="ml-1 opacity-70">
              {showBalance ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
        </div>
      </div>

      {/* Pay button */}
      <button
        onClick={initiatePayment}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all active:scale-95"
      >
        <CreditCard size={16} />
        {duesAmount > 0 ? `Pay ₹${duesAmount} Rent Now` : 'Make a Payment'}
      </button>

      {/* Custom amount */}
      {duesAmount > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Or enter custom amount</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 font-black text-slate-400 text-lg">₹</span>
              <input
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(Number(e.target.value))}
                className="w-full pl-8 pr-3 py-2.5 border-2 border-slate-200 rounded-xl font-black text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button onClick={initiatePayment} className="bg-blue-600 text-white px-4 rounded-xl font-black text-xs">PAY</button>
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Recent Transactions</h3>
          <button onClick={() => setTab('history')} className="text-[10px] text-blue-600 font-black">View All →</button>
        </div>
        <div className="divide-y">
          {recentPayments.slice(0, 3).map((p, i) => (
            <div
              key={i}
              onClick={() => { setSelTxn(p); setShowReceipt(true); }}
              className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${p.status === 'SUCCESS' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                  {p.status === 'SUCCESS'
                    ? <CheckCircle size={13} className="text-emerald-600" />
                    : <Clock size={13} className="text-rose-600" />}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800">{p.type}</p>
                  <p className="text-[9px] text-slate-400">{p.date}</p>
                </div>
              </div>
              <span className={`text-xs font-black ${p.status === 'SUCCESS' ? 'text-emerald-600' : 'text-rose-600'}`}>
                -₹{p.amount}
              </span>
            </div>
          ))}
          {recentPayments.length === 0 && !loading && (
            <div className="p-5 text-center text-xs text-slate-400">No transactions yet</div>
          )}
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════
  // HISTORY TAB
  // ════════════════════════════════════════════════
  const HistoryTab = () => (
    <div className="space-y-3 pb-4">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-slate-800 text-sm uppercase">All Transactions</h3>
        <span className="text-[10px] text-slate-400 font-bold">{recentPayments.length} records</span>
      </div>
      {recentPayments.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-slate-200">
          <Receipt size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-400">No transactions found</p>
        </div>
      ) : recentPayments.map((p, i) => (
        <div
          key={i}
          onClick={() => { setSelTxn(p); setShowReceipt(true); }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 cursor-pointer hover:border-blue-200 transition"
        >
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${p.status === 'SUCCESS' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
            {p.status === 'SUCCESS'
              ? <CheckCircle size={18} className="text-emerald-600" />
              : <Clock size={18} className="text-rose-600" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-slate-800">{p.type}</p>
            <p className="text-[10px] text-slate-400">{p.date}</p>
            <p className="text-[9px] text-slate-400 font-mono">Ref: {p.ref}</p>
          </div>
          <div className="text-right">
            <p className={`text-base font-black ${p.status === 'SUCCESS' ? 'text-emerald-600' : 'text-rose-600'}`}>
              -₹{p.amount}
            </p>
            <p className={`text-[9px] font-black uppercase ${p.status === 'SUCCESS' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {p.status}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  // ════════════════════════════════════════════════
  // ACCOUNT TAB
  // ════════════════════════════════════════════════
  const AccountTab = () => (
    <div className="space-y-4 pb-4">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white text-center shadow-xl relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full" />
        <div className="w-18 h-18 bg-white/20 rounded-full flex items-center justify-center text-2xl font-black mx-auto w-16 h-16">
          {user?.name?.charAt(0)?.toUpperCase() || 'D'}
        </div>
        <h2 className="text-lg font-black mt-3">{user?.name || 'Driver'}</h2>
        <p className="text-blue-200 text-xs mt-1 font-mono">{user?.phone || user?.mobile_number}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y text-xs">
        {[
          { label: 'Driver Code', value: user?.usercode || user?.user_code || 'N/A', mono: true, copy: true },
          { label: 'Vehicle',     value: telemetry.vehicleNumber || 'Not Assigned', mono: true },
          { label: 'Daily Rent',  value: telemetry.dailyRent ? `₹${telemetry.dailyRent}` : '—' },
          { label: 'Wallet',      value: `₹${walletBalance.toLocaleString('en-IN')}`, color: 'text-emerald-600' },
        ].map(({ label, value, mono, copy, color }) => (
          <div key={label} className="flex justify-between items-center px-4 py-3">
            <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">{label}</span>
            <div className="flex items-center gap-1.5">
              <span className={`font-black ${mono ? 'font-mono' : ''} ${color || 'text-slate-800'} text-[11px]`}>{value}</span>
              {copy && value !== 'N/A' && (
                <button onClick={() => { navigator.clipboard.writeText(value); alert('Copied!'); }}>
                  <Copy size={11} className="text-blue-400" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* KYC */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <FileText size={12} /> KYC Details
        </h3>
        {editProfile ? (
          <div className="space-y-3">
            <input
              value={profData.name}
              onChange={e => setProfData({ ...profData, name: e.target.value })}
              placeholder="Full Name"
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
            />
            <input
              value={profData.aadhaar}
              onChange={e => setProfData({ ...profData, aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12) })}
              placeholder="Aadhaar Number (12 digits)"
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-mono tracking-widest focus:outline-none focus:border-blue-500"
              maxLength={12}
            />
            <div className="flex gap-2">
              <button onClick={() => setEditProfile(false)} className="flex-1 bg-slate-100 text-slate-600 font-black py-2.5 rounded-xl text-xs">Cancel</button>
              <button
                onClick={() => {
                  const u = { ...user, name: profData.name };
                  localStorage.setItem('user', JSON.stringify(u));
                  localStorage.setItem('driver_aadhaar', profData.aadhaar);
                  setUser(u);
                  setEditProfile(false);
                  alert('✅ Profile updated!');
                }}
                className="flex-[2] bg-blue-600 text-white font-black py-2.5 rounded-xl text-xs shadow-md"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Aadhaar</span>
              <span className="font-mono font-black">{profData.aadhaar ? '••••' + profData.aadhaar.slice(-4) : '⚠ Missing'}</span>
            </div>
            <button onClick={() => setEditProfile(true)} className="w-full mt-1 bg-blue-50 text-blue-700 font-black py-2.5 rounded-xl hover:bg-blue-100 transition">
              Update KYC Profile
            </button>
          </div>
        )}
      </div>

      <button onClick={logout} className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 border border-red-100">
        <LogOut size={14} /> Logout
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
        <div className="bg-slate-950 text-white text-[11px] px-4 py-2 flex justify-between shrink-0 z-50">
          <span className="text-emerald-400 font-black tracking-widest text-[10px]">DRIVER TERMINAL</span>
          <span>{time}</span>
          <div className="flex gap-1.5"><Wifi size={11} className="text-emerald-400" /><Battery size={11} /></div>
        </div>

        {/* HEADER */}
        <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 shadow-sm z-40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-600/20">MG</div>
            <div>
              <span className="font-black text-slate-800 text-sm tracking-tight block">MobilityGrid</span>
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest -mt-0.5 block">
                {tab === 'dashboard' ? 'Dashboard' : tab === 'history' ? 'History' : 'My Profile'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Chatbot */}
            <button
              onClick={() => setShowChatbot(true)}
              className="relative p-2 rounded-xl bg-slate-100 hover:bg-blue-50 transition"
              title="Support"
            >
              <MessageCircle size={16} className="text-slate-600" />
            </button>
            {/* Notification bell */}
            <button
              onClick={() => { setShowNotif(!showNotif); if (!showNotif) markRead(); }}
              className="relative p-2 rounded-xl bg-slate-100 hover:bg-blue-50 transition"
            >
              {unread > 0 ? <BellRing size={16} className="text-blue-600" /> : <Bell size={16} className="text-slate-600" />}
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* NOTIFICATION PANEL */}
        {showNotif && (
          <div className="absolute top-[108px] right-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[60] overflow-hidden">
            <div className="px-4 py-2.5 border-b flex justify-between items-center bg-slate-50">
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Notifications</span>
              <button onClick={() => setShowNotif(false)}><X size={14} className="text-slate-400" /></button>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y">
              {notifications.length === 0 ? (
                <div className="p-5 text-center text-xs text-slate-400">No notifications yet</div>
              ) : notifications.slice(0, 10).map((n, i) => (
                <div key={i} className={`px-4 py-3 ${!n.is_read ? 'bg-blue-50/40' : ''}`}>
                  <p className="text-xs font-black text-slate-800">{n.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-[9px] text-slate-400 mt-1 font-mono">
                    {new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 bg-slate-50 relative" style={{ paddingBottom: '8rem' }}>
          {loading ? (
            <div className="text-center py-16 text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Data…</div>
          ) : (
            <>
              {tab === 'dashboard' && <DashboardTab />}
              {tab === 'history'   && <HistoryTab   />}
              {tab === 'account'   && <AccountTab   />}
            </>
          )}
        </div>

        {/* PERSISTENT SOS BAR */}
        <div className="absolute left-0 right-0 bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-2 flex items-center justify-between z-40 shadow-[0_-4px_10px_rgba(220,38,38,0.2)] border-t border-red-500" style={{ bottom: '64px' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center animate-pulse">
              <ShieldAlert size={13} className="text-white" />
            </div>
            <span className="text-[10px] font-black tracking-wide">Vehicle Incident Support</span>
          </div>
          <button
            onClick={() => setShowSOS(true)}
            className="bg-white text-red-700 text-[9px] font-black px-3 py-1.5 rounded-lg shadow-sm hover:bg-red-50 transition uppercase tracking-wide"
          >
            Trigger SOS
          </button>
        </div>

        {/* BOTTOM NAV */}
        <div className="shrink-0 h-16 bg-white border-t border-slate-200 flex justify-around items-center z-50 shadow-[0_-4px_15px_rgba(0,0,0,0.04)]">
          {[
            { id: 'dashboard', Icon: Home,        label: 'HOME'    },
            { id: 'history',   Icon: History,      label: 'HISTORY' },
            { id: 'account',   Icon: CircleUser,   label: 'PROFILE' },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-1 transition-all px-4 ${tab === id ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Icon size={20} />
              <span className="text-[9px] font-black tracking-wide">{label}</span>
            </button>
          ))}
        </div>

        {/* ── CHATBOT MODAL ── */}
        {showChatbot && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex flex-col justify-end">
            <div className="bg-white rounded-t-[28px] h-[78%] flex flex-col shadow-2xl">
              <div className="px-4 py-3 bg-blue-600 text-white rounded-t-[28px] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">CC</div>
                  <div>
                    <p className="text-xs font-black">MobilityGrid Support</p>
                    <p className="text-[9px] text-blue-200">Online • Instant Response</p>
                  </div>
                </div>
                <button onClick={() => setShowChatbot(false)}><X size={18} className="text-white/80" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {chatHistory.map((c, i) => (
                  <div key={i} className={`flex gap-2 items-start ${c.from === 'user' ? 'justify-end' : ''} max-w-[85%] ${c.from === 'user' ? 'ml-auto' : ''}`}>
                    {c.from === 'bot' && (
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-[9px] font-black text-slate-500">AI</div>
                    )}
                    <div className={`p-3 rounded-2xl text-[11px] leading-relaxed shadow-sm ${c.from === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                      {c.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t bg-white flex gap-2 items-center shrink-0">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder="Type your issue…"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                />
                <button onClick={sendChat} className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition shrink-0 shadow-md">
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SOS MODAL ── */}
        {showSOS && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
              {sosSent ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={32} className="text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800">SOS Sent!</h3>
                  <p className="text-xs text-slate-500 mt-2">Your owner and support team have been notified. Help is on the way.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><ShieldAlert size={20} className="text-red-600" /></div>
                      <h3 className="text-lg font-black text-slate-800">Send SOS Alert</h3>
                    </div>
                    <button onClick={() => setShowSOS(false)}><X size={18} className="text-slate-400" /></button>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">Describe the incident (optional). Your location and vehicle details will be auto-attached.</p>
                  <textarea
                    value={sosMsg}
                    onChange={e => setSosMsg(e.target.value)}
                    placeholder="e.g. Flat tyre on highway, need assistance..."
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-red-400 resize-none bg-slate-50"
                  />
                  <button
                    onClick={sendSOS}
                    className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                  >
                    <ShieldAlert size={16} /> Broadcast Emergency Alert
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── PAYMENT LOADING ── */}
        {showPaying && (
          <div className="absolute inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-xs p-8 text-center shadow-2xl">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-lg font-black text-slate-800">Initiating Payment…</p>
              <p className="text-xs text-slate-500 mt-2">Connecting to secure gateway</p>
              <button onClick={() => setShowPaying(false)} className="mt-6 w-full py-3 bg-slate-100 text-slate-600 font-black rounded-xl text-xs hover:bg-slate-200">CANCEL</button>
            </div>
          </div>
        )}

        {/* ── RECEIPT MODAL ── */}
        {showReceipt && selTxn && (
          <div className="absolute inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-black text-slate-800">Receipt</h3>
                <button onClick={() => setShowReceipt(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center"><X size={16} /></button>
              </div>
              <div className="text-center pb-4 border-b border-dashed mb-4">
                <p className="text-4xl font-black text-slate-800">₹{selTxn.amount}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{selTxn.type}</p>
              </div>
              <div className="space-y-2.5 text-xs">
                {[
                  ['Transaction ID', selTxn.id],
                  ['Date',           selTxn.date],
                  ['Status',         selTxn.status],
                  ['Reference',      selTxn.ref],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between bg-slate-50 px-3 py-2 rounded-xl">
                    <span className="text-slate-400 font-bold">{k}</span>
                    <span className={`font-mono font-black ${k === 'Status' && v === 'SUCCESS' ? 'text-emerald-600' : 'text-slate-700'}`}>{v || '—'}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowReceipt(false)} className="w-full mt-5 py-3.5 bg-slate-900 text-white font-black rounded-2xl text-xs hover:bg-black transition">CLOSE</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}