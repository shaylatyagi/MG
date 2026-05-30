// frontend/src/pages/DriverPWA.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  User,Truck,Wifi,Edit, Battery, Bell, BellRing, Home, CircleUser, Wallet,
  CreditCard, Eye, EyeOff, Copy, X, Send, CheckCircle, Clock,
  AlertTriangle, MessageCircle, ShieldAlert, FileText, Camera, LogOut,
  Receipt, Trophy, Star, PackageCheck, PlusCircle, ArrowDownLeft,
  Fingerprint, FileCheck2, Landmark, Paperclip, ChevronLeft, History
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Chatbot from '../components/Chatbot';  // ← same
const API ='https://mg-qw5s.onrender.com';
const KYC_API = 'https://mg-qw5s.onrender.com';

export default function DriverPWA() {
  const getHeaderTitle = (tab) => {
  const titles = {
    'home': 'Dashboard',
    'wallet': 'Wallet',
    'account': 'My Account'
  };
  return titles[tab] || 'MobilityGrid';
};
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard'); // Add this
  const [tab, setTab] = useState('home'); // Changed from 'home' to 'account'
  const [historyFrom, setHistoryFrom] = useState('tab');
  const [lang, setLang] = useState('en');
  const T = {
  en: {
    driverTerminal:'Driver Terminal', balanceTx:'Balance & Transactions', 
profileKyc:'Profile & KYC', logout:'Logout',
    assignedVehicle:'Assigned Vehicle', active:'ACTIVE',
dailyRent:'Daily Rent', assignedSince:'Assigned Since',
noVehicle:'No vehicle assigned', contactOwner:'Contact your owner to assign a vehicle',
verifiedDocs:'Verified Documents', paymentSummary2:'Payment Summary',
availableFloat:'Available Advance Float'
, addFloat2:'Add Float',
requestPayout2:'Request Payout', totalPaidLabel:'Total Paid',
outstandingLabel:'Outstanding', txHistoryLabel:'Transaction History',
noTxLabel:'No transactions yet.', lifetime:'Lifetime',
    outstanding: "Today's Outstanding", duesPending: 'Dues Pending',
    settled: 'Account Settled', pay: 'Pay via PayYantra',
    recent: 'Recent Transactions', viewAll: 'View All →',
    noTx: 'No transactions yet', wallet: 'Available Advance Float',
    totalPaid: 'Total Paid', outstanding2: 'Outstanding',
    txHistory: 'Transaction History', emergency: 'Emergency Support',
    triggerSos: 'Trigger SOS'
  },
  hi: {
    driverTerminal:'ड्राइवर टर्मिनल', balanceTx:'बैलेंस और लेनदेन',
profileKyc:'प्रोफ़ाइल और KYC', logout:'लॉगआउट',
    assignedVehicle:'असाइन वाहन', active:'सक्रिय',
dailyRent:'दैनिक किराया', assignedSince:'असाइन तिथि',
noVehicle:'कोई वाहन असाइन नहीं', contactOwner:'वाहन के लिए मालिक से संपर्क करें',
verifiedDocs:'सत्यापित दस्तावेज़', paymentSummary2:'भुगतान सारांश',
availableFloat:'उपलब्ध एडवांस फ्लोट', addFloat2:'फ्लोट जोड़ें',
requestPayout2:'पेआउट अनुरोध', totalPaidLabel:'कुल भुगतान',
outstandingLabel:'बकाया', txHistoryLabel:'लेनदेन इतिहास',
noTxLabel:'अभी कोई लेनदेन नहीं।', lifetime:'आजीवन',
    outstanding: 'आज का बकाया', duesPending: 'बकाया है',
    settled: 'खाता सेटल', pay: 'PayYantra से भुगतान करें',
    recent: 'हाल के लेनदेन', viewAll: 'सभी देखें →',
    noTx: 'अभी कोई लेनदेन नहीं', wallet: 'उपलब्ध एडवांस',
    totalPaid: 'कुल भुगतान', outstanding2: 'बकाया',
    txHistory: 'लेनदेन इतिहास', emergency: 'आपातकालीन सहायता',
    triggerSos: 'SOS भेजें'
  }
};
const t = T[lang];
  const [time, setTime] = useState('');
  const [showBalance, setShowBal] = useState(true);
  const [historySource, setHistorySource] = useState('tab');

  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(0);
  const [dues, setDues] = useState(0);
  const [payAmt, setPayAmt] = useState(0);
  const [telemetry, setTelemetry] = useState({});
  const [payments, setPayments] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [rewards, setRewards] = useState(350);
  const [loading, setLoading] = useState(true);
  const [totalPaid, setTotalPaid] = useState(0);

  // Modals
  const [showNotif, setShowNotif] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [showPaying, setShowPaying] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selTxn, setSelTxn] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHist] = useState([{ from: 'bot', text: 'Hello Driver! How can I help you?' }]);
  const [sosMsg, setSosMsg] = useState('');
  const [sosSent, setSosSent] = useState(false);

  // KYC
  const [kycState, setKycState] = useState({
    aadhaar: { value: '', status: 'pending', reqId: null, otp: '', showOtp: false },
    pan: { value: '', status: 'pending', verifiedName: '' },
    dl: { value: '', dob: '', status: 'pending' },
    bank: { acc: '', ifsc: '', status: 'pending' },
  });

  const [kycLoading, setKycLoading] = useState('');

  // Profile
  const [profEdit, setProfEdit] = useState(false);
  // Add this state
const [assignedVehicle, setAssignedVehicle] = useState(null);

