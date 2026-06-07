// frontend/src/pages/DriverPWA.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Truck, Wifi, Battery, Bell, BellRing, Home, Wallet,
  CreditCard, Eye, EyeOff, X, Send, CheckCircle, Clock,
  MessageCircle, ShieldAlert, FileText, Camera, LogOut,
  PlusCircle, ArrowDownLeft, Fingerprint, FileCheck2,
  Landmark, ChevronLeft, ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Chatbot from '../components/Chatbot';
import DocumentSection from '../components/DocumentSection';

const API = 'https://mg-qw5s.onrender.com';
const KYC_API = 'https://mg-qw5s.onrender.com';

export default function DriverPWA() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tab, setTab] = useState('home');
  const [historyFrom, setHistoryFrom] = useState('tab');
  const [lang, setLang] = useState('en');

  const T = {
    en: {
      driverTerminal: 'Driver Terminal', balanceTx: 'Wallet',
      profileKyc: 'Account', logout: 'Logout',
      assignedVehicle: 'Assigned Vehicle', active: 'ACTIVE',
      dailyRent: 'Daily Rent', assignedSince: 'Since',
      noVehicle: 'No vehicle assigned', contactOwner: 'Contact your fleet owner',
      verifiedDocs: 'Documents', paymentSummary2: 'Payment Summary',
      availableFloat: 'Wallet Balance', addFloat2: 'Add Funds',
      requestPayout2: 'Withdraw', totalPaidLabel: 'Total Paid',
      outstandingLabel: 'Outstanding', txHistoryLabel: 'Transaction History',
      noTxLabel: 'No transactions yet', lifetime: 'Lifetime',
      outstanding: "Outstanding", duesPending: 'Due',
      settled: 'Settled', pay: 'Pay Now',
      recent: 'Recent', viewAll: 'View all',
      noTx: 'No transactions yet', emergency: 'Emergency',
      triggerSos: 'SOS'
    },
    hi: {
      driverTerminal: 'ड्राइवर टर्मिनल', balanceTx: 'वॉलेट',
      profileKyc: 'अकाउंट', logout: 'लॉगआउट',
      assignedVehicle: 'वाहन', active: 'सक्रिय',
      dailyRent: 'दैनिक किराया', assignedSince: 'से',
      noVehicle: 'वाहन असाइन नहीं', contactOwner: 'मालिक से संपर्क करें',
      verifiedDocs: 'दस्तावेज़', paymentSummary2: 'भुगतान सारांश',
      availableFloat: 'वॉलेट', addFloat2: 'जोड़ें',
      requestPayout2: 'निकालें', totalPaidLabel: 'कुल भुगतान',
      outstandingLabel: 'बकाया', txHistoryLabel: 'लेनदेन',
      noTxLabel: 'कोई लेनदेन नहीं', lifetime: 'आजीवन',
      outstanding: 'बकाया', duesPending: 'देय',
      settled: 'सेटल', pay: 'भुगतान करें',
      recent: 'हालिया', viewAll: 'सभी देखें',
      noTx: 'कोई लेनदेन नहीं', emergency: 'आपातकाल',
      triggerSos: 'SOS'
    }
  };
  const t = T[lang];

  const [time, setTime] = useState('');
  const [showBalance, setShowBal] = useState(true);
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(0);
  const [dues, setDues] = useState(0);
  const [payAmt, setPayAmt] = useState(0);
  const [telemetry, setTelemetry] = useState({});
  const [payments, setPayments] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [totalPaid, setTotalPaid] = useState(0);
  const [assignedVehicle, setAssignedVehicle] = useState(null);

  const [showNotif, setShowNotif] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [showPaying, setShowPaying] = useState(false);
  const [earnings, setEarnings] = useState({ earnings: [], today_total: 0, month_total: 0 });
  const [showAddEarning, setShowAddEarning] = useState(false);
  const [earningAmt, setEarningAmt] = useState('');
  const [earningNote, setEarningNote] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [selTxn, setSelTxn] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [sosMsg, setSosMsg] = useState('');
  const [sosSent, setSosSent] = useState(false);
  const [showOwnerChat, setShowOwnerChat] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([]);

  const [kycState, setKycState] = useState({
    aadhaar: { value: '', status: 'pending', reqId: null, otp: '', showOtp: false },
    pan: { value: '', status: 'pending', verifiedName: '' },
    dl: { value: '', dob: '', status: 'pending' },
    bank: { acc: '', ifsc: '', status: 'pending' },
  });
  const [kycLoading, setKycLoading] = useState('');

  const tk = () => localStorage.getItem('token');
  const phone = () => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const raw = u?.phone_number || u?.mobile_number || u?.phone || '';
      const cleaned = String(raw).replace(/\D/g, '');
      return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
    } catch { return ''; }
  };
  const ownerIdVal = () => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u?.owner_id || null;
    } catch { return null; }
  };

  useEffect(() => {
    const tick = () => {
      const n = new Date(); const h = n.getHours(), m = String(n.getMinutes()).padStart(2, '0');
      setTime(`${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`);
    }; tick(); const id = setInterval(tick, 30000); return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(u);
    if (!u?.id) setLoading(false);
  }, []);

  useEffect(() => {
    const fetchDriverVehicle = async () => {
      const ph = phone();
      if (!ph) return;
      try {
        const res = await fetch(`${API}/api/payment/driver/profile?phone=${ph}`);
        const data = await res.json();
        if (data?.vehicle_number) {
          setAssignedVehicle({ number: data.vehicle_number, model: data.vehicle_model, dailyRent: data.vehicle_daily_rent });
        }
      } catch {}
    };
    fetchDriverVehicle();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API}/api/payment/driver/notifications?phone=${phone()}`, { headers: { Authorization: `Bearer ${tk()}` } });
        const data = await res.json();
        if (Array.isArray(data)) { setNotifs(data); setUnread(data.filter(n => !n.is_read).length); }
      } catch {}
    };
    fetchNotifications();
    fetchEarnings();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchChat = async () => {
    const ph = phone(); if (!ph) return;
    const res = await fetch(`${API}/api/payment/chat/messages?driverPhone=${ph}&ownerId=${ownerIdVal()}`, { headers: { Authorization: `Bearer ${tk()}` } });
    if (res.ok) { const data = await res.json(); setChatMsgs(data); }
  };

  useEffect(() => {
    if (!user) return;
    fetchChat();
    const interval = setInterval(fetchChat, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim(); setChatInput('');
    await fetch(`${API}/api/payment/chat/send`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ driverPhone: phone(), message: msg, senderType: 'DRIVER', ownerId: ownerIdVal() })
    });
    fetchChat();
  };

  const fetchAll = useCallback(async () => {
    if (!user) return; setLoading(true);
    try {
      const ph = phone(); const H = { Authorization: `Bearer ${tk()}` };
      const [txR, prR, nR] = await Promise.all([
        fetch(`${API}/api/payment/my-transactions?phone=${ph}`, { headers: H }),
        fetch(`${API}/api/payment/driver/profile?phone=${ph}`, { headers: H }),
        fetch(`${API}/api/payment/driver/notifications?phone=${ph}`, { headers: H }),
      ]);
      if (txR.ok) {
        const txData = await txR.json();
        if (Array.isArray(txData)) {
          const fp = txData.map(x => ({
            id: x.pg_transaction_id || x.order_id, type: 'Rent Payment', amount: x.order_amount,
            date: new Date(x.order_initiation_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }),
            status: x.transaction_status, ref: x.order_number,
          }));
          setPayments(fp);
          setTotalPaid(fp.filter(p => p.status === 'SUCCESS').reduce((s, p) => s + parseFloat(p.amount), 0));
        }
      }
      if (prR.ok) {
        const p = await prR.json();
        setWallet(parseFloat(p.wallet_balance || 0));
        const d = p.vehicle_number ? parseFloat(p.total_outstanding || p.current_dues || 0) : 0;
        setDues(d); setPayAmt(d > 0 ? d : 0);
        setTelemetry({ vehicleNumber: p.vehicle_number || '', vehicleModel: p.vehicle_model || '', dailyRent: parseFloat(p.vehicle_daily_rent || 0), dailyDepositRecovery: parseFloat(p.daily_deposit_recovery || 0) });
        if (p.vehicle_number) setAssignedVehicle({ number: p.vehicle_number, model: p.vehicle_model, dailyRent: p.vehicle_daily_rent });
      }
      if (nR.ok) { const n = await nR.json(); const a = Array.isArray(n) ? n : []; setNotifs(a); setUnread(a.filter(x => !x.is_read).length); }
    } catch (e) { setDues(0); setPayAmt(0); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('status') === 'success' || p.get('refresh') === 'true') { setShowPaying(false); fetchAll(); window.history.replaceState(null, '', window.location.pathname); }
  }, [user]);

  const markRead = async () => {
    setUnread(0); setNotifs(p => p.map(n => ({ ...n, is_read: true })));
    try { await fetch(`${API}/api/payment/notifications/mark-read?userId=${user?.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${tk()}` } }); } catch {}
  };

  const fetchEarnings = async () => {
    try {
      const r = await fetch(`${API}/api/driver/earnings`, { headers: { Authorization: `Bearer ${tk()}` } });
      if (r.ok) { const d = await r.json(); setEarnings(d); }
    } catch {}
  };

  const addEarning = async () => {
    if (!earningAmt || isNaN(earningAmt) || Number(earningAmt) <= 0) return;
    try {
      const r = await fetch(`${API}/api/driver/earnings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ amount: Number(earningAmt), note: earningNote })
      });
      if (r.ok) { setEarningAmt(''); setEarningNote(''); setShowAddEarning(false); fetchEarnings(); }
    } catch {}
  };

  const payAbortRef = React.useRef(false);

  const pay = async () => {
    payAbortRef.current = false;
    setShowPaying(true);
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const r = await fetch(`${API}/api/payment/create-order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ amount: payAmt || dues || 850, customerName: u.name || 'Driver', customerPhone: phone(), customerEmail: u.email || 'driver@mg.com', purpose: 'RENT' })
      });
      const d = await r.json();
      if (payAbortRef.current) return; // user cancelled mid-request
      const qrLink = d?.upiQrLink || d?.data?.upiQrLink;
      if (qrLink) {
        try { const qrUrl = new URL(qrLink); const intentLink = decodeURIComponent(qrUrl.searchParams.get("intent")); if (intentLink?.startsWith('upi://')) { window.location.href = intentLink; return; } } catch {}
      }
      const url = d?.checkoutUrl || d?.data?.checkoutUrl || d?.intentURL || d?.data?.intentURL;
      if (url) { window.location.href = url; } else { alert('Payment error: ' + (d?.message || 'No URL')); setShowPaying(false); }
    } catch (e) { if (!payAbortRef.current) alert('Network error: ' + e.message); setShowPaying(false); }
  };

  const addFloat = async () => {
    const amt = prompt("Enter amount (₹):"); if (!amt || isNaN(amt) || Number(amt) <= 0) return;
    setShowPaying(true);
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const r = await fetch(`${API}/api/payment/create-order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ amount: Number(amt), customerName: u.name || 'Driver', customerPhone: phone(), customerEmail: u.email || 'driver@mg.com', purpose: 'WALLET' })
      });
      const d = await r.json();
      const url = d?.checkoutUrl || d?.data?.checkoutUrl || d?.intentURL || d?.data?.intentURL;
      if (url) { window.location.href = url; } else { alert('Payment gateway error.'); setShowPaying(false); }
    } catch { alert('Network error.'); setShowPaying(false); }
  };

  const sendSOS = async () => {
    setSosSent(true);
    let locationUrl = '';
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
      locationUrl = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
    } catch {}
    try {
      await fetch(`${API}/api/payment/driver/sos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ phone: phone(), message: `${sosMsg || 'Emergency!'}\n${locationUrl ? `📍 ${locationUrl}` : ''}` })
      });
    } catch {}
    setTimeout(() => { setShowSOS(false); setSosMsg(''); setSosSent(false); setShowOwnerChat(true); fetchChat(); }, 2000);
  };

  const formatChatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now); yesterday.setDate(now.getDate()-1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = d.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit', hour12:true});
    if (isToday) return time;
    if (isYesterday) return `Yesterday ${time}`;
    return `${d.toLocaleDateString('en-IN', {day:'2-digit', month:'short'})} ${time}`;
  };

  const logout = async () => {
    try {
      await fetch(`${API}/api/payment/driver/activity/logout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverPhone: phone() })
      });
    } catch {}
    localStorage.clear(); navigate('/login');
  };

  const kycCall = async (endpoint, body, docKey) => {
    setKycLoading(docKey);
    try {
      const r = await fetch(`${KYC_API}/api/kyc/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` }, body: JSON.stringify({ ...body, phone: phone() }) });
      return await r.json();
    } catch (e) { return { success: false, message: e.message }; }
    finally { setKycLoading(''); }
  };

  const kycVerifyPAN = async () => {
    if (!kycState.pan.value || kycState.pan.value.length !== 10) return alert('Enter valid PAN');
    const r = await kycCall('verify-pan', { pan_number: kycState.pan.value.toUpperCase() }, 'pan');
    if (r.verified) { setKycState(s => ({ ...s, pan: { ...s.pan, status: 'verified', verifiedName: r.name } })); alert(`✅ PAN Verified: ${r.name}`); }
    else { setKycState(s => ({ ...s, pan: { ...s.pan, status: 'failed' } })); alert(r.message || '❌ Failed'); }
  };
  const kycAadhaarInit = async () => {
    if (kycState.aadhaar.value.length !== 12) return alert('Enter 12-digit Aadhaar');
    const r = await kycCall('aadhaar-initiate', { aadhaar_number: kycState.aadhaar.value }, 'aadhaar');
    if (r.success) { setKycState(s => ({ ...s, aadhaar: { ...s.aadhaar, reqId: r.requestId, showOtp: true } })); } else alert(r.message || 'Failed');
  };
  const kycAadhaarVerify = async () => {
    if (!kycState.aadhaar.otp) return alert('Enter OTP');
    const r = await kycCall('aadhaar-verify', { request_id: kycState.aadhaar.reqId, otp: kycState.aadhaar.otp }, 'aadhaar');
    setKycState(s => ({ ...s, aadhaar: { ...s.aadhaar, status: r.verified ? 'verified' : 'failed', showOtp: false } }));
    alert(r.verified ? '✅ Verified' : '❌ Invalid OTP');
  };
  const kycVerifyDL = async () => {
    const r = await kycCall('verify-dl', { dl_number: kycState.dl.value, dob: kycState.dl.dob }, 'dl');
    setKycState(s => ({ ...s, dl: { ...s.dl, status: r.verified ? 'verified' : 'failed' } }));
    alert(r.verified ? '✅ DL Verified' : '❌ Failed');
  };
  const kycVerifyBank = async () => {
    const r = await kycCall('verify-bank', { account_number: kycState.bank.acc, ifsc: kycState.bank.ifsc }, 'bank');
    setKycState(s => ({ ...s, bank: { ...s.bank, status: r.verified ? 'verified' : 'failed' } }));
    alert(r.verified ? `✅ Bank Verified` : '❌ Failed');
  };

  const statusBadge = (s) => {
    const styles = { verified: 'bg-blue-50 text-blue-700 border-blue-200', failed: 'bg-red-50 text-red-600 border-red-200', pending: 'bg-slate-50 text-slate-500 border-slate-200' };
    const labels = { verified: '✓ Verified', failed: '✗ Failed', pending: 'Pending' };
    return <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${styles[s] || styles.pending}`}>{labels[s] || 'Pending'}</span>;
  };

  const driverName = user?.name || user?.full_name || 'Driver';
  const driverCode = user?.driver_code || user?.usercode || '—';

  // ── HOME TAB ─────────────────────────────────────────────────────────────
  const HomeTab = () => (
    <div className="space-y-3 pb-4">
      {/* Outstanding card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.outstanding}</p>
            <p className="text-3xl font-black text-slate-900 tracking-tight">₹{dues.toLocaleString('en-IN')}</p>
          </div>
          <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${dues > 0 ? 'bg-slate-900 text-white border-slate-900' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
            {dues > 0 ? t.duesPending : t.settled}
          </span>
        </div>
        {telemetry.dailyDepositRecovery > 0 && (
          <p className="text-[9px] text-slate-400 mb-3">Includes ₹{telemetry.dailyDepositRecovery}/day deposit recovery</p>
        )}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-slate-400 font-black text-lg">₹</span>
          <input type="number" value={payAmt} onChange={e => setPayAmt(Number(e.target.value))}
            className="flex-1 border border-slate-200 rounded-xl p-3 text-xl font-black font-mono focus:outline-none focus:border-blue-500 bg-slate-50/50 text-slate-800"/>
        </div>
        <button onClick={pay} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm transition active:scale-[0.98]">
          <CreditCard size={15}/> {t.pay}
        </button>
      </div>

      {/* Vehicle info strip */}
      {assignedVehicle && (
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Truck size={14} className="text-blue-600"/>
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">{assignedVehicle.number}</p>
              <p className="text-[9px] text-slate-400">{assignedVehicle.model}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-blue-600">₹{assignedVehicle.dailyRent}/day</p>
            <span className="text-[9px] font-black text-slate-400 flex items-center gap-1 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block animate-pulse"/>Active
            </span>
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.recent}</h3>
          <button onClick={() => { setHistoryFrom('transaction'); setTab('wallet'); setActiveTab('wallet'); }}
            className="text-[10px] text-blue-600 font-black flex items-center gap-1">{t.viewAll} <ArrowUpRight size={10}/></button>
        </div>
        <div className="divide-y divide-slate-50">
          {payments.slice(0, 3).map((p, i) => (
            <div key={i} onClick={() => { setSelTxn(p); setShowReceipt(true); }}
              className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition">
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${p.status === 'SUCCESS' ? 'bg-blue-50' : 'bg-slate-100'}`}>
                  {p.status === 'SUCCESS' ? <CheckCircle size={12} className="text-blue-600"/> : <Clock size={12} className="text-slate-400"/>}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800">{p.type}</p>
                  <p className="text-[9px] text-slate-400 font-mono">{p.date}</p>
                </div>
              </div>
              <p className={`text-sm font-black ${p.status === 'SUCCESS' ? 'text-slate-800' : 'text-slate-400'}`}>₹{p.amount}</p>
            </div>
          ))}
          {payments.length === 0 && !loading && (
            <div className="p-6 text-center text-[11px] text-slate-400">{t.noTx}</div>
          )}
        </div>
      </div>
    </div>
  );

  // ── WALLET TAB ────────────────────────────────────────────────────────────
  const WalletTab = () => {
    const [showAll, setShowAll] = useState(false);
    const displayed = showAll ? payments : payments.slice(0, 5);
    return (
      <div className="space-y-3 pb-4">
        {historyFrom === 'transaction' && (
          <button onClick={() => { setHistoryFrom('tab'); setTab('home'); setActiveTab('dashboard'); }}
            className="flex items-center gap-1 text-blue-600 font-black text-sm bg-white border border-slate-200 px-3 py-2 rounded-xl">
            <ChevronLeft size={15}/> Back to Dashboard
          </button>
        )}

        {/* Balance card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.availableFloat}</p>
          <div className="flex items-center gap-2 mb-4">
            <p className="text-3xl font-black text-slate-900 font-mono">{showBalance ? `₹${wallet.toLocaleString('en-IN')}` : '₹ ••••'}</p>
            <button onClick={() => setShowBal(!showBalance)} className="text-slate-400 hover:text-slate-600">
              {showBalance ? <EyeOff size={14}/> : <Eye size={14}/>}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={addFloat} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition">
              <PlusCircle size={12}/> {t.addFloat2}
            </button>
            <button onClick={() => alert('Coming soon')} className="flex-1 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition hover:border-slate-300">
              <ArrowDownLeft size={12}/> {t.requestPayout2}
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t.paymentSummary2}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[9px] text-slate-400 mb-1">{t.totalPaidLabel}</p>
              <p className="text-lg font-black text-slate-800">₹{totalPaid.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[9px] text-slate-400 mb-1">{t.outstandingLabel}</p>
              <p className="text-lg font-black text-slate-800">₹{dues.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.txHistoryLabel}</h3>
            <span className="text-[9px] text-slate-400">{payments.length} total</span>
          </div>
          <div className="divide-y divide-slate-50">
            {payments.length === 0 ? (
              <p className="p-6 text-center text-[11px] text-slate-400">{t.noTxLabel}</p>
            ) : displayed.map((p, i) => (
              <div key={i} onClick={() => { setSelTxn(p); setShowReceipt(true); }}
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition">
                <div>
                  <p className="text-xs font-black text-slate-800">{p.type}</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">{p.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-800">₹{p.amount}</p>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${p.status === 'SUCCESS' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {p.status === 'SUCCESS' ? 'Paid' : p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {payments.length > 5 && (
            <div className="px-4 py-3 border-t border-slate-100">
              <button onClick={() => setShowAll(!showAll)}
                className="w-full text-[11px] font-black text-blue-600 py-2 rounded-xl hover:bg-blue-50 transition">
                {showAll ? 'Show less ↑' : `Load ${payments.length - 5} more ↓`}
              </button>
            </div>
          )}
        </div>

        {/* MY EARNINGS — private to driver, owner cannot see this */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-emerald-50 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">💰 My Earnings</p>
              <p className="text-[9px] text-emerald-600 opacity-70">Only you can see this</p>
            </div>
            <button onClick={() => setShowAddEarning(!showAddEarning)}
              className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg">
              + Add
            </button>
          </div>

          {showAddEarning && (
            <div className="px-4 py-3 bg-emerald-50/50 border-b border-emerald-100 space-y-2">
              <input type="number" placeholder="Amount earned (₹)" value={earningAmt} onChange={e => setEarningAmt(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 bg-white" />
              <input type="text" placeholder="Note (e.g. 12 trips, good day)" value={earningNote} onChange={e => setEarningNote(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white" />
              <div className="flex gap-2">
                <button onClick={addEarning} className="flex-1 bg-emerald-600 text-white text-xs font-black py-2.5 rounded-xl">Save</button>
                <button onClick={() => { setShowAddEarning(false); setEarningAmt(''); setEarningNote(''); }}
                  className="flex-1 bg-slate-100 text-slate-600 text-xs font-black py-2.5 rounded-xl">Cancel</button>
              </div>
            </div>
          )}

          <div className="px-4 py-3 grid grid-cols-2 gap-3 border-b border-slate-100">
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-[9px] text-emerald-600 font-black uppercase mb-1">Today</p>
              <p className="text-lg font-black text-emerald-700">₹{earnings.today_total?.toLocaleString('en-IN') || '0'}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-[9px] text-emerald-600 font-black uppercase mb-1">This Month</p>
              <p className="text-lg font-black text-emerald-700">₹{earnings.month_total?.toLocaleString('en-IN') || '0'}</p>
            </div>
          </div>

          <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
            {(earnings.earnings || []).length === 0 ? (
              <p className="p-4 text-center text-[11px] text-slate-400">No earnings logged yet</p>
            ) : (earnings.earnings || []).slice(0, 10).map((e, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-700">{e.note || 'Earnings'}</p>
                  <p className="text-[9px] text-slate-400 font-mono">{new Date(e.earning_date).toLocaleDateString('en-IN', {day:'2-digit',month:'short'})}</p>
                </div>
                <p className="text-sm font-black text-emerald-600">+₹{parseFloat(e.amount).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── ACCOUNT TAB ───────────────────────────────────────────────────────────
  const AccountTab = () => {
    const handleFileUpload = async (docType, file) => {
      if (!file) return;
      const formData = new FormData();
      formData.append('document', file); formData.append('type', docType); formData.append('phone', phone());
      try {
        const res = await fetch(`${API}/api/kyc/upload-document`, { method: 'POST', headers: { Authorization: `Bearer ${tk()}` }, body: formData });
        const data = await res.json();
        alert(data.success ? `✅ ${docType} uploaded` : 'Upload failed');
      } catch { alert('Upload failed'); }
    };

    return (
      <div className="space-y-3 pb-4">
        {/* Profile card — fixed layout */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-blue-600 px-5 pt-6 pb-5">
            <div className="flex flex-col items-center text-white text-center">
              <div className="w-16 h-16 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center text-2xl font-black mb-3">
                {driverName.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-lg font-black tracking-tight">{driverName}</h2>
              <p className="text-sm text-blue-100 mt-0.5">{phone()}</p>
              <p className="text-[10px] text-blue-200 font-mono mt-0.5">{driverCode}</p>
            </div>
          </div>
          {/* Status + vehicle — BELOW blue header, outside overflow */}
          <div className="px-4 py-3 bg-white flex items-center justify-between border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${assignedVehicle ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`}/>
              <span className="text-xs font-black text-slate-700">{assignedVehicle ? 'Active' : 'Inactive'}</span>
            </div>
            {assignedVehicle && (
              <div className="text-right">
                <p className="text-sm font-black text-slate-800">{assignedVehicle.number}</p>
                <p className="text-[9px] text-slate-400">{assignedVehicle.model} · ₹{assignedVehicle.dailyRent}/day</p>
              </div>
            )}
          </div>
        </div>

        {/* Documents via DocumentSection */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.verifiedDocs}</h3>
          </div>
          <div className="p-4">
            <DocumentSection userId={user?.id} userType="DRIVER" token={tk()}/>
          </div>
        </div>

        {/* KYC Verification */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">KYC Verification</p>

          {/* Aadhaar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-black text-slate-800 flex items-center gap-2"><Fingerprint size={14} className="text-blue-600"/> Aadhaar</span>
              {statusBadge(kycState.aadhaar.status)}
            </div>
            <div className="flex gap-2 mb-2">
              <input value={kycState.aadhaar.value} maxLength={12}
                onChange={e => setKycState(s => ({ ...s, aadhaar: { ...s.aadhaar, value: e.target.value.replace(/\D/g,'').slice(0,12) } }))}
                placeholder="12-digit Aadhaar" className="flex-1 border border-slate-200 rounded-xl p-2.5 font-mono text-sm bg-slate-50 focus:outline-none focus:border-blue-500"/>
              <button onClick={kycAadhaarInit} disabled={kycLoading === 'aadhaar'}
                className="bg-blue-600 text-white px-4 rounded-xl text-xs font-black hover:bg-blue-700 transition">OTP</button>
            </div>
            {kycState.aadhaar.showOtp && (
              <div className="flex gap-2 mb-2">
                <input value={kycState.aadhaar.otp} onChange={e => setKycState(s => ({ ...s, aadhaar: { ...s.aadhaar, otp: e.target.value } }))}
                  placeholder="Enter OTP" className="flex-1 border border-slate-200 rounded-xl p-2.5 font-mono text-sm bg-slate-50 focus:outline-none focus:border-blue-500"/>
                <button onClick={kycAadhaarVerify} className="bg-slate-800 text-white px-4 rounded-xl text-xs font-black">Verify</button>
              </div>
            )}
            <label className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 cursor-pointer hover:bg-slate-100 border border-slate-200 border-dashed mt-2">
              <Camera size={11}/> Upload Aadhaar
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleFileUpload('AADHAAR', e.target.files[0])}/>
            </label>
          </div>

          {/* PAN */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-black text-slate-800 flex items-center gap-2"><FileText size={14} className="text-blue-600"/> PAN</span>
              {statusBadge(kycState.pan.status)}
            </div>
            <div className="flex gap-2 mb-2">
              <input value={kycState.pan.value} maxLength={10}
                onChange={e => setKycState(s => ({ ...s, pan: { ...s.pan, value: e.target.value.toUpperCase() } }))}
                placeholder="ABCDE1234F" className="flex-1 border border-slate-200 rounded-xl p-2.5 font-mono text-sm uppercase bg-slate-50 focus:outline-none focus:border-blue-500"/>
              <button onClick={kycVerifyPAN} disabled={kycLoading === 'pan'}
                className="bg-blue-600 text-white px-4 rounded-xl text-xs font-black hover:bg-blue-700 transition">Verify</button>
            </div>
            {kycState.pan.verifiedName && <p className="text-[10px] text-blue-600 font-black mb-2">✓ {kycState.pan.verifiedName}</p>}
            <label className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 cursor-pointer hover:bg-slate-100 border border-slate-200 border-dashed">
              <Camera size={11}/> Upload PAN
              <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload('PAN', e.target.files[0])}/>
            </label>
          </div>

          {/* DL */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-black text-slate-800 flex items-center gap-2"><FileCheck2 size={14} className="text-blue-600"/> Driving License</span>
              {statusBadge(kycState.dl.status)}
            </div>
            <div className="flex gap-2 mb-2">
              <input value={kycState.dl.value}
                onChange={e => setKycState(s => ({ ...s, dl: { ...s.dl, value: e.target.value.toUpperCase() } }))}
                placeholder="License Number" className="flex-1 border border-slate-200 rounded-xl p-2.5 font-mono text-sm bg-slate-50 focus:outline-none focus:border-blue-500"/>
              <button onClick={kycVerifyDL} disabled={kycLoading === 'dl'}
                className="bg-blue-600 text-white px-4 rounded-xl text-xs font-black hover:bg-blue-700 transition">Verify</button>
            </div>
            <input type="date" value={kycState.dl.dob}
              onChange={e => setKycState(s => ({ ...s, dl: { ...s.dl, dob: e.target.value } }))}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm mb-2 bg-slate-50 focus:outline-none focus:border-blue-500"/>
            <label className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 cursor-pointer hover:bg-slate-100 border border-slate-200 border-dashed">
              <Camera size={11}/> Upload License
              <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload('DL', e.target.files[0])}/>
            </label>
          </div>

          {/* Bank */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-black text-slate-800 flex items-center gap-2"><Landmark size={14} className="text-blue-600"/> Bank Account</span>
              {statusBadge(kycState.bank.status)}
            </div>
            <input value={kycState.bank.acc}
              onChange={e => setKycState(s => ({ ...s, bank: { ...s.bank, acc: e.target.value } }))}
              placeholder="Account Number" className="w-full border border-slate-200 rounded-xl p-2.5 text-sm mb-2 bg-slate-50 focus:outline-none focus:border-blue-500"/>
            <div className="flex gap-2 mb-2">
              <input value={kycState.bank.ifsc}
                onChange={e => setKycState(s => ({ ...s, bank: { ...s.bank, ifsc: e.target.value.toUpperCase() } }))}
                placeholder="IFSC Code" className="flex-1 border border-slate-200 rounded-xl p-2.5 font-mono text-sm uppercase bg-slate-50 focus:outline-none focus:border-blue-500"/>
              <button onClick={kycVerifyBank} disabled={kycLoading === 'bank'}
                className="bg-blue-600 text-white px-4 rounded-xl text-xs font-black hover:bg-blue-700 transition">Verify</button>
            </div>
            <label className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 cursor-pointer hover:bg-slate-100 border border-slate-200 border-dashed">
              <Camera size={11}/> Upload Cheque
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleFileUpload('BANK', e.target.files[0])}/>
            </label>
          </div>
        </div>

        <button onClick={logout} className="w-full bg-white border border-slate-200 text-red-500 font-black py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 hover:border-red-200 hover:bg-red-50 transition">
          <LogOut size={13}/> {t.logout}
        </button>
      </div>
    );
  };

  // ── MAIN RENDER ───────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen bg-slate-100 flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[412px] bg-slate-50 h-full sm:max-h-[840px] flex flex-col relative overflow-hidden sm:rounded-[32px] sm:shadow-2xl sm:border sm:border-slate-200">

        {/* Status bar */}
        <div className="bg-slate-900 text-white text-[10px] px-4 py-2 flex justify-between items-center shrink-0">
          <span className="font-black tracking-widest text-blue-400">DRIVER</span>
          <span className="font-mono text-slate-400">{time}</span>
          <div className="flex gap-1.5 items-center"><Wifi size={10} className="text-slate-400"/><Battery size={10} className="text-slate-400"/></div>
        </div>

        {/* Header */}
        <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">MG</div>
            <div>
              <p className="text-sm font-black text-slate-800 leading-none">{tab === 'home' ? 'Dashboard' : tab === 'wallet' ? 'Wallet' : 'Account'}</p>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">{driverName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button onClick={() => setLang('en')} className={`px-2.5 py-1 text-[10px] font-black rounded-md transition ${lang==='en'?'bg-white text-blue-600 shadow-sm':'text-slate-400'}`}>EN</button>
              <button onClick={() => setLang('hi')} className={`px-2.5 py-1 text-[10px] font-black rounded-md transition ${lang==='hi'?'bg-white text-blue-600 shadow-sm':'text-slate-400'}`}>हिं</button>
            </div>
            <button onClick={() => setShowChatbot(true)} className="p-2 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 transition text-slate-500 border border-slate-200">
              <MessageCircle size={15}/>
            </button>
            <button onClick={() => { setShowNotif(!showNotif); if (!showNotif) markRead(); }} className="relative p-2 rounded-lg bg-slate-100 hover:bg-blue-50 transition border border-slate-200">
              {unread > 0 ? <BellRing size={15} className="text-blue-600"/> : <Bell size={15} className="text-slate-500"/>}
              {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-600 text-white text-[8px] font-black rounded-full flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
            </button>
            <button onClick={logout} className="p-2 rounded-lg bg-red-50 hover:bg-red-100 transition border border-red-100">
              <LogOut size={15} className="text-red-500"/>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {showNotif && (
          <div className="absolute top-[104px] left-3 right-3 bg-white rounded-2xl shadow-xl border border-slate-200 z-[60] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Notifications</span>
              <button onClick={() => setShowNotif(false)} className="text-slate-400 hover:text-slate-600"><X size={13}/></button>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
              {notifs.length === 0 ? <div className="p-5 text-center text-xs text-slate-400">All clear</div>
                : notifs.slice(0, 10).map((n, i) => (
                  <div key={i}
                    className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition ${!n.is_read ? 'bg-blue-50/30' : ''}`}
                    onClick={() => {
                      setNotifs(prev => prev.map((x, idx) => idx === i ? { ...x, is_read: true } : x));
                      setUnread(prev => Math.max(0, prev - 1)); setShowNotif(false);
                      const title = (n.title || '').toLowerCase();
                      if (title.includes('💬') || title.includes('message')) { setShowOwnerChat(true); fetchChat(); }
                      else if (title.includes('payment') || title.includes('rent')) { setTab('wallet'); setActiveTab('wallet'); }
                    }}>
                    <p className="text-xs font-black text-slate-800">{n.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{n.message}</p>
                    {!n.is_read && <p className="text-[9px] text-blue-500 font-black mt-0.5">Tap to view →</p>}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 bg-slate-50 pb-32">
          {loading ? <div className="text-center py-16 text-xs font-black text-slate-400 animate-pulse">Loading…</div> : (
            <>
              {tab === 'home' && <HomeTab/>}
              {tab === 'wallet' && <WalletTab/>}
              {tab === 'account' && <AccountTab/>}
            </>
          )}
        </div>

        {/* Emergency bar */}
        <div className="absolute left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-between" style={{ bottom: '64px' }}>
          <button onClick={() => { setShowOwnerChat(true); fetchChat(); }}
            className="flex items-center gap-1.5 text-[10px] font-black text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-blue-200 hover:text-blue-600 transition">
            <MessageCircle size={11}/> Owner Chat
          </button>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.emergency}</span>
          <button onClick={() => setShowSOS(true)}
            className="flex items-center gap-1.5 text-[10px] font-black text-white bg-red-500 px-3 py-1.5 rounded-lg hover:bg-red-600 transition">
            <ShieldAlert size={11}/> {t.triggerSos}
          </button>
        </div>

        {/* Bottom nav */}
        <div className="fixed bottom-0 left-0 right-0 max-w-[412px] mx-auto bg-white border-t border-slate-200 h-16 flex justify-around items-center z-50">
          {[
            { id: 'dashboard', tabVal: 'home', Icon: Home, label: 'Home' },
            { id: 'wallet', tabVal: 'wallet', Icon: Wallet, label: 'Wallet' },
            { id: 'account', tabVal: 'account', Icon: User, label: 'Account' },
          ].map(({ id, tabVal, Icon, label }) => (
            <button key={id} onClick={() => { setActiveTab(id); setTab(tabVal); }}
              className={`flex flex-col items-center gap-1 transition-all px-4 ${activeTab === id ? 'text-blue-600' : 'text-slate-400'}`}>
              <Icon size={activeTab === id ? 21 : 19}/>
              <span className="text-[9px] font-black">{label}</span>
            </button>
          ))}
        </div>

        {/* Chatbot */}
        {showChatbot && (
          <Chatbot userRole="DRIVER" userPhone={phone()} token={tk()}
            onClose={() => setShowChatbot(false)}
            persistedMessages={chatMessages} onMessagesUpdate={setChatMessages}/>
        )}

        {/* SOS Modal */}
        {showSOS && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
              <button onClick={() => { setShowSOS(false); setSosMsg(''); setSosSent(false); }}
                className="flex items-center gap-1 text-slate-400 text-sm mb-5 hover:text-slate-600 transition">
                <ChevronLeft size={15}/> Back
              </button>
              {sosSent ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={24} className="text-blue-600"/>
                  </div>
                  <h3 className="font-black text-slate-800">Alert Sent</h3>
                  <p className="text-sm text-slate-400 mt-1">Owner has been notified</p>
                </div>
              ) : (
                <>
                  <h3 className="font-black text-slate-800 mb-1">Emergency Alert</h3>
                  <p className="text-xs text-slate-400 mb-4">Immediately notifies your fleet owner</p>
                  <textarea value={sosMsg} onChange={e => setSosMsg(e.target.value)}
                    placeholder="Describe the situation..."
                    rows={3} className="w-full border border-slate-200 rounded-xl p-3 text-sm mb-4 focus:outline-none focus:border-blue-500 bg-slate-50 resize-none"/>
                  <div className="flex gap-2">
                    <button onClick={() => setShowSOS(false)} className="flex-1 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-600">Cancel</button>
                    <button onClick={sendSOS} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-3 rounded-xl text-sm transition">Send SOS</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Paying overlay */}
        {showPaying && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
              <p className="font-black text-slate-800 text-sm">Redirecting...</p>
              <button onClick={() => { payAbortRef.current = true; setShowPaying(false); }} className="mt-3 text-xs text-slate-400 underline">Cancel</button>
            </div>
          </div>
        )}

        {/* Receipt Modal */}
        {showReceipt && selTxn && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
              <button onClick={() => setShowReceipt(false)} className="flex items-center gap-1 text-slate-400 text-sm mb-5 hover:text-slate-600 transition">
                <ChevronLeft size={15}/> Back
              </button>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Receipt</p>
              <p className="text-3xl font-black text-slate-900 mb-4">₹{selTxn.amount}</p>
              <div className="space-y-2 border-t border-slate-100 pt-4">
                {[['ID', selTxn.id], ['Date', selTxn.date], ['Status', selTxn.status]].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">{k}</span>
                    <span className={`text-xs font-black ${k === 'Status' ? (selTxn.status === 'SUCCESS' ? 'text-blue-600' : 'text-red-500') : 'text-slate-700 font-mono'}`}>{v}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowReceipt(false)} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-sm mt-5">Close</button>
            </div>
          </div>
        )}

        {/* Owner Chat */}
        {showOwnerChat && (
          <div className="absolute inset-0 z-[100] flex flex-col bg-slate-50">
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
              <button onClick={() => setShowOwnerChat(false)} className="text-slate-400 hover:text-slate-600 transition">
                <ChevronLeft size={20}/>
              </button>
              <div>
                <h3 className="font-black text-slate-800 text-sm">Fleet Owner</h3>
                <p className="text-[9px] text-slate-400">MobilityGrid</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMsgs.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-12">
                  <MessageCircle size={28} className="mx-auto mb-2 opacity-20"/>
                  <p>No messages yet</p>
                </div>
              ) : chatMsgs.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender_type === 'DRIVER' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-3 py-2.5 rounded-2xl text-sm ${
                    msg.sender_type === 'DRIVER'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                  }`}>
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-[9px] mt-1 ${msg.sender_type === 'DRIVER' ? 'text-blue-200' : 'text-slate-400'}`}>
                      {formatChatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-white border-t border-slate-200 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                placeholder="Message..." className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"/>
              <button onClick={sendChatMessage} className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition">
                <Send size={15}/>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}