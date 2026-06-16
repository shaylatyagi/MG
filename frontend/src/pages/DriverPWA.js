// frontend/src/pages/DriverPWA.js
import ThemeToggle from '../components/ThemeToggle';
import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Truck, Wifi, Battery, Bell, BellRing, Home, Wallet,
  CreditCard, Eye, EyeOff, X, Send, CheckCircle, Clock,
  MessageCircle, ShieldAlert, FileText, Camera, LogOut,
  PlusCircle, ArrowDownLeft, Fingerprint, FileCheck2,
  Landmark, ChevronLeft, ChevronRight, ArrowUpRight, ArrowUpCircle, Zap, MapPin, Navigation, FolderOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Chatbot from '../components/Chatbot';
import { toast, ToastContainer } from '../components/Toast';
import { SkeletonDashboard } from '../components/Skeleton';
import Onboarding, { useOnboarding } from '../components/Onboarding';
import AnimatedNumber from '../components/AnimatedNumber';
import OfflineBanner from '../components/OfflineBanner';
import LoadingButton from '../components/LoadingButton';
import PullToRefresh from '../components/PullToRefresh';
import EmptyState from '../components/EmptyState';
import DocumentSection from '../components/DocumentSection';

const API = process.env.REACT_APP_API_URL || 'https://mg-qw5s.onrender.com';