// Add this useEffect to fetch assigned vehicle
useEffect(() => {
  const fetchDriverVehicle = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const driverPhone = user.phone || user.phone_number || user.mobile_number;
    
    if (driverPhone) {
      try {
        const response = await fetch(`${API}/api/payment/driver/profile?phone=${driverPhone}`);
        const data = await response.json();
        console.log('Driver vehicle data:', data);
        
        if (data && data.vehicle_number) {
          setAssignedVehicle({
            number: data.vehicle_number,
            model: data.vehicle_model,
            dailyRent: data.vehicle_daily_rent
          });
        }
      } catch (err) {
        console.error('Error fetching driver vehicle:', err);
      }
    }
  };
  
  fetchDriverVehicle();
}, []);
  const [prof, setProf] = useState({ name: '', phone: '' });

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(u);
    setProf({ name: u.name || '', phone: u.phone || u.mobile_number || '' });
    if (!u?.id) setLoading(false);
  }, []);
  // Add this useEffect in DriverPWA.js for real-time notifications
useEffect(() => {
  if (!user) return;
  
  const fetchNotifications = async () => {
    try {
      const ph = phone();
      const res = await fetch(`${API}/api/payment/driver/notifications?phone=${ph}`, {
        headers: { Authorization: `Bearer ${tk()}` }
      });
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setNotifs(data);
        const newUnread = data.filter(n => !n.is_read).length;
        if (newUnread > unread) {
          setUnread(newUnread);
          // Optional: Show toast or play sound
        }
      }
    } catch (err) {
      console.error('Notification fetch error:', err);
    }
  };
  
  fetchNotifications();
  const interval = setInterval(fetchNotifications, 15000); // Every 15 seconds
  
  return () => clearInterval(interval);
}, [user]);

  useEffect(() => {
    const tick = () => {
      const n = new Date(); let h = n.getHours(), m = String(n.getMinutes()).padStart(2, '0');
      setTime(`${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`);
    }; tick(); const id = setInterval(tick, 30000); return () => clearInterval(id);
  }, []);

  const tk = () => localStorage.getItem('token');
  const phone = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    const raw = u?.phone_number || u?.mobile_number || u?.phone || u?.customerPhone || '';
    const cleaned = String(raw).replace(/\D/g, '');
    return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
  } catch { return ''; }
};
  // ─── CHAT STATE ───
const [showOwnerChat, setShowOwnerChat] = useState(false);
const [chatMessages, setChatMessages] = useState([]);
const [chatMsgs, setChatMsgs] = useState([]);
const [chatUnread, setChatUnread] = useState(0);

// Chat fetch
const fetchChat = async () => {
  const ph = phone();
  if (!ph) return;
  const res = await fetch(
    `${API}/api/payment/chat/messages?driverPhone=${ph}&ownerId=1`,
    { headers: { Authorization: `Bearer ${tk()}` } }
  );
  if (res.ok) {
    const data = await res.json();
    setChatMsgs(data);
  }
};

useEffect(() => {
  if (!user) return;
  fetchChat();
  const interval = setInterval(fetchChat, 5000); // 5 sec polling
  return () => clearInterval(interval);
}, [user]);

// Send chat message
const sendChatMessage = async () => {
  if (!chatInput.trim()) return;
  const msg = chatInput.trim();
  setChatInput('');
  
  await fetch(`${API}/api/payment/chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
    body: JSON.stringify({
      driverPhone: phone(),
      message: msg,
      senderType: 'DRIVER',
      ownerId: 1
    })
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
        const t = await txR.json();
        if (Array.isArray(t)) {
          const formattedPayments = t.map(x => ({
            id: x.pg_transaction_id || x.order_id,
            type: 'Rent Payment',
            amount: x.order_amount,
            date: new Date(x.order_initiation_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
            status: x.transaction_status,
            ref: x.order_number,
          }));
          setPayments(formattedPayments);
          // Calculate total paid
          const total = formattedPayments.filter(p => p.status === 'SUCCESS').reduce((sum, p) => sum + parseFloat(p.amount), 0);
          setTotalPaid(total);
        }
      }
      if (prR.ok) {
  const p = await prR.json();
  setWallet(parseFloat(p.wallet_balance || 0));
  
  // ✅ Use total_outstanding for accurate dues
  const d = p.vehicle_number 
    ? parseFloat(p.total_outstanding || p.current_dues || 0)
    : 0;
  
  setDues(d); 
  setPayAmt(d > 0 ? d : 0);
  setTelemetry({ 
  vehicleNumber: p.vehicle_number || 'Not Assigned', 
  vehicleModel: p.vehicle_model || '', 
  dailyRent: parseFloat(p.vehicle_daily_rent || 0),
  dailyDepositRecovery: parseFloat(p.daily_deposit_recovery || 0)
});
}else {
        const dR = await fetch(`${API}/api/payment/driver/dues?phone=${ph}`, { headers: H });
        if (dR.ok) { const d = await dR.json(); setDues(d.dues || 0); setPayAmt(d.daily_rent || 0); setTelemetry(p => ({ ...p, vehicleNumber: d.vehicle_number || 'Not Assigned', dailyRent: d.daily_rent || 0 })); }
      }
      if (nR.ok) { const n = await nR.json(); const a = Array.isArray(n) ? n : []; setNotifs(a); setUnread(a.filter(x => !x.is_read).length); }
    } catch (e) { console.error(e); setDues(0); setPayAmt(0); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
  const p = new URLSearchParams(window.location.search);
  if (p.get('status') === 'success' || p.get('refresh') === 'true') { 
    setShowPaying(false); // ← ADD
    fetchAll(); 
    window.history.replaceState(null, '', window.location.pathname); 
  }
}, [user]);

  const markRead = async () => {
    setUnread(0); setNotifs(p => p.map(n => ({ ...n, is_read: true })));
    try { await fetch(`${API}/api/payment/notifications/mark-read?userId=${user?.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${tk()}` } }); } catch (_) { }
  };
  const pay = async () => {
  setShowPaying(true);
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    const ph = phone();
    
    const r = await fetch(`${API}/api/payment/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ 
        amount: payAmt || dues || 850, 
        customerName: u.name || 'Driver', 
        customerPhone: ph, 
        customerEmail: u.email || 'driver@mg.com',
        purpose: 'RENT' 
      })
    });
    
    const d = await r.json();
    console.log('Payment response:', d);

    // ✅ STEP 1: Vinay Sir ka method — upiQrLink se intent nikalo
    const qrLink = d?.upiQrLink || d?.data?.upiQrLink;
    if (qrLink) {
      try {
        const qrUrl = new URL(qrLink);
        const intentLink = decodeURIComponent(qrUrl.searchParams.get("intent"));
        if (intentLink && intentLink.startsWith('upi://')) {
          window.location.href = intentLink;
          return; // ✅ UPI app seedha khulega
        }
      } catch (e) { console.error('QR decode error:', e); }
    }

    // ✅ STEP 2: Fallback — checkout URL
    const url = d?.checkoutUrl 
              || d?.data?.checkoutUrl 
              || d?.intentURL 
              || d?.data?.intentURL;

    if (url) { 
      window.location.href = url; 
    } else { 
      alert('Payment error: ' + (d?.message || 'No URL'));
      setShowPaying(false); 
    }
  } catch (e) { 
    alert('Network error: ' + e.message); 
    setShowPaying(false); 
  }
};
const addFloat = async () => {
  const amt = prompt("Enter amount to add to Wallet (₹):");
  if (!amt || isNaN(amt) || Number(amt) <= 0) return;

  setShowPaying(true);
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    const ph = phone();
    
    const r = await fetch(`${API}/api/payment/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ 
        amount: Number(amt), 
        customerName: u.name || 'Driver', 
        customerPhone: ph, 
        customerEmail: u.email || 'driver@mg.com', 
        purpose: 'WALLET' 
      })
    });
    const d = await r.json();

    const url = d?.checkoutUrl 
              || d?.data?.checkoutUrl 
              || d?.intentURL 
              || d?.data?.intentURL;
              
    if (url) { 
      window.location.href = url; 
    } else { 
      alert('Payment gateway error. Try again.'); 
      setShowPaying(false); 
    }
  } catch (e) { 
    alert('Network error.'); 
    setShowPaying(false); 
  }
};

  const sendChat = () => {
    if (!chatInput.trim()) return;
    setChatHist(p => [...p, { from: 'user', text: chatInput }]);
    setTimeout(() => setChatHist(p => [...p, { from: 'bot', text: 'Message received! A live support executive has been assigned. Please stay active.' }]), 800);
    setChatInput('');
  };

 const sendSOS = async () => {
  setSosSent(true);
  
  // ✅ Location lo
  let locationUrl = '';
  try {
    const pos = await new Promise((resolve, reject) => 
      navigator.geolocation.getCurrentPosition(resolve, reject, {timeout:5000})
    );
    const {latitude, longitude} = pos.coords;
    locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
  } catch(e) {}

  try {
    await fetch(`${API}/api/payment/driver/sos`, {
      method: 'POST',
      headers: {'Content-Type':'application/json', Authorization:`Bearer ${tk()}`},
      body: JSON.stringify({ 
        phone: phone(), 
        message: `${sosMsg || 'Emergency! Madad chahiye.'}\n${locationUrl ? `📍 Location: ${locationUrl}` : 'Location unavailable'}`
      })
    });
  } catch(e) { console.error(e); }
  
  // ✅ 2 sec baad SOS close → chat auto open
  setTimeout(() => { 
    setShowSOS(false); setSosMsg(''); setSosSent(false);
    setShowOwnerChat(true);  // ← chat auto khulega
    fetchChat();
  }, 2000);
};

  const claimRewards = () => {
    if (rewards <= 0) return alert('No unclaimed rewards.');
    if (!window.confirm(`Claim ₹${rewards} bonus into your Wallet Float?`)) return;
    setWallet(w => w + rewards); setRewards(0);
    alert(`✅ ₹${rewards} credited to Wallet Float!`);
  };

  const logout = () => { localStorage.clear(); navigate('/login'); };

  // KYC Helpers
  const kycCall = async (endpoint, body, docKey) => {
    setKycLoading(docKey);
    try {
      const r = await fetch(`${KYC_API}/api/kyc/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ ...body, phone: phone() })
      });
      return await r.json();
    } catch (e) { return { success: false, message: e.message }; }
    finally { setKycLoading(''); }
  };

  const kycVerifyPAN = async () => {
    if (!kycState.pan.value || kycState.pan.value.length !== 10) return alert('Enter valid 10-character PAN');
    const r = await kycCall('verify-pan', { pan_number: kycState.pan.value.toUpperCase() }, 'pan');
    if (r.verified && r.name) {
      // Verify PAN name matches profile name
      if (user?.name && r.name.toLowerCase().includes(user.name.toLowerCase()) || r.name.toLowerCase() === user?.name?.toLowerCase()) {
        setKycState(s => ({ ...s, pan: { ...s.pan, status: 'verified', verifiedName: r.name } }));
        alert(`✅ PAN Verified! Name: ${r.name} matches your profile.`);
      } else {
        alert(`⚠️ PAN name (${r.name}) doesn't match your profile name (${user?.name}). Please update your profile.`);
        setKycState(s => ({ ...s, pan: { ...s.pan, status: 'failed', verifiedName: r.name } }));
      }
    } else {
      setKycState(s => ({ ...s, pan: { ...s.pan, status: 'failed' } }));
      alert(r.message || '❌ PAN Verification Failed');
    }
  };

  const kycAadhaarInit = async () => {
    if (!kycState.aadhaar.value || kycState.aadhaar.value.length !== 12) return alert('Enter 12-digit Aadhaar');
    const r = await kycCall('aadhaar-initiate', { aadhaar_number: kycState.aadhaar.value }, 'aadhaar');
    if (r.success) {
      setKycState(s => ({ ...s, aadhaar: { ...s.aadhaar, reqId: r.requestId, showOtp: true } }));
      alert('OTP sent to Aadhaar registered mobile');
    } else alert(r.message || 'Failed to send OTP');
  };

  const kycAadhaarVerify = async () => {
    if (!kycState.aadhaar.otp) return alert('Enter OTP');
    const r = await kycCall('aadhaar-verify', { request_id: kycState.aadhaar.reqId, otp: kycState.aadhaar.otp }, 'aadhaar');
    setKycState(s => ({ ...s, aadhaar: { ...s.aadhaar, status: r.verified ? 'verified' : 'failed', showOtp: false } }));
    alert(r.message || (r.verified ? '✅ Aadhaar Verified' : '❌ OTP invalid'));
  };

  const kycVerifyDL = async () => {
    if (!kycState.dl.value) return alert('Enter DL number');
    const r = await kycCall('verify-dl', { dl_number: kycState.dl.value, dob: kycState.dl.dob }, 'dl');
    setKycState(s => ({ ...s, dl: { ...s.dl, status: r.verified ? 'verified' : 'failed' } }));
    alert(r.message || (r.verified ? '✅ DL Verified' : '❌ Failed'));
  };

  const kycVerifyBank = async () => {
    if (!kycState.bank.acc || !kycState.bank.ifsc) return alert('Enter Account Number and IFSC');
    const r = await kycCall('verify-bank', { account_number: kycState.bank.acc, ifsc: kycState.bank.ifsc }, 'bank');
    setKycState(s => ({ ...s, bank: { ...s.bank, status: r.verified ? 'verified' : 'failed' } }));
    alert(r.message || (r.verified ? `✅ Bank Verified — ${r.accountName}` : '❌ Failed'));
  };

  const goToWalletFromTransaction = () => {
    setHistoryFrom('transaction');
    setTab('wallet');
    setActiveTab('wallet');
  };

  const statusBadge = (s) => {
    const map = { verified: 'bg-emerald-50 text-emerald-700 border-emerald-100', failed: 'bg-red-50 text-red-700 border-red-100', pending: 'bg-amber-50 text-amber-700 border-amber-100' };
    const label = { verified: '✅ Verified', failed: '❌ Failed', pending: 'Pending' };
    return <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase font-mono border ${map[s] || map.pending}`}>{label[s] || 'Pending'}</span>;
  };

  // ACCOUNT TAB (Merged Profile + KYC)
  // ACCOUNT TAB with full KYC and document upload
// ACCOUNT TAB with Profile Details, Vehicle Info, and KYC
const AccountTab = () => {
  const [uploading, setUploading] = useState(false);
  
  // Add this function for file uploads
  const handleFileUpload = async (docType, file) => {
    if (!file) return;
    setUploading(true);
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
      if (data.success) {
        alert(`✅ ${docType} uploaded successfully!`);
      } else {
        alert('Upload failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  
  // Get driver details from localStorage and fetched data
  const driverName = user?.name || user?.full_name || 'Driver Name';
  const driverPhone = phone();
  const driverCode = user?.driver_code || user?.usercode || 'Not Available';
  
  return (
    <div className="space-y-4 pb-4">
      {/* PROFILE HEADER - Driver Details */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-black">
            {driverName.charAt(0).toUpperCase()}
          </div>
<h2 className="text-xl font-black">{driverName}</h2>
<p className="text-sm opacity-90">{driverPhone}</p>
<p className="text-xs opacity-75">Driver Code: {driverCode}</p>

{/* ✅ ADD THIS — Active/Inactive status */}
<div className="mt-2">
  <span className={`px-3 py-1 rounded-full text-xs font-black ${
    assignedVehicle 
      ? 'bg-green-500 text-white' 
      : 'bg-slate-500/50 text-white/80'
  }`}>
    {assignedVehicle ? '🟢 ACTIVE' : '⚫ INACTIVE'}
  </span>
</div>
        </div>
      </div>

      {/* ASSIGNED VEHICLE DETAILS */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Truck size={14} /> {t.assignedVehicle}
        </h3>
        
        {assignedVehicle ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-black text-slate-800 text-lg">{assignedVehicle.number}</p>
                <p className="text-sm text-slate-500">{assignedVehicle.model}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-green-100 text-green-700">
                {t.active}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <p className="text-[10px] text-slate-400">{t.dailyRent}</p>
                <p className="text-base font-black text-emerald-600">₹{assignedVehicle.dailyRent}/day</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">{t.assignedSince}</p>
                <p className="text-sm font-black">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 rounded-xl p-4 text-center">
            <p className="text-amber-600 font-medium">{t.noVehicle}</p>
            <p className="text-xs text-amber-500 mt-1">{t.contactOwner}</p>
          </div>
        )}
      </div>


      {/* KYC Documents Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{t.verifiedDocs}</h3>
          <span className="text-[9px] text-blue-600 font-black">API Setu Connected</span>
        </div>

        {/* Aadhaar Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-black text-slate-800 flex items-center gap-1"><Fingerprint size={14} /> Aadhaar Card</span>
            {statusBadge(kycState.aadhaar.status)}
          </div>
          <div className="flex gap-2 mb-2">
            <input value={kycState.aadhaar.value} maxLength={12}
              onChange={e => setKycState(s => ({ ...s, aadhaar: { ...s.aadhaar, value: e.target.value.replace(/\D/g, '').slice(0, 12) } }))}
              placeholder="12-digit Aadhaar" className="flex-1 border rounded-xl p-2 font-mono bg-slate-50 text-sm" />
            <button onClick={kycAadhaarInit} disabled={kycLoading === 'aadhaar'}
              className="bg-blue-600 text-white px-4 rounded-xl text-xs font-black">Send OTP</button>
          </div>
          {kycState.aadhaar.showOtp && (
            <div className="flex gap-2 mb-2">
              <input value={kycState.aadhaar.otp} onChange={e => setKycState(s => ({ ...s, aadhaar: { ...s.aadhaar, otp: e.target.value } }))}
                placeholder="Enter OTP" className="flex-1 border rounded-xl p-2 font-mono bg-slate-50 text-sm" />
              <button onClick={kycAadhaarVerify} className="bg-emerald-600 text-white px-4 rounded-xl text-xs font-black">Verify</button>
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
            <label className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 cursor-pointer hover:bg-slate-100">
              <Camera size={12} /> Upload Aadhaar PDF/Image
              <input type="file" accept="image/*,application/pdf" className="hidden" 
                onChange={(e) => handleFileUpload('AADHAAR', e.target.files[0])} />
            </label>
          </div>
        </div>

        {/* PAN Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-black text-slate-800 flex items-center gap-1"><FileText size={14} /> PAN Card</span>
            {statusBadge(kycState.pan.status)}
          </div>
          <div className="flex gap-2 mb-2">
            <input value={kycState.pan.value} maxLength={10}
              onChange={e => setKycState(s => ({ ...s, pan: { ...s.pan, value: e.target.value.toUpperCase() } }))}
              placeholder="ABCDE1234F" className="flex-1 border rounded-xl p-2 font-mono bg-slate-50 text-sm uppercase" />
            <button onClick={kycVerifyPAN} disabled={kycLoading === 'pan'}
              className="bg-blue-600 text-white px-4 rounded-xl text-xs font-black">Verify</button>
          </div>
          {kycState.pan.verifiedName && <p className="text-[10px] text-green-600 mb-2">✓ Verified as: {kycState.pan.verifiedName}</p>}
          <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
            <label className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 cursor-pointer hover:bg-slate-100">
              <Camera size={12} /> Upload PAN Image
              <input type="file" accept="image/*" className="hidden" 
                onChange={(e) => handleFileUpload('PAN', e.target.files[0])} />
            </label>
          </div>
        </div>

        {/* Driving License */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-black text-slate-800 flex items-center gap-1"><FileCheck2 size={14} /> Driving License</span>
            {statusBadge(kycState.dl.status)}
          </div>
          <div className="flex gap-2 mb-2">
            <input value={kycState.dl.value}
              onChange={e => setKycState(s => ({ ...s, dl: { ...s.dl, value: e.target.value.toUpperCase() } }))}
              placeholder="License Number" className="flex-1 border rounded-xl p-2 font-mono bg-slate-50 text-sm" />
            <button onClick={kycVerifyDL} disabled={kycLoading === 'dl'}
              className="bg-blue-600 text-white px-4 rounded-xl text-xs font-black">Verify</button>
          </div>
          <input type="date" value={kycState.dl.dob}
            onChange={e => setKycState(s => ({ ...s, dl: { ...s.dl, dob: e.target.value } }))}
            className="w-full border rounded-xl p-2 text-sm mb-2 bg-slate-50" placeholder="Date of Birth" />
          <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
            <label className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 cursor-pointer hover:bg-slate-100">
              <Camera size={12} /> Upload License Image
              <input type="file" accept="image/*" className="hidden" 
                onChange={(e) => handleFileUpload('DL', e.target.files[0])} />
            </label>
          </div>
        </div>

        {/* Bank Account */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-black text-slate-800 flex items-center gap-1"><Landmark size={14} /> Bank Account</span>
            {statusBadge(kycState.bank.status)}
          </div>
          <input value={kycState.bank.acc}
            onChange={e => setKycState(s => ({ ...s, bank: { ...s.bank, acc: e.target.value } }))}
            placeholder="Account Number" className="w-full border rounded-xl p-2 text-sm mb-2 bg-slate-50" />
          <div className="flex gap-2 mb-2">
            <input value={kycState.bank.ifsc}
              onChange={e => setKycState(s => ({ ...s, bank: { ...s.bank, ifsc: e.target.value.toUpperCase() } }))}
              placeholder="IFSC Code" className="flex-1 border rounded-xl p-2 font-mono bg-slate-50 text-sm uppercase" />
            <button onClick={kycVerifyBank} disabled={kycLoading === 'bank'}
              className="bg-blue-600 text-white px-4 rounded-xl text-xs font-black">Verify</button>
          </div>
          <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
            <label className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 cursor-pointer hover:bg-slate-100">
              <Camera size={12} /> Upload Cancelled Cheque
              <input type="file" accept="image/*,application/pdf" className="hidden" 
                onChange={(e) => handleFileUpload('BANK', e.target.files[0])} />
            </label>
          </div>
        </div>
      </div>

      <button onClick={logout} className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-black py-4 rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-red-100 mt-2">
        <LogOut size={14} /> {t.logout}
      </button>
    </div>
  );
};

  // WALLET TAB with back button for transaction navigation
  const WalletTab = () => (
    <div className="space-y-4 pb-4">
      {historyFrom === 'transaction' && (<div className="sticky top-0 bg-slate-50 pt-0 pb-2 z-10">
        <button onClick={() => { setHistoryFrom('tab'); setTab('home'); }} className="flex items-center gap-1 text-blue-600 font-black text-sm bg-white px-4 py-2 rounded-x1 shadow-md">
          <ChevronLeft size={16} /> Back to Dashboard
        </button>
        </div>
      )}
      
      <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl p-5 text-white shadow-lg space-y-4">
        <div>
          <span className="text-[10px] uppercase font-black tracking-widest text-emerald-200 block">Available Advance Float</span>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-3xl font-black font-mono">{showBalance ? `₹${wallet.toLocaleString('en-IN')}.00` : '₹••••'}</h1>
            <button onClick={() => setShowBal(!showBalance)} className="opacity-70">{showBalance ? <EyeOff size={14} /> : <Eye size={14} />}</button>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          {/* Change this line in your WalletTab */}
<button onClick={addFloat} className="flex-1 bg-white/20 hover:bg-white/30 text-white text-[11px] font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition">
  <PlusCircle size={13} /> {t.addFloat2}
</button>
          <button onClick={() => alert('Withdrawal queued...')} className="flex-1 bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-100 text-[11px] font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition">
            <ArrowDownLeft size={13} /> {t.requestPayout2}
          </button>
        </div>
      </div>
      {/* Total Paid Summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t.paymentSummary2}</span>
          <span className="text-[10px] font-black text-emerald-600">{t.lifetime}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-slate-50 rounded-xl p-2">
            <p className="text-[9px] text-slate-400">{t.totalPaidLabel}</p>
            <p className="text-lg font-black text-emerald-600">₹{totalPaid.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2">
            <p className="text-[9px] text-slate-400">{t.outstandingLabel}</p>
            <p className="text-lg font-black text-amber-600">₹{dues.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{t.txHistoryLabel}</span>
        <div className="space-y-2 text-xs max-h-64 overflow-y-auto pr-1">
          {payments.length === 0 ? (
            <p className="text-[11px] italic text-slate-400 text-center py-4">{t.noTxLabel}</p>
          ) : (
            payments.map((p, i) => (
              <div key={i} onClick={() => { setSelTxn(p); setShowReceipt(true); }} className="flex items-center justify-between border-b border-slate-50 pb-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg">
                <div>
                  <p className="font-semibold text-slate-800">{p.type}</p>
                  <span className="text-[9px] text-slate-400 font-mono">{p.date}</span>
                </div>
                <span className={`font-mono font-black ${p.status === 'SUCCESS' ? 'text-emerald-600' : 'text-rose-600'}`}>₹{p.amount}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // HOME/DASHBOARD Tab
  const HomeTab = () => (
    <div className="space-y-4 pb-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.outstanding}</span>
            <h2 className="text-3xl font-black font-mono text-slate-900 mt-0.5 tracking-tight">₹{dues.toLocaleString('en-IN')}.00</h2>
          </div>
          <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-md font-mono border ${dues > 0 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
            {dues > 0 ? t.duesPending : t.settled}
          </span>
        </div>
        {/* Security Deposit Recovery info */}
{telemetry.dailyDepositRecovery > 0 && (
  <div className="bg-amber-50 border border-amber-100 rounded-xl p-2 mt-2">
    <p className="text-[9px] text-amber-600 font-black">
      🔒 Includes ₹{telemetry.dailyDepositRecovery}/day security deposit recovery
    </p>
  </div>
)}
        <div className="relative">
          <span className="absolute left-4 top-2.5 font-black text-slate-400 text-xl">₹</span>
          <input type="number" value={payAmt} onChange={e => setPayAmt(Number(e.target.value))}
            className="w-full border-2 border-slate-200 rounded-xl p-3 pl-9 text-xl font-black font-mono focus:outline-none focus:border-blue-600 bg-slate-50 text-slate-800" />
        </div>
        <button onClick={pay} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black p-4 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all active:scale-95">
          <CreditCard size={16} /> {t.pay}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t.recent}</h3>
<button onClick={() => goToWalletFromTransaction()} className="text-[10px] text-blue-600 font-black">{t.viewAll}</button>
        </div>
        <div className="divide-y">
          {payments.slice(0, 3).map((p, i) => (
            <div key={i} onClick={() => { setSelTxn(p); setShowReceipt(true); }} className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${p.status === 'SUCCESS' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                  {p.status === 'SUCCESS' ? <CheckCircle size={13} className="text-emerald-600" /> : <Clock size={13} className="text-rose-600" />}
                </div>
                <div><p className="text-xs font-black text-slate-800">{p.type}</p><p className="text-[9px] text-slate-400">{p.date}</p></div>
              </div>
              <span className={`text-xs font-black ${p.status === 'SUCCESS' ? 'text-emerald-600' : 'text-rose-600'}`}>-₹{p.amount}</span>
            </div>
          ))}
          {payments.length === 0 && !loading && <div className="p-5 text-center text-xs text-slate-400">No transactions yet</div>}
        </div>
      </div>
    </div>
  );

  // Main Render
  return (
    <div className="h-screen w-screen bg-slate-200 flex items-center justify-center overflow-hidden font-sans">
      <div className="w-full max-w-[412px] bg-slate-50 h-full sm:max-h-[840px] flex flex-col shadow-2xl relative overflow-hidden sm:rounded-[36px] sm:border sm:border-slate-300">

        {/* STATUS BAR */}
<div className="bg-slate-950 text-white text-[11px] px-4 py-2 flex justify-between shrink-0 z-50">
  <span className="text-emerald-400 font-black tracking-widest text-[10px]">DRIVER TERMINAL</span>
  <span>{time}</span>
  <div className="flex gap-1.5"><Wifi size={11} className="text-emerald-400" /><Battery size={11} /></div>
</div>

{/* HEADER - WITH ALL BUTTONS */}
<div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 shadow-sm z-40">
  <div className="flex items-center gap-2.5">
    <div className="flex flex-col items-center">
  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-600/20">MG</div>
  <span className="text-[8px] text-slate-400 font-mono mt-0.5">v1.0.0</span>
</div>
    <div>
      <span className="font-black text-slate-800 text-sm tracking-tight block">{getHeaderTitle(tab)}</span>
      <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest -mt-0.5 block">
        {tab === 'home' && t.driverTerminal}
{tab === 'wallet' && t.balanceTx}
{tab === 'account' && t.profileKyc}
      </span>
    </div>
  </div>
  
  {/* RIGHT SIDE BUTTONS - CHAT, BELL, LOGOUT */}
  <div className="flex items-center gap-2">
    {/* Language Toggle */}
    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
      <button onClick={()=>setLang('en')} className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${lang==='en'?'bg-white text-blue-600 shadow-sm':'text-slate-400'}`}>EN</button>
      <button onClick={()=>setLang('hi')} className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${lang==='hi'?'bg-white text-blue-600 shadow-sm':'text-slate-400'}`}>हिं</button>
    </div>
    
    {/* CHAT BUTTON */}
    <button onClick={()=>setShowChatbot(true)} className="relative p-2 rounded-xl bg-slate-100 hover:bg-blue-50 transition">
      <MessageCircle size={16} className="text-slate-600"/>
      <span className="absolute top-0 right-0 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"/>
    </button>
    <button onClick={()=>{setShowNotif(!showNotif); if(!showNotif) markRead();}} className="relative p-2 rounded-xl bg-slate-100 hover:bg-blue-50 transition">
      {unread > 0 ? <BellRing size={16} className="text-blue-600"/> : <Bell size={16} className="text-slate-600"/>}
      {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
    </button>
    
    {/* LOGOUT BUTTON */}
    <button onClick={logout} className="p-2 rounded-xl bg-red-50 hover:bg-red-100 transition">
      <LogOut size={16} className="text-red-600"/>
    </button>
  </div>
</div>
        {/* NOTIFICATION DROPDOWN */}
        {showNotif && (
          <div className="absolute top-[108px] left-3 right-3 sm:left-auto sm:right-3 sm:w-72 bg-white rounded-2xl shadow-2xl border z-[60] overflow-hidden">
            <div className="px-4 py-2.5 border-b flex justify-between items-center bg-slate-50">
              <span className="text-[10px] font-black text-slate-700 uppercase">Notifications</span>
              <button onClick={() => setShowNotif(false)}><X size={14} /></button>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y">
              {notifs.length === 0 ? <div className="p-5 text-center text-xs text-slate-400">No notifications</div>
                : notifs.slice(0, 10).map((n, i) => (
                  <div key={i}
                    className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition ${!n.is_read ? 'bg-blue-50/40' : ''}`}
                    onClick={() => {
  setNotifs(prev => prev.map((x, idx) => idx === i ? {...x, is_read: true} : x));
  setUnread(prev => Math.max(0, prev - 1));
  setShowNotif(false);
  const title = (n.title || '').toLowerCase();
  
  // ✅ Chat notification → owner chat open
  if (title.includes('💬') || title.includes('owner') || title.includes('message')) {
    setShowOwnerChat(true);
    fetchChat();
    return;
  }
  if (title.includes('payment') || title.includes('rent')) {
    setTab('wallet'); setActiveTab('wallet');
  } else if (title.includes('vehicle') || title.includes('assign')) {
    setTab('account'); setActiveTab('account');
  }
}}
                  >
                    <p className="text-xs font-black text-slate-800">{n.title}</p>
                    <p className="text-[10px] text-slate-500">{n.message}</p>
                    {!n.is_read && <p className="text-[9px] text-blue-500 font-black mt-0.5">Tap to view →</p>}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 bg-slate-50 pb-32">
          {loading ? <div className="text-center py-16 text-xs font-black text-slate-400 animate-pulse">Syncing Data…</div> : (
            <>
              {tab === 'home' && <HomeTab />}
              {tab === 'wallet' && <WalletTab />}
              {tab === 'account' && <AccountTab />}
            </>
          )}
        </div>
{/* SOS BAR */}
<div className="absolute left-0 right-0 bg-gradient-to-r from-red-600 to-orange-600 text-white px-3 py-2 flex items-center justify-between z-40" style={{bottom:'64px'}}>
  
  {/* ✅ Chat LEFT side pe */}
  <button 
    onClick={() => { setShowOwnerChat(true); fetchChat(); }}
    className="bg-white/20 text-white text-[9px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1"
  >
    <MessageCircle size={11}/> Chat Owner
  </button>

  {/* Center — Emergency text */}
  <div className="flex items-center gap-1">
    <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center animate-pulse">
      <ShieldAlert size={11}/>
    </div>
    <span className="text-[9px] font-black">{t.emergency}</span>
  </div>

  {/* ✅ SOS RIGHT side pe — alag jagah */}
  <button 
    onClick={() => setShowSOS(true)} 
    className="bg-white text-red-700 text-[9px] font-black px-3 py-1.5 rounded-lg"
  >
    🚨 {t.triggerSos}
  </button>