export default function DriverPWA() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tab, setTab] = useState('home');
  // D-03: sync tab → activeTab so single source drives rendering
  useEffect(() => { setActiveTab(tab === 'home' ? 'dashboard' : tab); }, [tab]);
  const [historyFrom, setHistoryFrom] = useState('tab');
  const [lang, setLang] = useState('en');
  const [companyPayMode, setCompanyPayMode] = useState('BOTH'); // CASH_ONLY | ONLINE_ONLY | BOTH

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
      noTxLabel: 'No payments yet. Once you make a payment, your transaction history will appear here.', lifetime: 'Lifetime',
      outstanding: "Outstanding", duesPending: 'Due',
      settled: 'Settled', pay: 'Pay Now',
      recent: 'Recent', viewAll: 'View all',
      noTx: 'No payments yet. Once you make a payment, your transaction history will appear here.', emergency: 'Emergency',
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
  const [showVehicleDetail, setShowVehicleDetail] = useState(false);
  const [fleetOwner, setFleetOwner] = useState('');
  const [fleetCompany, setFleetCompany] = useState('');

  const [showNotif, setShowNotif] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [showPaying, setShowPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null); // { amount, timestamp }
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
  const { showTour, dismissTour } = useOnboarding('driver');
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [addFundsAmt, setAddFundsAmt] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  // Passkey one-time nudge
  const [showPasskeyNudge, setShowPasskeyNudge] = useState(false);
  // Notification permission nudge
  const [showNotifNudge, setShowNotifNudge] = useState(false);
  const [enrollingPasskey, setEnrollingPasskey] = useState(false);
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
    }; tick(); const id = setInterval(tick, 60000); return () => clearInterval(id);
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
        if (Array.isArray(data)) {
          // Always use fresh server data — no local cache merging
          const top = data.slice(0, 50);
          const readIds2 = JSON.parse(localStorage.getItem('mg_read_notif_ids') || '[]');
          const mergedTop = top.map(x => readIds2.includes(x.id) ? { ...x, is_read: true } : x);
          setNotifs(mergedTop);
          setUnread(mergedTop.filter(n => !n.is_read).length);
        }
      } catch {}
    };
    fetchNotifications();
    fetchEarnings();
    const interval = setInterval(fetchNotifications, 60000);
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
    const interval = setInterval(fetchChat, 60000);
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

  const fetchAll = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true); // only spinner on first load
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
        if (p.vehicle_number) setAssignedVehicle({ number: p.vehicle_number, model: p.vehicle_model, dailyRent: p.vehicle_daily_rent, status: 'Assigned', assignedSince: p.assigned_since });
        if (p.owner_name) setFleetOwner(p.owner_name);
        if (p.company_name) setFleetCompany(p.company_name);
      }
      if (nR.ok) { const n = await nR.json(); const a = Array.isArray(n) ? n : [];
        // Cross-ref with locally stored read IDs so count doesn't reset on login
        const readIds = JSON.parse(localStorage.getItem('mg_read_notif_ids') || '[]');
        const merged = a.map(x => readIds.includes(x.id) ? { ...x, is_read: true } : x);
        setNotifs(merged); setUnread(merged.filter(x => !x.is_read).length); }
      // Fetch company payment mode
      try {
        const cfgR = await fetch(`${API}/api/driver/company-config`, { headers: H });
        if (cfgR.ok) { const cfg = await cfgR.json(); if (cfg.data?.payment_mode) setCompanyPayMode(cfg.data.payment_mode); }
      } catch (_) {}
    } catch (e) { setDues(0); setPayAmt(0); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // GPS ping — silent, every 30s, only when assigned vehicle
  useEffect(() => {
    if (!user) return;
    const pingLocation = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetch(`${API}/api/driver/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          }).catch(() => {});
        },
        () => {}, // silent fail if permission denied
        { timeout: 10000, maximumAge: 60000 }
      );
    };
    pingLocation();
    const interval = setInterval(pingLocation, 60000);
    return () => clearInterval(interval);
  }, [user, assignedVehicle]);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('status') === 'success') {
      setShowPaying(false);
      fetchAll();
      const amt = p.get('amount') || p.get('order_amount') || null;
      setPaymentSuccess({ amount: amt, timestamp: new Date() });
      window.history.replaceState(null, '', window.location.pathname);
    } else if (p.get('refresh') === 'true') {
      setShowPaying(false);
      fetchAll();
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [user]);

  // Auto-dismiss "Redirecting..." overlay when user returns from payment app without completing
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        const p = new URLSearchParams(window.location.search);
        if (p.get('status') !== 'success') setShowPaying(false);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const markRead = async () => {
    setUnread(0);
    setNotifs(p => {
      const updated = p.map(n => ({ ...n, is_read: true }));
      // Persist read IDs in localStorage so they survive logout/refresh
      try {
        const readIds = updated.map(n => n.id).filter(Boolean);
        const existing = JSON.parse(localStorage.getItem('mg_read_notif_ids') || '[]');
        const merged = [...new Set([...existing, ...readIds])];
        localStorage.setItem('mg_read_notif_ids', JSON.stringify(merged));
      } catch {}
      return updated;
    });
    try { await fetch(`${API}/api/payment/notifications/mark-read?driverId=${user?.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${tk()}` } }); } catch {}
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
        body: JSON.stringify({ amount: payAmt || dues || 0, customerName: u.name || 'Driver', customerPhone: phone(), customerEmail: u.email || '', purpose: 'RENT' })
      });
      const d = await r.json();
      if (payAbortRef.current) return; // user cancelled mid-request
      const qrLink = d?.upiQrLink || d?.data?.upiQrLink;
      if (qrLink) {
        try { const qrUrl = new URL(qrLink); const intentLink = decodeURIComponent(qrUrl.searchParams.get("intent")); if (intentLink?.startsWith('upi://')) { window.location.href = intentLink; return; } } catch {}
      }
      const url = d?.intentURL || d?.data?.intentURL || d?.checkoutUrl || d?.data?.checkoutUrl;
      if (url) { window.location.href = url; } else { toast.error('Payment error: ' + (d?.message || 'No URL')); setShowPaying(false); }
    } catch (e) { if (!payAbortRef.current) toast.error('Network error: ' + e.message); setShowPaying(false); }
  };

  const addFloat = () => { setAddFundsAmt(''); setShowAddFunds(true); };

  const submitAddFunds = async () => {
    const amt = addFundsAmt;
    if (!amt || isNaN(amt) || Number(amt) <= 0) return;
    setShowAddFunds(false);
    setShowPaying(true);
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const r = await fetch(`${API}/api/payment/create-order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ amount: Number(amt), customerName: u.name || 'Driver', customerPhone: phone(), customerEmail: u.email || '', purpose: 'WALLET' })
      });
      const d = await r.json();
      const url = d?.intentURL || d?.data?.intentURL || d?.checkoutUrl || d?.data?.checkoutUrl;
      if (url) { window.location.href = url; } else { toast.error('Payment gateway error.'); setShowPaying(false); }
    } catch { toast.error('Network error.'); setShowPaying(false); }
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

  const confirmLogout = () => setShowLogoutConfirm(true);
  // Notification nudge: show after 7s if not already dismissed
  useEffect(() => {
    if (localStorage.getItem('mg_notif_nudge_dismissed')) return;
    if ('Notification' in window && Notification.permission === 'granted') return;
    const t = setTimeout(() => setShowNotifNudge(true), 7000);
    return () => clearTimeout(t);
  }, []);
  // SOS alarm: SW postMessage → Web Audio alarm
  useEffect(() => {
    function playSOSAlarm() {
      try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        function beep(freq, startAt, dur) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'square'; osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.7, ctx.currentTime + startAt);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + dur);
          osc.start(ctx.currentTime + startAt);
          osc.stop(ctx.currentTime + startAt + dur + 0.05);
        }
        [0, 0.25, 0.5].forEach(function(t) { beep(880, t, 0.15); });
        [0.9, 1.35, 1.8].forEach(function(t) { beep(440, t, 0.35); });
        [2.4, 2.65, 2.9].forEach(function(t) { beep(880, t, 0.15); });
      } catch(e) {}
    }
    function onSWMessage(e) {
      if (e.data && e.data.type === 'SOS_ALARM') playSOSAlarm();
    }
    navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', onSWMessage);
    return () => { navigator.serviceWorker && navigator.serviceWorker.removeEventListener('message', onSWMessage); };
  }, []);

  // Passkey nudge: show once if driver has no passkey and hasn't been asked in 7 days
  useEffect(() => {
    const dismissed = localStorage.getItem('mg_passkey_nudge_dismissed');
    if (dismissed && Date.now() < parseInt(dismissed)) return;
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    if (!u.mobile_number) return;
    setTimeout(async () => {
      try {
        const res = await fetch(API + '/api/auth/passkey/auth-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone_number: u.mobile_number, role: 'DRIVER' }),
        });
        const data = await res.json();
        if (!data.hasPasskey) setShowPasskeyNudge(true);
      } catch { /* silent */ }
    }, 4000);
  }, []);

  const enrollDriverPasskey = async () => {
    setEnrollingPasskey(true);
    try {
      const tk = localStorage.getItem('token');
      const optRes = await fetch(API + '/api/auth/passkey/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk },
      });
      const optData = await optRes.json();
      if (!optData.success) throw new Error(optData.message);
      const { startRegistration } = await import('@simplewebauthn/browser');
      const regResponse = await startRegistration(optData.options);
      await fetch(API + '/api/auth/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk },
        body: JSON.stringify(regResponse),
      });
    } catch (e) { console.warn('Driver passkey enroll:', e.message); }
    setEnrollingPasskey(false);
    setShowPasskeyNudge(false);
    localStorage.setItem('mg_passkey_nudge_dismissed', (Date.now() + 30 * 24 * 3600 * 1000).toString());
  };

  const dismissPasskeyNudge = () => {
    setShowPasskeyNudge(false);
    localStorage.setItem('mg_passkey_nudge_dismissed', (Date.now() + 7 * 24 * 3600 * 1000).toString());
  };

  const requestNotifPermission = async () => {
    setShowNotifNudge(false);
    localStorage.setItem('mg_notif_nudge_dismissed', '1');
    if ('Notification' in window) {
      await Notification.requestPermission();
    }
  };

  const dismissNotifNudge = () => {
    setShowNotifNudge(false);
    localStorage.setItem('mg_notif_nudge_dismissed', '1');
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
      const r = await fetch(`${API}/api/kyc/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` }, body: JSON.stringify({ ...body, phone: phone() }) });
      return await r.json();
    } catch (e) { return { success: false, message: e.message }; }
    finally { setKycLoading(''); }
  };

  const kycVerifyPAN = async () => {
    if (!kycState.pan.value || kycState.pan.value.length !== 10) return toast.error('Enter valid PAN');
    const r = await kycCall('verify-pan', { pan_number: kycState.pan.value.toUpperCase() }, 'pan');
    if (r.verified) { setKycState(s => ({ ...s, pan: { ...s.pan, status: 'verified', verifiedName: r.name } })); toast.success(`PAN Verified: ${r.name}`); }
    else { setKycState(s => ({ ...s, pan: { ...s.pan, status: 'failed' } })); toast.error(r.message || 'Verification failed'); }
  };
  const kycAadhaarInit = async () => {
    if (kycState.aadhaar.value.length !== 12) return toast.error('Enter 12-digit Aadhaar');
    const r = await kycCall('aadhaar-initiate', { aadhaar_number: kycState.aadhaar.value }, 'aadhaar');
    if (r.success) { setKycState(s => ({ ...s, aadhaar: { ...s.aadhaar, reqId: r.requestId, showOtp: true } })); } else toast.error(r.message || 'Failed');
  };
  const kycAadhaarVerify = async () => {
    if (!kycState.aadhaar.otp) return toast.error('Enter OTP');
    const r = await kycCall('aadhaar-verify', { request_id: kycState.aadhaar.reqId, otp: kycState.aadhaar.otp }, 'aadhaar');
    setKycState(s => ({ ...s, aadhaar: { ...s.aadhaar, status: r.verified ? 'verified' : 'failed', showOtp: false } }));
    r.verified ? toast.success('Aadhaar Verified ✓') : toast.error('Invalid OTP');
  };
  const kycVerifyDL = async () => {
    const r = await kycCall('verify-dl', { dl_number: kycState.dl.value, dob: kycState.dl.dob }, 'dl');
    setKycState(s => ({ ...s, dl: { ...s.dl, status: r.verified ? 'verified' : 'failed' } }));
    r.verified ? toast.success('DL Verified ✓') : toast.error('DL verification failed');
  };
  const kycVerifyBank = async () => {
    const r = await kycCall('verify-bank', { account_number: kycState.bank.acc, ifsc: kycState.bank.ifsc }, 'bank');
    setKycState(s => ({ ...s, bank: { ...s.bank, status: r.verified ? 'verified' : 'failed' } }));
    r.verified ? toast.success('Bank account verified ✓') : toast.error('Bank verification failed');
  };

  const statusBadge = (s) => {
    const styles = { verified: 'bg-indigo-50 text-indigo-700 border-indigo-200', failed: 'bg-red-50 text-red-600 border-red-200', pending: 'bg-slate-50 text-slate-500 border-slate-200' };
    const labels = { verified: '✓ Verified', failed: '✗ Failed', pending: 'Pending' };
    return <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${styles[s] || styles.pending}`}>{labels[s] || 'Pending'}</span>;
  };

  const driverName = user?.name || user?.full_name || 'Driver';
  const driverCode = user?.driver_code || user?.usercode || '—';

  // ── HOME TAB ─────────────────────────────────────────────────────────────
  const HomeTab = () => (
    <div className="space-y-3 pb-4">
      {kycState && kycState.aadhaar?.status !== 'verified' && (<div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-between"><span className="text-xs font-black text-amber-800">⚠️ KYC Incomplete — Complete to avoid suspension</span><button onClick={() => { setActiveTab('account'); setTab('account'); }} className="text-[10px] font-black text-amber-600 underline">Complete →</button></div>)}
      {/* Outstanding / Pay card */}
      {dues <= 0 ? (
        /* SETTLED — show simple confirmation, no pay option */
        <div style={{background:'linear-gradient(135deg,#059669 0%,#10b981 100%)',borderRadius:20,padding:20,display:'flex',alignItems:'center',gap:16}}>
          <div style={{width:52,height:52,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <CheckCircle size={26} color="white"/>
          </div>
          <div>
            <p style={{fontSize:16,fontWeight:900,color:'white'}}>All Settled ✓</p>
            <p style={{fontSize:10,color:'rgba(255,255,255,0.65)',marginTop:3}}>No dues pending. You're up to date.</p>
          </div>
        </div>
      ) : companyPayMode === 'CASH_ONLY' ? (
        /* DUES PENDING but CASH ONLY — show amount, no pay button */
        <div style={{background:'linear-gradient(135deg,#b45309 0%,#f59e0b 100%)',borderRadius:20,padding:20}}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p style={{fontSize:10,fontWeight:900,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.6)',marginBottom:6}}>{t.outstanding}</p>
              <p style={{fontSize:36,fontWeight:900,color:'white',fontFamily:'monospace',letterSpacing:'-0.02em',lineHeight:1}}><span style={{fontSize:20,opacity:.7,marginRight:2}}>₹</span>{dues.toLocaleString('en-IN')}</p>
            </div>
            <span style={{fontSize:10,fontWeight:900,background:'rgba(0,0,0,0.2)',color:'white',padding:'4px 12px',borderRadius:20}}>Due</span>
          </div>
          <div style={{background:'rgba(0,0,0,0.15)',borderRadius:12,padding:'10px 14px',color:'white',fontSize:12,fontWeight:700}}>
            💵 Pay cash directly to your fleet owner
          </div>
        </div>
      ) : (
        /* DUES PENDING + ONLINE ALLOWED — show pay card */
        <div style={{background:'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)',borderRadius:20,padding:20}}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <p style={{fontSize:10,fontWeight:900,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.6)',marginBottom:6}}>{t.outstanding}</p>
              <p style={{fontSize:36,fontWeight:900,color:'white',fontFamily:'monospace',letterSpacing:'-0.02em',lineHeight:1}}><span style={{fontSize:20,opacity:.7,marginRight:2}}>₹</span>{dues.toLocaleString('en-IN')}</p>
              {telemetry.dailyRent > 0 && <p style={{fontSize:10,color:'rgba(255,255,255,0.55)',marginTop:4}}>₹{telemetry.dailyRent}/day{telemetry.dailyDepositRecovery > 0 ? ` · +₹${telemetry.dailyDepositRecovery} deposit` : ''}</p>}
            </div>
            <span style={{fontSize:10,fontWeight:900,background:'rgba(255,255,255,0.2)',color:'white',padding:'4px 12px',borderRadius:20}}>{t.duesPending}</span>
          </div>
          {assignedVehicle?.assignedSince && (() => {
            const since = new Date(assignedVehicle.assignedSince);
            const now = new Date();
            const daysPassed = Math.max(0, Math.floor((now - since) / 86400000));
            const cycleDay = (daysPassed % 30) || 30;
            const pct = Math.min(100, Math.round((cycleDay / 30) * 100));
            return (
              <div style={{marginTop:12,marginBottom:14}}>
                <div style={{background:'rgba(255,255,255,0.2)',borderRadius:10,height:5}}>
                  <div style={{background:'white',borderRadius:10,height:5,width:`${pct}%`,transition:'width 1s ease'}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:5,fontSize:9,color:'rgba(255,255,255,0.5)',fontWeight:700}}>
                  <span>Day {cycleDay} of 30</span><span>{100-pct}% remaining</span>
                </div>
              </div>
            );
          })()}
          <div style={{background:'rgba(0,0,0,0.18)',borderRadius:14,padding:'8px 14px',display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <span style={{color:'rgba(255,255,255,0.5)',fontWeight:900,fontSize:18}}>₹</span>
            <input type="number" value={payAmt} onChange={e => setPayAmt(Number(e.target.value))}
              style={{flex:1,background:'transparent',border:'none',outline:'none',fontSize:22,fontWeight:900,fontFamily:'monospace',color:'white'}}/>
          </div>
          <button onClick={pay}
            style={{width:'100%',background:'white',color:'#4f46e5',fontWeight:900,padding:'14px',borderRadius:14,fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',gap:8,border:'none',cursor:'pointer',boxShadow:'0 4px 14px rgba(0,0,0,0.2)',transition:'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)'}}
            onTouchStart={e=>{e.currentTarget.style.transform='scale(0.97)';try{navigator.vibrate&&navigator.vibrate(30)}catch{}}}
            onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}
            onMouseDown={e=>e.currentTarget.style.transform='scale(0.97)'}
            onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}>
            <CreditCard size={16}/> {t.pay}
          </button>
        </div>
      )}

      {/* Vehicle info strip */}
      {assignedVehicle && (
        <button onClick={() => setShowVehicleDetail(true)} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between active:bg-slate-50 transition text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Truck size={14} className="text-indigo-600"/>
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">{assignedVehicle.number}</p>
              <p className="text-[9px] text-slate-400">{assignedVehicle.model}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-indigo-600">₹{assignedVehicle.dailyRent}/day</p>
            <span className="text-[11px] font-black text-slate-400 flex items-center gap-1 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block animate-pulse"/>Active · tap for details
            </span>
          </div>
        </button>
      )}
      {fleetOwner ? (
        <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 text-base font-bold shrink-0">
              {fleetOwner.charAt(0)}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium mb-0.5">Fleet Owner</p>
              <p className="text-sm font-semibold text-slate-800">{fleetOwner}</p>
              {fleetCompany ? <p className="text-[10px] text-slate-400 mt-0.5">{fleetCompany}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"/>
            <span className="text-[10px] text-slate-400 font-medium">Active</span>
          </div>
        </div>
      ) : null}

      {/* Recent transactions */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xs font-semibold text-slate-500">{t.recent}</h3>
          <button onClick={() => { setHistoryFrom('transaction'); setTab('wallet'); setActiveTab('wallet'); }}
            className="text-[10px] text-indigo-600 font-black flex items-center gap-1">{t.viewAll} <ArrowUpRight size={10}/></button>
        </div>
        <div className="divide-y divide-slate-50">
          {payments.slice(0, 3).map((p, i) => (
            <div key={i} onClick={() => { setSelTxn(p); setShowReceipt(true); }}
              className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition">
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${p.status === 'SUCCESS' ? 'bg-indigo-50' : 'bg-slate-100'}`}>
                  {p.status === 'SUCCESS' ? <CheckCircle size={12} className="text-indigo-600"/> : <Clock size={12} className="text-slate-400"/>}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800">{p.type}</p>
                  <p className="text-[9px] text-slate-400 font-mono">{p.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className={`text-sm font-black ${p.status === 'SUCCESS' ? 'text-slate-800' : 'text-slate-400'}`}>₹{p.amount}</p>
                <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />
              </div>
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
      <div className="space-y-3 pb-4 tab-fade">
        {historyFrom === 'transaction' && (
          <button onClick={() => { setHistoryFrom('tab'); setTab('home'); setActiveTab('dashboard'); }}
            className="flex items-center gap-1 text-indigo-600 font-black text-sm bg-white border border-slate-200 px-3 py-2 rounded-xl">
            <ChevronLeft size={15}/> Back to Dashboard
          </button>
        )}

        {/* Balance card */}
        <div style={{background:'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)',borderRadius:20,padding:20}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
            <p style={{fontSize:10,fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.4)'}}>{t.availableFloat}</p>
            <button onClick={() => setShowBal(!showBalance)} style={{background:'rgba(255,255,255,0.08)',border:'none',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'rgba(255,255,255,0.5)',display:'flex',alignItems:'center'}}>
              {showBalance ? <EyeOff size={12}/> : <Eye size={12}/>}
            </button>
          </div>
          <p style={{fontSize:36,fontWeight:900,color:'white',fontFamily:'monospace',letterSpacing:'-0.02em',lineHeight:1,marginBottom:16}}>
            <span style={{fontSize:20,opacity:.5,marginRight:2}}>₹</span>
            {showBalance ? <AnimatedNumber value={wallet} decimals={0} /> : '••••'}
          </p>
          <button onClick={addFloat} style={{width:'100%',background:'rgba(99,102,241,0.85)',border:'none',borderRadius:14,padding:'11px',color:'white',fontSize:13,fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,backdropFilter:'blur(8px)'}}>
            <PlusCircle size={14}/> {t.addFloat2}
          </button>
          <button
            onClick={() => toast.error('Payout request sent! Your fleet owner will process it within 24 hours.')}
            style={{width:'100%',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:14,padding:'9px',color:'rgba(255,255,255,0.7)',fontSize:12,fontWeight:700,cursor:'pointer',marginTop:8,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <ArrowUpCircle size={13}/> {t.requestPayout2}
          </button>
        </div>

        {/* Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t.paymentSummary2}</p>
          <div className="grid grid-cols-2 gap-3">
            <div style={{background:'linear-gradient(135deg,#ecfdf5,#d1fae5)',borderRadius:14,padding:'14px 12px',border:'1px solid #a7f3d0'}}>
              <p style={{fontSize:9,fontWeight:700,color:'#059669',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>✓ {t.totalPaidLabel}</p>
              <p style={{fontSize:20,fontWeight:900,color:'#065f46',fontFamily:'monospace'}}>₹{totalPaid.toLocaleString('en-IN')}</p>
            </div>
            <div style={{background:dues > 0 ? 'linear-gradient(135deg,#fffbeb,#fef3c7)' : 'linear-gradient(135deg,#f8fafc,#f1f5f9)',borderRadius:14,padding:'14px 12px',border:`1px solid ${dues > 0 ? '#fde68a' : '#e2e8f0'}`}}>
              <p style={{fontSize:9,fontWeight:700,color:dues > 0 ? '#b45309':'#94a3b8',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>{dues > 0 ? '⏳' : '—'} {t.outstandingLabel}</p>
              <p style={{fontSize:20,fontWeight:900,color:dues > 0 ? '#92400e':'#64748b',fontFamily:'monospace'}}>₹{dues.toLocaleString('en-IN')}</p>
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
                className="px-4 py-3 flex items-center gap-3 press-card card-enter hover:bg-slate-50/50">
                {/* Status icon */}
                <div style={{
                  width:38,height:38,borderRadius:12,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                  background: p.status === 'SUCCESS' ? '#ecfdf5' : p.status === 'PENDING' ? '#fffbeb' : '#fef2f2'
                }}>
                  {p.status === 'SUCCESS'
                    ? <svg width={16} height={16} fill="none" stroke="#059669" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    : p.status === 'PENDING'
                    ? <svg width={16} height={16} fill="none" stroke="#b45309" strokeWidth={2.5} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    : <svg width={16} height={16} fill="none" stroke="#dc2626" strokeWidth={2.5} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  }
                </div>
                {/* Text */}
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{p.type}</p>
                  <p style={{fontSize:10,color:'#94a3b8',fontFamily:'monospace',marginTop:2}}>{p.date}</p>
                </div>
                {/* Amount + status */}
                <div style={{textAlign:'right',flexShrink:0}}>
                  <p style={{fontSize:15,fontWeight:800,color: p.status === 'SUCCESS' ? '#059669' : p.status === 'PENDING' ? '#b45309' : '#dc2626',fontFamily:'monospace'}}>
                    ₹{parseFloat(p.amount).toLocaleString('en-IN')}
                  </p>
                  <span style={{
                    fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,display:'inline-block',marginTop:3,
                    background: p.status === 'SUCCESS' ? '#ecfdf5' : p.status === 'PENDING' ? '#fffbeb' : '#fef2f2',
                    color: p.status === 'SUCCESS' ? '#059669' : p.status === 'PENDING' ? '#b45309' : '#dc2626',
                  }}>
                    {p.status === 'SUCCESS' ? '✓ Paid' : p.status === 'PENDING' ? '⏳ Pending' : p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {payments.length > 5 && (
            <div className="px-4 py-3 border-t border-slate-100">
              <button onClick={() => setShowAll(!showAll)}
                className="w-full text-[11px] font-black text-indigo-600 py-2 rounded-xl hover:bg-indigo-50 transition">
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
              <p className="p-4 text-center text-[11px] text-slate-400">Track your daily income here — only you can see this. Tap '+ Add' to log today's earnings.</p>
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
    const [uploadPreview, setUploadPreview] = useState(null); // { docType, file, dataUrl, ocrFields }
    const [uploading, setUploading]         = useState(false);
    const [uploadDone, setUploadDone]       = useState('');
    const [ocrLoading, setOcrLoading]       = useState(false);

    const selectForPreview = (docType, file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = file.type.startsWith('image/') ? e.target.result : null;
        setUploadPreview({ docType, file, dataUrl, ocrFields: null });

        if (!file.type.startsWith('image/')) return;

        setOcrLoading(true);
        try {
          const formData = new FormData();
          formData.append('document', file);
          formData.append('doc_type', docType);
          const res  = await fetch(`${API}/api/kyc/ocr`, {
            method:  'POST',
            headers: { Authorization: `Bearer ${tk()}` },
            body:    formData,
          });
          const data = await res.json();
          if (data.success && data.fields) {
            const f = data.fields;

            if (docType === 'AADHAAR' && f.aadhaar_number) {
              setKycState(s => ({ ...s, aadhaar: { ...s.aadhaar, value: f.aadhaar_number.replace(/\D/g,'').slice(0,12) } }));
            }
            if (docType === 'PAN' && f.pan_number) {
              setKycState(s => ({ ...s, pan: { ...s.pan, value: f.pan_number.toUpperCase() } }));
            }
            if (docType === 'DL') {
              if (f.dl_number) setKycState(s => ({ ...s, dl: { ...s.dl, value: f.dl_number } }));
              if (f.dob)       setKycState(s => ({ ...s, dl: { ...s.dl, dob: f.dob } }));
            }
            if (docType === 'BANK') {
              if (f.account_number) setKycState(s => ({ ...s, bank: { ...s.bank, acc: f.account_number } }));
              if (f.ifsc)           setKycState(s => ({ ...s, bank: { ...s.bank, ifsc: f.ifsc.toUpperCase() } }));
            }

            setUploadPreview(prev => prev ? { ...prev, ocrFields: f } : prev);
          }
        } catch (err) {
          console.warn('OCR failed (non-critical):', err);
        } finally {
          setOcrLoading(false);
        }
      };
      reader.readAsDataURL(file);
    };

    const confirmUpload = async () => {
      if (!uploadPreview || uploading) return;
      setUploading(true);
      const { docType, file } = uploadPreview;
      const formData = new FormData();
      formData.append('document', file);
      formData.append('type', docType);
      formData.append('phone', phone());
      try {
        const res = await fetch(`${API}/api/kyc/upload-document`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tk()}` },
          body: formData
        });
        const data = await res.json();
        setUploadPreview(null);
        if (data.success) {
          setUploadDone(`✅ ${docType} submitted for admin review!`);
          setTimeout(() => setUploadDone(''), 4000);
        } else {
          toast.error('Upload failed: ' + (data.message || ''));
        }
      } catch { toast.error('Upload failed — network error'); }
      finally { setUploading(false); }
    };

    return (
      <div className="space-y-3 pb-4">

      {/* ── Document Upload Preview Sheet ── */}
      {uploadPreview && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-300 rounded-full"/>
            </div>
            {/* Header */}
            <div className="px-5 pb-3 pt-2 border-b border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Preview</p>
              <p className="text-base font-black text-slate-800">{uploadPreview.docType.replace(/_/g,' ')}</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">{uploadPreview.file.name}</p>
              <p className="text-[10px] text-slate-400">{(uploadPreview.file.size / 1024).toFixed(0)} KB</p>
            </div>
            {/* Preview */}
            <div className="p-4">
              {uploadPreview.dataUrl ? (
                <img
                  src={uploadPreview.dataUrl}
                  alt="document preview"
                  className="w-full max-h-64 object-contain rounded-2xl border border-slate-200 bg-slate-50"
                />
              ) : (
                <div className="w-full h-36 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-2">
                  <span className="text-4xl">📄</span>
                  <span className="text-xs font-black text-slate-500">PDF Document</span>
                </div>
              )}
              {/* OCR loading */}
              {ocrLoading && (
                <div className="mt-2 flex items-center justify-center gap-2 text-xs text-indigo-600 font-black animate-pulse">
                  <span className="animate-spin">🔍</span> Reading document…
                </div>
              )}
              {/* OCR extracted fields */}
              {uploadPreview.ocrFields && !ocrLoading && (
                <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-2xl p-3">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">✨ Auto-filled from document</p>
                  {Object.entries(uploadPreview.ocrFields)
                    .filter(([k, v]) => v && k !== 'raw')
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center py-1 border-b border-indigo-100 last:border-0">
                        <span className="text-[10px] text-indigo-400 font-black capitalize">{k.replace(/_/g,' ')}</span>
                        <span className="text-xs font-black text-indigo-800 truncate max-w-[55%] text-right">{v}</span>
                      </div>
                    ))
                  }
                  <p className="text-[10px] text-indigo-400 mt-2 text-center">Fields filled ↑ — verify before submitting</p>
                </div>
              )}
              {!ocrLoading && !uploadPreview.ocrFields && (
                <p className="text-[10px] text-slate-400 text-center mt-2">
                  ✅ Upload ho jaega aur admin review karega
                </p>
              )}
            </div>
            {/* Actions */}
            <div className="px-4 pb-8 grid grid-cols-2 gap-3">
              <button
                onClick={() => setUploadPreview(null)}
                className="py-3.5 bg-slate-100 text-slate-700 font-black rounded-2xl text-sm hover:bg-slate-200 transition">
                Cancel
              </button>
              <button
                onClick={confirmUpload}
                disabled={uploading || ocrLoading}
                className="py-3.5 bg-indigo-600 text-white font-black rounded-2xl text-sm hover:bg-indigo-700 disabled:opacity-60 transition flex items-center justify-center gap-2">
                {uploading ? <><span className="animate-spin">⏳</span> Uploading…</> : ocrLoading ? <><span className="animate-spin">🔍</span> Reading…</> : '✅ Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload success toast */}
      {uploadDone && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-sm font-black text-emerald-700 text-center">
          {uploadDone}
        </div>
      )}
        {/* Profile card — fixed layout */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-indigo-600 px-5 pt-6 pb-5">
            <div className="flex flex-col items-center text-white text-center">
              <div className="w-16 h-16 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center text-2xl font-black mb-3">
                {driverName.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-lg font-black tracking-tight">{driverName}</h2>
              <p className="text-sm text-indigo-100 mt-0.5">{phone()}</p>
              <p className="text-[10px] text-indigo-200 font-mono mt-0.5">{driverCode}</p>
            </div>
          </div>
          {/* Status + vehicle — BELOW blue header, outside overflow */}
          <div className="px-4 py-3 bg-white flex items-center justify-between border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${assignedVehicle ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`}/>
              <span className="text-xs font-black text-slate-700">{assignedVehicle ? 'Active' : 'Inactive'}</span>
            </div>
            {assignedVehicle && (
              <div className="text-right">
                <p className="text-sm font-black text-slate-800">{assignedVehicle.number}</p>
                <p className="text-[9px] text-slate-400">{assignedVehicle.model} · ₹{assignedVehicle.dailyRent}/day</p>
              </div>
            )}
          </div>
          {fleetOwner && (
            <div className="px-4 py-3 bg-white flex items-center justify-between border-t border-slate-100">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Fleet Owner</p>
                <p className="text-xs font-black text-slate-700">{fleetOwner}</p>
                {fleetCompany ? <p className="text-[9px] text-slate-400">{fleetCompany}</p> : null}
              </div>
              <span className="text-[9px] text-indigo-600 font-black bg-indigo-50 px-2 py-1 rounded">OWNER</span>
            </div>
          )}
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

          {(() => {
  const total = 4;
  const done = [kycState?.aadhaar?.status, kycState?.pan?.status, kycState?.dl?.status, kycState?.bank?.status].filter(s => s === 'verified').length;
  return (
    <div className="mb-4 p-3 bg-indigo-50 rounded-xl">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-black text-indigo-700">KYC Progress</span>
        <span className="text-xs font-black text-indigo-700">{done}/{total} verified</span>
      </div>
      <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{width: `${(done/total)*100}%`}} />
      <ToastContainer />
      {showTour && <Onboarding role="driver" onDone={dismissTour} />}
      <OfflineBanner />
      </div>
    </div>
  );
})()}

          {/* Aadhaar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-black text-slate-800 flex items-center gap-2"><Fingerprint size={14} className="text-indigo-600"/> Aadhaar</span>
              {statusBadge(kycState.aadhaar.status)}
            </div>
            <div className="flex gap-2 mb-2">
              <input value={kycState.aadhaar.value} maxLength={12}
                onChange={e => setKycState(s => ({ ...s, aadhaar: { ...s.aadhaar, value: e.target.value.replace(/\D/g,'').slice(0,12) } }))}
                placeholder="12-digit Aadhaar" className="flex-1 border border-slate-200 rounded-xl p-2.5 font-mono text-sm bg-slate-50 focus:outline-none focus:border-indigo-500"/>
              <button onClick={kycAadhaarInit} disabled={kycLoading === 'aadhaar'}
                className="bg-indigo-600 text-white px-4 rounded-xl text-xs font-black hover:bg-indigo-700 transition">OTP</button>
            </div>
            {kycState.aadhaar.showOtp && (
              <div className="flex gap-2 mb-2">
                <input value={kycState.aadhaar.otp} onChange={e => setKycState(s => ({ ...s, aadhaar: { ...s.aadhaar, otp: e.target.value } }))}
                  placeholder="Enter OTP" className="flex-1 border border-slate-200 rounded-xl p-2.5 font-mono text-sm bg-slate-50 focus:outline-none focus:border-indigo-500"/>
                <button onClick={kycAadhaarVerify} className="bg-slate-800 text-white px-4 rounded-xl text-xs font-black">Verify</button>
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <label className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 cursor-pointer hover:bg-slate-100 border border-slate-200 border-dashed">
                <FolderOpen size={11}/> Gallery
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => selectForPreview('AADHAAR', e.target.files[0])}/>
              </label>
              <label className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-50 rounded-xl text-[10px] font-black text-indigo-600 cursor-pointer hover:bg-indigo-100 border border-indigo-200 border-dashed">
                <Camera size={11}/> Camera
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => selectForPreview('AADHAAR', e.target.files[0])}/>
              </label>
            </div>
          </div>

          {/* PAN */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-black text-slate-800 flex items-center gap-2"><FileText size={14} className="text-indigo-600"/> PAN</span>
              {statusBadge(kycState.pan.status)}
            </div>
            <div className="flex gap-2 mb-2">
              <input value={kycState.pan.value} maxLength={10}
                onChange={e => setKycState(s => ({ ...s, pan: { ...s.pan, value: e.target.value.toUpperCase() } }))}
                placeholder="ABCDE1234F" className="flex-1 border border-slate-200 rounded-xl p-2.5 font-mono text-sm uppercase bg-slate-50 focus:outline-none focus:border-indigo-500"/>
              <button onClick={kycVerifyPAN} disabled={kycLoading === 'pan'}
                className="bg-indigo-600 text-white px-4 rounded-xl text-xs font-black hover:bg-indigo-700 transition">Verify</button>
            </div>
            {kycState.pan.verifiedName && <p className="text-[10px] text-indigo-600 font-black mb-2">✓ {kycState.pan.verifiedName}</p>}
            <div className="flex gap-2">
              <label className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 cursor-pointer hover:bg-slate-100 border border-slate-200 border-dashed">
                <FolderOpen size={11}/> Gallery
                <input type="file" accept="image/*" className="hidden" onChange={e => selectForPreview('PAN', e.target.files[0])}/>
              </label>
              <label className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-50 rounded-xl text-[10px] font-black text-indigo-600 cursor-pointer hover:bg-indigo-100 border border-indigo-200 border-dashed">
                <Camera size={11}/> Camera
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => selectForPreview('PAN', e.target.files[0])}/>
              </label>
            </div>
          </div>

          {/* DL */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-black text-slate-800 flex items-center gap-2"><FileCheck2 size={14} className="text-indigo-600"/> Driving License</span>
              {statusBadge(kycState.dl.status)}
            </div>
            <div className="flex gap-2 mb-2">
              <input value={kycState.dl.value}
                onChange={e => setKycState(s => ({ ...s, dl: { ...s.dl, value: e.target.value.toUpperCase() } }))}
                placeholder="License Number" className="flex-1 border border-slate-200 rounded-xl p-2.5 font-mono text-sm bg-slate-50 focus:outline-none focus:border-indigo-500"/>
              <button onClick={kycVerifyDL} disabled={kycLoading === 'dl'}
                className="bg-indigo-600 text-white px-4 rounded-xl text-xs font-black hover:bg-indigo-700 transition">Verify</button>
            </div>
            <input type="date" value={kycState.dl.dob}
              onChange={e => setKycState(s => ({ ...s, dl: { ...s.dl, dob: e.target.value } }))}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm mb-2 bg-slate-50 focus:outline-none focus:border-indigo-500"/>
            <div className="flex gap-2">
              <label className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 cursor-pointer hover:bg-slate-100 border border-slate-200 border-dashed">
                <FolderOpen size={11}/> Gallery
                <input type="file" accept="image/*" className="hidden" onChange={e => selectForPreview('DL', e.target.files[0])}/>
              </label>
              <label className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-50 rounded-xl text-[10px] font-black text-indigo-600 cursor-pointer hover:bg-indigo-100 border border-indigo-200 border-dashed">
                <Camera size={11}/> Camera
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => selectForPreview('DL', e.target.files[0])}/>
              </label>
            </div>
          </div>

          {/* Bank */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-black text-slate-800 flex items-center gap-2"><Landmark size={14} className="text-indigo-600"/> Bank Account</span>
              {statusBadge(kycState.bank.status)}
            </div>
            <input value={kycState.bank.acc}
              onChange={e => setKycState(s => ({ ...s, bank: { ...s.bank, acc: e.target.value } }))}
              placeholder="Account Number" className="w-full border border-slate-200 rounded-xl p-2.5 text-sm mb-2 bg-slate-50 focus:outline-none focus:border-indigo-500"/>
            <div className="flex gap-2 mb-2">
              <input value={kycState.bank.ifsc}
                onChange={e => setKycState(s => ({ ...s, bank: { ...s.bank, ifsc: e.target.value.toUpperCase() } }))}
                placeholder="IFSC Code" className="flex-1 border border-slate-200 rounded-xl p-2.5 font-mono text-sm uppercase bg-slate-50 focus:outline-none focus:border-indigo-500"/>
              <button onClick={kycVerifyBank} disabled={kycLoading === 'bank'}
                className="bg-indigo-600 text-white px-4 rounded-xl text-xs font-black hover:bg-indigo-700 transition">Verify</button>
            </div>
            <div className="flex gap-2">
              <label className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 cursor-pointer hover:bg-slate-100 border border-slate-200 border-dashed">
                <FolderOpen size={11}/> Gallery
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => selectForPreview('BANK', e.target.files[0])}/>
              </label>
              <label className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-50 rounded-xl text-[10px] font-black text-indigo-600 cursor-pointer hover:bg-indigo-100 border border-indigo-200 border-dashed">
                <Camera size={11}/> Camera
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => selectForPreview('BANK', e.target.files[0])}/>
              </label>
            </div>
          </div>
        </div>

        <button onClick={confirmLogout} className="w-full bg-white border border-slate-200 text-red-500 font-black py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 hover:border-red-200 hover:bg-red-50 transition">
          <LogOut size={13}/> {t.logout}
        </button>
      </div>
    );
  };

  // ── STATIONS TAB ──────────────────────────────────────────────────────────
  // Stations with real coordinates — sorted by GPS distance from driver
  // TODO: Replace with live API — these are demo stations only
  const ALL_STATIONS = [
    { id: 1, name: 'Dwarka Sec 10 Swap Point', type: 'Battery Swap', address: 'Sector 10 Market, Dwarka, Delhi',   lat: 28.5734, lng: 77.0539, slots: 4, open: true },
    { id: 2, name: 'Uttam Nagar EV Hub',       type: 'Fast Charge',  address: 'Uttam Nagar West, New Delhi',       lat: 28.6219, lng: 77.0494, slots: 2, open: true },
    { id: 3, name: 'Janakpuri Swap Station',   type: 'Battery Swap', address: 'C-Block, Janakpuri, Delhi',         lat: 28.6282, lng: 77.0830, slots: 0, open: true },
    { id: 4, name: 'Dwarka Mor Charge Point',  type: 'Fast Charge',  address: 'Dwarka Mor Metro, Delhi',           lat: 28.6131, lng: 77.0430, slots: 3, open: true },
    { id: 5, name: 'Palam EV Station',         type: 'Battery Swap', address: 'Palam Village Road, Delhi',         lat: 28.5968, lng: 77.0744, slots: 1, open: false },
    { id: 6, name: 'Najafgarh Road Swap Hub',  type: 'Battery Swap', address: 'Najafgarh Rd, Dwarka, Delhi',       lat: 28.5890, lng: 77.0214, slots: 6, open: true },
    { id: 7, name: 'Connaught Place EV Point', type: 'Fast Charge',  address: 'Connaught Place, New Delhi',        lat: 28.6315, lng: 77.2167, slots: 5, open: true },
    { id: 8, name: 'Lajpat Nagar Swap Hub',   type: 'Battery Swap', address: 'Lajpat Nagar Market, Delhi',        lat: 28.5677, lng: 77.2432, slots: 2, open: true },
    { id: 9, name: 'Noida Sec 18 Charge',     type: 'Fast Charge',  address: 'Sector 18, Noida, UP',              lat: 28.5706, lng: 77.3216, slots: 4, open: true },
    { id:10, name: 'Gurugram Cyber Hub EV',   type: 'Fast Charge',  address: 'DLF Cyber Hub, Gurugram',           lat: 28.4950, lng: 77.0888, slots: 3, open: true },
  ];

  const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const StationsTab = () => {
    const [driverPos, setDriverPos] = React.useState(null);
    const [gpsError, setGpsError]   = React.useState(false);
    const [filter, setFilter]        = React.useState('All');

    React.useEffect(() => {
      if (!navigator.geolocation) { setGpsError(true); return; }
      navigator.geolocation.getCurrentPosition(
        function(pos) { setDriverPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
        function()    { setGpsError(true); },
        { timeout: 8000, maximumAge: 60000 }
      );
    }, []);

    var stations = ALL_STATIONS.map(function(s) {
      return Object.assign({}, s, {
        distance: driverPos ? haversineKm(driverPos.lat, driverPos.lng, s.lat, s.lng) : null,
      });
    });
    if (filter !== 'All') stations = stations.filter(function(s) { return s.type === filter; });
    if (driverPos) stations.sort(function(a, b) { return a.distance - b.distance; });

    var openDirections = function(s) {
      window.open('https://www.google.com/maps/dir/?api=1&destination=' + s.lat + ',' + s.lng, '_blank');
    };

    return (
      <div className="space-y-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-800">Nearby Stations</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {driverPos ? 'Sorted by distance from you' : 'Battery swap & EV charging points'}
            </p>
          </div>
          {gpsError ? (
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-100 text-red-600 border border-red-200">
              GPS off
            </span>
          ) : !driverPos ? (
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 animate-pulse">
              Locating
            </span>
          ) : (
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
              Near you
            </span>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {['All', 'Battery Swap', 'Fast Charge'].map(function(f) { return (
            <button
              key={f}
              onClick={function() { setFilter(f); }}
              className={'shrink-0 text-[11px] font-black px-3 py-1.5 rounded-full border transition ' + (
                filter === f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600'
              )}
            >
              {f}
            </button>
          ); })}
        </div>

        {/* Demo banner */}
        <div className="mx-4 mb-3 bg-amber-100 border border-amber-300 rounded-xl p-3 text-center"><p className="text-xs font-black text-amber-800">⚠️ Demo Data Only</p><p className="text-[10px] text-amber-700 mt-0.5">Live station availability coming soon. Do not rely on this data.</p></div>
        {/* Station cards */}
        <div className="space-y-3">
          {stations.map(function(s) { return (
            <div key={s.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-slate-800 leading-tight">{s.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={10} className="text-slate-400 shrink-0"/>
                    <p className="text-[10px] text-slate-400 truncate">{s.address}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={'text-[10px] font-black px-2 py-0.5 rounded-full ' + (s.open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
                    {s.open ? 'Open' : 'Closed'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Zap size={11} className={s.type === 'Battery Swap' ? 'text-amber-500' : 'text-indigo-500'}/>
                    <span className="text-[10px] font-black text-slate-500">{s.type}</span>
                  </div>
                  {s.distance !== null && s.distance !== undefined && (
                    <span className="text-[10px] font-black text-indigo-600">{s.distance.toFixed(1)} km</span>
                  )}
                  <div className="flex items-center gap-1">
                    <Battery size={11} className={s.slots > 0 ? 'text-green-500' : 'text-red-400'}/>
                    <span className={'text-[10px] font-black ' + (s.slots > 0 ? 'text-green-600' : 'text-red-500')}>
                      {s.slots > 0 ? s.slots + ' slots' : 'Full'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={function() { openDirections(s); }}
                  className="flex items-center gap-1 text-[11px] font-black px-3 py-1.5 bg-indigo-600 text-white rounded-xl active:bg-indigo-700 transition">
                  <Navigation size={11}/> Go
                </button>
              </div>
            </div>
          ); })}
        </div>

        {/* Partner notice */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
          <Zap size={20} className="text-indigo-400 mx-auto mb-2"/>
          <p className="text-[12px] font-black text-indigo-700">Real-time station data</p>
          <p className="text-[10px] text-indigo-500 mt-1">Live availability coming soon once network partner integration is active.</p>
        </div>
      </div>
    );
  };

  // ── MAIN RENDER ───────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen bg-slate-100 flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[412px] bg-slate-50 h-full sm:max-h-[840px] flex flex-col relative overflow-hidden sm:rounded-[32px] sm:shadow-2xl sm:border sm:border-slate-200">

        {/* Status bar */}
        <div className="bg-slate-900 text-white text-[10px] px-4 py-2 flex justify-between items-center shrink-0">
          <span className="font-black tracking-widest text-indigo-400">DRIVER</span>
          <span className="font-mono text-slate-400">{time}</span>
          <div className="flex gap-1.5 items-center"><Wifi size={10} className="text-slate-400"/><Battery size={10} className="text-slate-400"/></div>
        </div>

        {/* Header */}
        <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs">MG</div>
            <div>
              <p className="text-sm font-black text-slate-800 leading-none">{tab === 'home' ? 'Dashboard' : tab === 'wallet' ? 'Wallet' : 'Account'}</p>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">{driverName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button onClick={() => setLang('en')} className={`px-2.5 py-1 text-[10px] font-black rounded-md transition ${lang==='en'?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`}>EN</button>
              <button onClick={() => setLang('hi')} className={`px-2.5 py-1 text-[10px] font-black rounded-md transition ${lang==='hi'?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`}>हिं</button>
            </div>
            <button onClick={() => setShowChatbot(true)} className="p-2 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition text-slate-500 border border-slate-200">
              <MessageCircle size={15}/>
            </button>
            <button onClick={() => { setShowNotif(!showNotif); if (!showNotif) markRead(); }} className="relative p-2 rounded-lg bg-slate-100 hover:bg-indigo-50 transition border border-slate-200">
              {unread > 0 ? <BellRing size={15} className="text-indigo-600"/> : <Bell size={15} className="text-slate-500"/>}
              {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-indigo-600 text-white text-[8px] font-black rounded-full flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
            </button>
            <ThemeToggle />
            <button onClick={confirmLogout} className="p-2 rounded-lg bg-red-50 hover:bg-red-100 transition border border-red-100">
              <LogOut size={15} className="text-red-500"/>
            </button>
          </div>
        </div>

        {/* Vehicle Detail Modal */}
        {showVehicleDetail && assignedVehicle && (
          <div className="absolute inset-0 bg-black/50 z-[70] flex items-end justify-center" onClick={() => setShowVehicleDetail(false)}>
            <div className="bg-white rounded-t-3xl w-full max-w-sm p-5 pb-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center"><Truck size={16} className="text-indigo-600"/></div>
                  <div>
                    <p className="text-base font-black text-slate-800">{assignedVehicle.number}</p>
                    <p className="text-[10px] text-slate-400">{assignedVehicle.model || '—'}</p>
                  </div>
                </div>
                <button onClick={() => setShowVehicleDetail(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X size={14} className="text-slate-500"/></button>
              </div>
              <div className="space-y-2.5 text-sm">
                {[
                  ['Vehicle Number', assignedVehicle.number],
                  ['Model', assignedVehicle.model || '—'],
                  ['Daily Rent', `₹${parseFloat(assignedVehicle.dailyRent || 0).toLocaleString('en-IN')}/day`],
                  ['Status', assignedVehicle.status || 'ACTIVE'],
                  ['Assigned Since', assignedVehicle.assignedSince ? new Date(assignedVehicle.assignedSince).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'],
                  ['Fleet Owner', fleetOwner || '—'],
                  ['Company', fleetCompany || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</span>
                    <span className={`text-xs font-black ${label==='Status' ? 'text-emerald-600' : 'text-slate-800'}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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
                    className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition ${!n.is_read ? 'bg-indigo-50/30' : ''}`}
                    onClick={() => {
                      setNotifs(prev => prev.map((x, idx) => idx === i ? { ...x, is_read: true } : x));
                      setUnread(prev => Math.max(0, prev - 1)); setShowNotif(false);
                      const title = (n.title || '').toLowerCase();
                      if (title.includes('💬') || title.includes('message')) { setShowOwnerChat(true); fetchChat(); }
                      else if (title.includes('payment') || title.includes('rent')) { setTab('wallet'); setActiveTab('wallet'); }
                    }}>
                    <p className="text-xs font-black text-slate-800">{n.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{n.message}</p>
                    {!n.is_read && <p className="text-[9px] text-indigo-500 font-black mt-0.5">Tap to view →</p>}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Content */}
        <PullToRefresh onRefresh={() => fetchAll(true)}>
        <div className="flex-1 overflow-y-auto px-4 pt-4 bg-slate-50">
          {loading ? (
            <div className="space-y-3 pt-1">
              {/* balance card skeleton */}
              <div className="skeleton" style={{height:96,borderRadius:20}} />
              {/* rent card skeleton */}
              <div className="skeleton" style={{height:80,borderRadius:20}} />
              {/* quick actions */}
              <div className="grid grid-cols-2 gap-3">
                {[...Array(2)].map((_,i) => <div key={i} className="skeleton" style={{height:72,borderRadius:16}} />)}
              </div>
              {/* recent tx */}
              <div className="skeleton-card">
                <div className="skeleton skeleton-text w-28 mb-4" />
                {[...Array(3)].map((_,i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="skeleton skeleton-avatar" style={{width:32,height:32}} />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton skeleton-text w-32" />
                      <div className="skeleton skeleton-text w-20" />
                    </div>
                    <div className="skeleton skeleton-text w-14" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div key={tab} className="tab-fade">
              {tab === 'home' && <HomeTab/>}
              {tab === 'wallet' && <WalletTab/>}
              {tab === 'stations' && <StationsTab/>}
              {tab === 'account' && <AccountTab/>}
            </div>
          )}
        </div>
        </PullToRefresh>

        {/* Emergency bar */}
        <div className="shrink-0 px-4 py-2 flex items-center justify-between" style={{ background:'#0f172a', borderTop:'1px solid #1e293b' }}>
          <button onClick={() => { setShowOwnerChat(true); fetchChat(); }}
            className="flex items-center gap-1.5 text-[10px] font-black transition active:scale-[0.96]"
            style={{color:'rgba(255,255,255,0.4)',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',borderRadius:8,padding:'6px 12px'}}>
            <MessageCircle size={11}/> Owner Chat
          </button>
          <span className="text-[9px] font-black uppercase tracking-widest" style={{color:'rgba(255,255,255,0.25)'}}>{t.emergency}</span>
          <button onClick={() => { setShowSOS(true); try{navigator.vibrate&&navigator.vibrate(50)}catch{}; }}
            className="flex items-center gap-1.5 text-[10px] font-black text-white bg-red-500 px-3 py-1.5 rounded-lg hover:bg-red-600 transition active:scale-[0.96]">
            <ShieldAlert size={11}/> {t.triggerSos}
          </button>
        </div>

        {/* Bottom nav */}
        <div className="shrink-0 w-full" style={{padding:'0 12px 10px'}}>
          <div style={{background:'#1e1b4b',borderRadius:24,padding:8,display:'flex',boxShadow:'0 -4px 30px rgba(79,70,229,0.25)'}}>
            {[
              { id: 'dashboard', tabVal: 'home',     Icon: Home,   label: 'Home' },
              { id: 'wallet',    tabVal: 'wallet',   Icon: Wallet, label: 'Wallet' },
              { id: 'stations',  tabVal: 'stations', Icon: Zap,    label: 'Stations' },
              { id: 'account',   tabVal: 'account',  Icon: User,   label: 'Account' },
            ].map(({ id, tabVal, Icon, label }) => {
              const active = activeTab === id;
              return (
                <button key={id}
                  onClick={() => { setActiveTab(id); setTab(tabVal); }}
                  style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'8px 4px',borderRadius:16,border:'none',cursor:'pointer',background:active?'rgba(99,102,241,0.25)':'transparent',color:active?'#a5b4fc':'rgba(255,255,255,0.3)',transition:'all 0.2s cubic-bezier(0.34,1.56,0.64,1)'}}>
                  <Icon size={active?20:18}/>
                  <span style={{fontSize:9,fontWeight:900,letterSpacing:'0.04em'}}>{label}</span>
                  {active && <div style={{width:4,height:4,borderRadius:'50%',background:'#6366f1'}}/>}
                </button>
              );
            })}
          </div>
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
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={24} className="text-indigo-600"/>
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
                    rows={3} className="w-full border border-slate-200 rounded-xl p-3 text-sm mb-4 focus:outline-none focus:border-indigo-500 bg-slate-50 resize-none"/>
                  <div className="flex gap-2">
                    <button onClick={() => setShowSOS(false)} className="flex-1 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-600">Cancel</button>
                    <button onClick={() => { try{navigator.vibrate&&navigator.vibrate([100,50,100])}catch{}; sendSOS(); }} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-3 rounded-xl text-sm transition active:scale-[0.96]">Send SOS</button>
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
              <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
              <p className="font-black text-slate-800 text-sm">Redirecting...</p>
              <button onClick={() => { payAbortRef.current = true; setShowPaying(false); }} className="mt-3 text-xs text-slate-400 underline">Cancel</button>
            </div>
          </div>
        )}

        {/* Payment Success overlay */}
        {paymentSuccess && (
          <div className="absolute inset-0 z-[110] flex flex-col items-center justify-center px-8"
            style={{background:'linear-gradient(160deg,#059669 0%,#0d9488 50%,#0f172a 100%)'}}
            ref={el => { if (el) { try{navigator.vibrate&&navigator.vibrate([100,50,200])}catch{} } }}>
            <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:24,boxShadow:'0 0 0 14px rgba(255,255,255,0.06)'}}>
              <CheckCircle size={44} color="white"/>
            </div>
            <h2 style={{fontSize:26,fontWeight:900,color:'white',marginBottom:4,letterSpacing:'-0.01em'}}>Payment Done!</h2>
            {paymentSuccess.amount && (
              <p style={{fontSize:42,fontWeight:900,color:'white',fontFamily:'monospace',letterSpacing:'-0.03em',marginBottom:4,lineHeight:1}}>
                <span style={{fontSize:22,opacity:.6}}>₹</span>{parseFloat(paymentSuccess.amount).toLocaleString('en-IN')}
              </p>
            )}
            <p style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginBottom:44}}>
              {paymentSuccess.timestamp.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
            <button
              onClick={() => setPaymentSuccess(null)}
              style={{width:'100%',maxWidth:280,padding:'16px',background:'rgba(255,255,255,0.15)',border:'1.5px solid rgba(255,255,255,0.25)',color:'white',fontWeight:900,fontSize:16,borderRadius:20,cursor:'pointer',transition:'transform 0.15s'}}
              onTouchStart={e=>e.currentTarget.style.transform='scale(0.97)'}
              onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}
              onMouseDown={e=>e.currentTarget.style.transform='scale(0.97)'}
              onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}>
              Done ✓
            </button>
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
                    <span className={`text-xs font-black ${k === 'Status' ? (selTxn.status === 'SUCCESS' ? 'text-indigo-600' : 'text-red-500') : 'text-slate-700 font-mono'}`}>{v}</span>
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
                <h3 className="font-black text-slate-800 text-sm">{fleetOwner || 'Fleet Owner'}</h3>
                <p className="text-[9px] text-slate-400">{fleetCompany || 'MobilityGrid'}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={el => { if (el) el.scrollTop = el.scrollHeight; }}>
              {chatMsgs.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-12">
                  <MessageCircle size={28} className="mx-auto mb-2 opacity-20"/>
                  <p>No messages yet. Type below to contact your fleet owner.</p>
                </div>
              ) : chatMsgs.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender_type === 'DRIVER' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-3 py-2.5 rounded-2xl text-sm ${
                    msg.sender_type === 'DRIVER'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                  }`}>
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-[9px] mt-1 ${msg.sender_type === 'DRIVER' ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {formatChatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-white border-t border-slate-200 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                placeholder="Message..." className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"/>
              <button onClick={sendChatMessage} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition">
                <Send size={15}/>
              </button>
            </div>
          </div>
        )}

      {/* Passkey nudge sheet */}
      {showPasskeyNudge && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 299, padding: '0 16px',
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px 20px 0 0',
            padding: '28px 20px 40px', width: '100%',
            fontFamily: "'Inter', -apple-system, sans-serif",
          }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ fontSize: '42px', marginBottom: '8px' }}>🔐</div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 5px' }}>Enable Biometric Login</h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Next time log in with fingerprint or Face ID — no OTP needed.
              </p>
            </div>
            <button
              onClick={enrollDriverPasskey}
              disabled={enrollingPasskey}
              style={{
                width: '100%', padding: '13px',
                background: enrollingPasskey ? '#c7d2fe' : '#4f46e5',
                color: '#fff', border: 'none', borderRadius: '12px',
                fontSize: '14px', fontWeight: 700,
                cursor: enrollingPasskey ? 'not-allowed' : 'pointer',
                marginBottom: '10px', fontFamily: 'inherit',
              }}
            >
              {enrollingPasskey ? 'Setting up…' : 'Enable Biometrics'}
            </button>
            <button
              onClick={dismissPasskeyNudge}
              disabled={enrollingPasskey}
              style={{
                width: '100%', padding: '12px',
                background: 'transparent', color: '#64748b',
                border: '1.5px solid #e2e8f0', borderRadius: '12px',
                fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Not now
            </button>
          </div>
        </div>
      )}
      {/* Notification Permission Nudge */}
      {showNotifNudge && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 32px',
            width: '100%', maxWidth: '480px', margin: '0 auto',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>🔔</div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Enable Notifications</h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Get instant alerts for payment updates, owner messages, and important fleet notifications.
              </p>
            </div>
            <button onClick={requestNotifPermission} style={{
              width: '100%', padding: '13px', borderRadius: '12px',
              background: '#16a34a', color: '#fff', border: 'none',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginBottom: '10px',
              fontFamily: 'inherit',
            }}>
              Allow Notifications
            </button>
            <button onClick={dismissNotifNudge} style={{
              width: '100%', padding: '11px', borderRadius: '12px',
              background: 'transparent', color: '#94a3b8', border: 'none',
              fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Not now
            </button>
          </div>
        </div>
      )}
      {/* Add Funds Modal */}
      {showAddFunds && (
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:'20px 20px 0 0',padding:'28px 20px 40px',width:'100%',maxWidth:480,boxShadow:'0 -8px 32px rgba(0,0,0,0.18)'}}>
            <h3 style={{fontSize:17,fontWeight:900,color:'#0f172a',marginBottom:4}}>Add Funds to Wallet</h3>
            <p style={{fontSize:12,color:'#64748b',marginBottom:20}}>Enter the amount you want to add</p>
            <div style={{position:'relative',marginBottom:16}}>
              <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:18,color:'#64748b',fontWeight:700}}>&#8377;</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={addFundsAmt}
                onChange={e => setAddFundsAmt(e.target.value)}
                autoFocus
                style={{width:'100%',boxSizing:'border-box',paddingLeft:34,paddingRight:14,paddingTop:14,paddingBottom:14,fontSize:24,fontWeight:900,color:'#0f172a',border:'2px solid #e2e8f0',borderRadius:14,outline:'none',fontFamily:'inherit'}}
                onFocus={e => e.target.style.borderColor='#4f46e5'}
                onBlur={e => e.target.style.borderColor='#e2e8f0'}
              />
            </div>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              {[100,500,1000].map(amt => (
                <button key={amt} onClick={() => setAddFundsAmt(String(amt))}
                  style={{flex:1,padding:'8px 0',background:'#f1f5f9',border:'none',borderRadius:10,fontSize:13,fontWeight:700,color:'#334155',cursor:'pointer'}}>
                  +&#8377;{amt}
                </button>
              ))}
            </div>
            <LoadingButton
              onClick={submitAddFunds}
              disabled={!addFundsAmt || isNaN(addFundsAmt) || Number(addFundsAmt) <= 0}
              loadingText="Opening payment..."
              style={{width:'100%',padding:'14px',background:(!addFundsAmt||isNaN(addFundsAmt)||Number(addFundsAmt)<=0)?'#c7d2fe':'#4f46e5',color:'#fff',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:(!addFundsAmt||isNaN(addFundsAmt)||Number(addFundsAmt)<=0)?'not-allowed':'pointer',marginBottom:10,fontFamily:'inherit'}}>
              Proceed to Pay
            </LoadingButton>
            <button onClick={() => setShowAddFunds(false)}
              style={{width:'100%',padding:'12px',background:'transparent',color:'#94a3b8',border:'none',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Logout confirm */}}
      {showLogoutConfirm && (
        <div className="absolute inset-0 bg-black/50 z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xs p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <LogOut size={20} className="text-red-500" />
            </div>
            <h3 className="text-base font-black text-slate-900 mb-1">Logout?</h3>
            <p className="text-sm text-slate-500 mb-5">Are you sure you want to sign out?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 bg-slate-100 rounded-xl text-sm font-black text-slate-700">Cancel</button>
              <button onClick={logout}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-black">Yes, Logout</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