</div>
{/* Bottom Navigation - Fixed */}
<div className="fixed bottom-0 left-0 right-0 max-w-[412px] mx-auto bg-white border-t border-slate-200 h-16 flex justify-around items-center z-50">
  {[
    { id: 'dashboard', Icon: Home, label: 'Dashboard' },
    { id: 'wallet', Icon: Wallet, label: 'Wallet' },
    { id: 'account', Icon: User, label: 'Account' },
  ].map(({ id, Icon, label }) => (
    <button
      key={id}
      onClick={() => {
        setActiveTab(id);
        if (id === 'dashboard') setTab('home');
        if (id === 'wallet') setTab('wallet');
        if (id === 'account') setTab('account');
      }}
      className={`flex flex-col items-center justify-center gap-0.5 transition-all ${
        activeTab === id ? 'text-blue-600' : 'text-slate-400'
      }`}
    >
      <Icon size={20} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  ))}
</div>
        {showChatbot && (
  <Chatbot 
  userRole="DRIVER"
  userPhone={phone()}
  token={tk()}
  onClose={() => setShowChatbot(false)}
  persistedMessages={chatMessages}
  onMessagesUpdate={setChatMessages}
/>
)}
{showSOS && (
  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
    <div className="bg-white rounded-3xl w-full max-w-sm p-6">
      
      {/* ✅ BACK BUTTON */}
      <button 
        onClick={() => { setShowSOS(false); setSosMsg(''); setSosSent(false); }}
        className="flex items-center gap-1 text-slate-500 text-sm mb-4"
      >
        <ChevronLeft size={16} /> Back
      </button>

      {sosSent ? (
        <div className="text-center">
          <CheckCircle size={48} className="text-emerald-600 mx-auto mb-3" />
          <h3 className="text-lg font-black">SOS Sent!</h3>
          <p className="text-sm text-slate-500 mt-1">Owner ko alert bhej diya gaya</p>
        </div>
      ) : (
        <>
          <h3 className="text-lg font-black mb-1 text-red-600">🚨 Send SOS Alert</h3>
          <p className="text-xs text-slate-400 mb-3">Owner ko immediately notify karega</p>
          <textarea value={sosMsg} onChange={e => setSosMsg(e.target.value)} 
            placeholder="Incident describe karein... (e.g. Accident hua, vehicle kharab, help chahiye)"
            rows={3} className="w-full border rounded-xl p-3 text-sm mb-3" />
          <div className="flex gap-2">
            <button 
              onClick={() => { setShowSOS(false); setSosMsg(''); }}
              className="flex-1 py-3 bg-slate-100 rounded-xl text-sm font-black"
            >
              Cancel
            </button>
            <button onClick={sendSOS} 
              className="flex-1 bg-red-600 text-white font-black py-3 rounded-xl text-sm">
              🚨 Send SOS
            </button>
          </div>
        </>
      )}
    </div>
  </div>
)}

        {showPaying && (
          <div className="absolute inset-0 bg-black/60 z-[100] flex items-center justify-center">
            <div className="bg-white rounded-3xl p-8 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="font-black">Redirecting to PayYantra...</p>
              <button onClick={() => setShowPaying(false)} className="mt-4 text-xs">Cancel</button>
            </div>
          </div>
        )}

        {showReceipt && selTxn && (
          <div className="absolute inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6">
              <button onClick={() => setShowReceipt(false)}
        className="flex items-center gap-1 text-slate-500 text-sm mb-4">
        <ChevronLeft size={16} /> Back
      </button>
              <h3 className="text-xl font-black mb-4">Receipt</h3>
              <div className="text-center pb-4 border-b"><p className="text-3xl font-black">₹{selTxn.amount}</p></div>
              <div className="space-y-2 my-4">
                <div className="flex justify-between"><span>Transaction ID</span><span className="font-mono">{selTxn.id}</span></div>
                <div className="flex justify-between"><span>Date</span><span>{selTxn.date}</span></div>
                <div className="flex justify-between"><span>Status</span><span className={selTxn.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}>{selTxn.status}</span></div>
              </div>
              <button onClick={() => setShowReceipt(false)} className="w-full bg-slate-900 text-white py-3 rounded-xl">Close</button>
            </div>
          </div>
        )}
        {/* OWNER CHAT MODAL */}
{showOwnerChat && (
  <div className="absolute inset-0 z-[100] flex flex-col bg-slate-50">
    <div className="bg-blue-600 text-white p-4 flex items-center gap-3">
      <button onClick={() => setShowOwnerChat(false)}>
        <ChevronLeft size={20}/>
      </button>
      <div>
        <h3 className="font-black">Chat with Owner</h3>
        <p className="text-xs opacity-75">MobilityGrid Fleet</p>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {chatMsgs.length === 0 ? (
        <div className="text-center text-slate-400 text-xs py-8">
          <MessageCircle size={32} className="mx-auto mb-2 opacity-30"/>
          <p>No messages yet</p>
          <p className="mt-1 text-[10px]">Owner se baat karo</p>
        </div>
      ) : chatMsgs.map((msg, i) => (
        <div key={i} className={`flex ${msg.sender_type==='DRIVER'?'justify-end':'justify-start'}`}>
          <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
            msg.sender_type==='DRIVER'
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-sm'
          }`}>
            <p>{msg.message}</p>
            <p className={`text-[9px] mt-1 ${msg.sender_type==='DRIVER'?'text-blue-200':'text-slate-400'}`}>
              {new Date(msg.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
            </p>
          </div>
        </div>
      ))}
    </div>

    <div className="p-3 bg-white border-t flex gap-2">
      <input
        value={chatInput}
        onChange={e => setChatInput(e.target.value)}
        onKeyDown={e => e.key==='Enter' && sendChatMessage()}
        placeholder="Type message..."
        className="flex-1 border rounded-xl px-3 py-2 text-sm"
      />
      <button onClick={sendChatMessage} className="bg-blue-600 text-white p-2 rounded-xl">
        <Send size={16}/>
      </button>
    </div>
  </div>
)}
      </div>
    </div>
  );
}

// Add missing Edit icon import
