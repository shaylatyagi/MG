// frontend/src/pages/DriverPWA.js  — v2
// Exact replica of driver_terminal_FINAL_MERGED.html
// Features: 4 tabs (Dashboard/Wallet/Profile/KYC), SOS bar, chatbot,
//           back button logic (viewAll only), notification bell, KYC API Setu
import React, { useState, useEffect, useCallback } from 'react';
import {
  Wifi, Battery, Bell, BellRing, Home, History, CircleUser, Wallet,
  CreditCard, Truck, Eye, EyeOff, Copy, X, Send, CheckCircle, Clock,
  AlertTriangle, MessageCircle, ShieldAlert, FileText, Camera, LogOut,
  Receipt, Trophy, Star, PackageCheck, PlusCircle, ArrowDownLeft,
  Fingerprint, FileCheck2, Landmark, Paperclip, ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API     = 'https://mg-qw5s.onrender.com';
const KYC_API = 'https://mg-qw5s.onrender.com';

export default function DriverPWA() {
  const navigate = useNavigate();
  const [tab, setTab]           = useState('home');
  const [historyFrom, setHistoryFrom] = useState('tab'); // 'tab' | 'viewAll'
  const [lang, setLang]         = useState('en');
  const [time, setTime]         = useState('');
  const [showBalance, setShowBal] = useState(true);

  const [user, setUser]           = useState(null);
  const [wallet, setWallet]       = useState(0);
  const [dues, setDues]           = useState(0);
  const [payAmt, setPayAmt]       = useState(0);
  const [telemetry, setTelemetry] = useState({});
  const [payments, setPayments]   = useState([]);
  const [notifs, setNotifs]       = useState([]);
  const [unread, setUnread]       = useState(0);
  const [rewards, setRewards]     = useState(350);
  const [loading, setLoading]     = useState(true);

  // Modals
  const [showNotif,    setShowNotif]   = useState(false);
  const [showChat,     setShowChat]    = useState(false);
  const [showSOS,      setShowSOS]     = useState(false);
  const [showPaying,   setShowPaying]  = useState(false);
  const [showReceipt,  setShowReceipt] = useState(false);
  const [selTxn,       setSelTxn]      = useState(null);
  const [chatInput,    setChatInput]   = useState('');
  const [chatHistory,  setChatHist]    = useState([{from:'bot',text:'Hello Driver! How can I help you?'}]);
  const [sosMsg,       setSosMsg]      = useState('');
  const [sosSent,      setSosSent]     = useState(false);

  // KYC
  const [kycState, setKycState] = useState({
    aadhaar:{value:'',status:'pending',reqId:null,otp:'',showOtp:false},
    pan:    {value:'',status:'pending'},
    dl:     {value:'',dob:'',status:'pending'},
    bank:   {acc:'',ifsc:'',status:'pending'},
  });
  const [kycLoading, setKycLoading] = useState('');

  // Profile
  const [profEdit, setProfEdit] = useState(false);
  const [prof, setProf] = useState({name:'',phone:''});

  useEffect(()=>{
    const u=JSON.parse(localStorage.getItem('user')||'{}');
    setUser(u);
    setProf({name:u.name||'',phone:u.phone||u.mobile_number||''});
    if(!u?.id) setLoading(false);
  },[]);

  useEffect(()=>{
    const tick=()=>{
      const n=new Date(); let h=n.getHours(),m=String(n.getMinutes()).padStart(2,'0');
      setTime(`${h%12||12}:${m} ${h>=12?'PM':'AM'}`);
    }; tick(); const id=setInterval(tick,30000); return()=>clearInterval(id);
  },[]);

  const tk=()=>localStorage.getItem('token');
  const phone=()=>{
    const u=JSON.parse(localStorage.getItem('user')||'{}');
    return String(u?.phone_number||u?.mobile_number||u?.phone||'').replace(/\D/g,'').slice(-10);
  };

  const fetchAll=useCallback(async()=>{
    if(!user) return; setLoading(true);
    try{
      const ph=phone(); const H={Authorization:`Bearer ${tk()}`};
      const [txR,prR,nR]=await Promise.all([
        fetch(`${API}/api/payment/my-transactions?phone=${ph}`,    {headers:H}),
        fetch(`${API}/api/payment/driver/profile?phone=${ph}`,     {headers:H}),
        fetch(`${API}/api/payment/driver/notifications?phone=${ph}`,{headers:H}),
      ]);
      if(txR.ok){
        const t=await txR.json();
        if(Array.isArray(t)) setPayments(t.map(x=>({
          id:x.pg_transaction_id||x.order_id, type:'Rent Payment',
          amount:x.order_amount, date:new Date(x.order_initiation_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}),
          status:x.transaction_status, ref:x.order_number,
        })));
      }
      if(prR.ok){
        const p=await prR.json();
        setWallet(parseFloat(p.wallet_balance||0));
        const rent=parseFloat(p.vehicle_daily_rent||p.daily_rent||0);
        const paid=parseFloat(p.amount_paid_today||0);
        const d=p.vehicle_number?Math.max(0,rent-paid):0;
        setDues(d); setPayAmt(d>0?d:rent||0);
        setTelemetry({vehicleNumber:p.vehicle_number||'Not Assigned',vehicleModel:p.vehicle_model||'',dailyRent:rent});
      } else {
        const dR=await fetch(`${API}/api/payment/driver/dues?phone=${ph}`,{headers:H});
        if(dR.ok){const d=await dR.json();setDues(d.dues||0);setPayAmt(d.daily_rent||0);setTelemetry(p=>({...p,vehicleNumber:d.vehicle_number||'Not Assigned',dailyRent:d.daily_rent||0}));}
      }
      if(nR.ok){const n=await nR.json();const a=Array.isArray(n)?n:[];setNotifs(a);setUnread(a.filter(x=>!x.is_read).length);}
    }catch(e){console.error(e); setDues(850);setPayAmt(850);}
    finally{setLoading(false);}
  },[user]);

  useEffect(()=>{fetchAll();},[fetchAll]);
  useEffect(()=>{
    const p=new URLSearchParams(window.location.search);
    if(p.get('refresh')==='true'||p.get('status')==='success'){fetchAll();window.history.replaceState(null,'',window.location.pathname);}
  },[user]);

  const markRead=async()=>{
    setUnread(0); setNotifs(p=>p.map(n=>({...n,is_read:true})));
    try{await fetch(`${API}/api/payment/notifications/mark-read?userId=${user?.id}`,{method:'PUT',headers:{Authorization:`Bearer ${tk()}`}});}catch(_){}
  };

  const pay=async()=>{
    if(telemetry.vehicleNumber==='Not Assigned') return alert('No vehicle assigned. Contact your owner.');
    setShowPaying(true);
    try{
      const u=JSON.parse(localStorage.getItem('user')||'{}'); const ph=phone();
      const r=await fetch(`${API}/api/payment/create-order`,{method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${tk()}`},
        body:JSON.stringify({amount:payAmt||dues||850,customerName:u.name||'Driver',customerPhone:ph,customerEmail:u.email||'driver@mg.com'})
      });
      const d=await r.json();
      const url=d?.data?.data?.checkoutUrl||d?.checkoutUrl||d?.paymentUrl||d?.data?.checkoutUrl;
      if(url){window.location.href=url;}
      else{alert('Payment gateway error. Try again.');setShowPaying(false);}
    }catch(e){console.error(e);alert('Network error.');setShowPaying(false);}
  };

  const sendChat=()=>{
    if(!chatInput.trim()) return;
    setChatHist(p=>[...p,{from:'user',text:chatInput}]);
    setTimeout(()=>setChatHist(p=>[...p,{from:'bot',text:'Message received! A live support executive has been assigned. Please stay active.'}]),800);
    setChatInput('');
  };

  const sendSOS=async()=>{
    setSosSent(true);
    await fetch(`${API}/api/payment/driver/sos`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${tk()}`},body:JSON.stringify({phone:phone(),message:sosMsg||'SOS'})}).catch(()=>{});
    setTimeout(()=>{setShowSOS(false);setSosSent(false);setSosMsg('');},2500);
  };

  const claimRewards=()=>{
    if(rewards<=0) return alert('No unclaimed rewards.');
    if(!confirm(`Claim ₹${rewards} bonus into your Wallet Float?`)) return;
    setWallet(w=>w+rewards); setRewards(0);
    alert(`✅ ₹${rewards} credited to Wallet Float!`);
  };

  const logout=()=>{localStorage.clear();navigate('/login');};

  // ── KYC Helpers ──
  const kycCall=async(endpoint,body,docKey)=>{
    setKycLoading(docKey);
    try{
      const r=await fetch(`${KYC_API}/api/kyc/${endpoint}`,{method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${tk()}`},body:JSON.stringify({...body,phone:phone()})});
      return await r.json();
    }catch(e){return{success:false,message:e.message};}
    finally{setKycLoading('');}
  };

  const kycVerifyPAN=async()=>{
    if(!kycState.pan.value||kycState.pan.value.length!==10) return alert('Enter valid 10-character PAN');
    const r=await kycCall('verify-pan',{pan_number:kycState.pan.value.toUpperCase()},'pan');
    setKycState(s=>({...s,pan:{...s.pan,status:r.verified?'verified':'failed'}}));
    alert(r.message||(r.verified?'✅ PAN Verified':'❌ Failed'));
  };

  const kycAadhaarInit=async()=>{
    if(!kycState.aadhaar.value||kycState.aadhaar.value.length!==12) return alert('Enter 12-digit Aadhaar');
    const r=await kycCall('aadhaar-initiate',{aadhaar_number:kycState.aadhaar.value},'aadhaar');
    if(r.success){
      setKycState(s=>({...s,aadhaar:{...s.aadhaar,reqId:r.requestId,showOtp:true}}));
      alert('OTP sent to Aadhaar registered mobile');
    } else alert(r.message||'Failed to send OTP');
  };

  const kycAadhaarVerify=async()=>{
    if(!kycState.aadhaar.otp) return alert('Enter OTP');
    const r=await kycCall('aadhaar-verify',{request_id:kycState.aadhaar.reqId,otp:kycState.aadhaar.otp},'aadhaar');
    setKycState(s=>({...s,aadhaar:{...s.aadhaar,status:r.verified?'verified':'failed',showOtp:false}}));
    alert(r.message||(r.verified?'✅ Aadhaar Verified':'❌ OTP invalid'));
  };

  const kycVerifyDL=async()=>{
    if(!kycState.dl.value) return alert('Enter DL number');
    const r=await kycCall('verify-dl',{dl_number:kycState.dl.value,dob:kycState.dl.dob},'dl');
    setKycState(s=>({...s,dl:{...s.dl,status:r.verified?'verified':'failed'}}));
    alert(r.message||(r.verified?'✅ DL Verified':'❌ Failed'));
  };

  const kycVerifyBank=async()=>{
    if(!kycState.bank.acc||!kycState.bank.ifsc) return alert('Enter Account Number and IFSC');
    const r=await kycCall('verify-bank',{account_number:kycState.bank.acc,ifsc:kycState.bank.ifsc},'bank');
    setKycState(s=>({...s,bank:{...s.bank,status:r.verified?'verified':'failed'}}));
    alert(r.message||(r.verified?`✅ Bank Verified — ${r.accountName}`:'❌ Failed'));
  };

  const goHistory=(source)=>{setHistoryFrom(source);setTab('history');};

  const statusBadge=(s)=>{
    const map={verified:'bg-emerald-50 text-emerald-700 border-emerald-100',failed:'bg-red-50 text-red-700 border-red-100',pending:'bg-amber-50 text-amber-700 border-amber-100'};
    const label={verified:'✅ Verified',failed:'❌ Failed',pending:'Pending'};
    return <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase font-mono border ${map[s]||map.pending}`}>{label[s]||'Pending'}</span>;
  };

  // ════════ HOME ════════
  const HomeTab=()=>(
    <div className="space-y-4 pb-4">
      {/* Balance card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Consolidated Balance</span>
            <h2 className="text-3xl font-black font-mono text-slate-900 mt-0.5 tracking-tight">₹{dues.toLocaleString('en-IN')}.00</h2>
          </div>
          <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-md font-mono border ${dues>0?'bg-amber-50 text-amber-700 border-amber-100':'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
            {dues>0?'Dues Pending':'Account Settled'}
          </span>
        </div>
        {/* Horizon selector */}
        <div className="grid grid-cols-5 gap-1 border-y border-slate-100 py-2 text-[9px] font-bold text-center">
          {['Today','Yest.','7 Days','This Mo.','Last Mo.'].map((l,i)=>(
            <button key={i} className={`py-1.5 rounded ${i===0?'bg-blue-600 text-white font-black':'text-slate-400'}`}>{l}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-medium">Base Rent</span>
            <b className="font-mono text-slate-800">₹{telemetry.dailyRent||0}.00</b>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-medium">Deductions</span>
            <b className="font-mono text-danger">₹0.00</b>
          </div>
        </div>
      </div>

      {/* Payment presets */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wide block">Select Payment Action</span>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={()=>setPayAmt(dues)} className="border-2 border-blue-600 bg-blue-50 text-blue-700 text-xs font-black py-3 rounded-xl">Clear Dues</button>
          <button onClick={()=>setPayAmt(500)} className="border border-slate-200 text-slate-700 text-xs font-extrabold py-3 rounded-xl">+₹500</button>
          <button onClick={()=>setPayAmt(2000)} className="border border-slate-200 text-slate-700 text-xs font-extrabold py-3 rounded-xl">+₹2,000</button>
        </div>
        <div className="relative">
          <span className="absolute left-4 top-2.5 font-black text-slate-400 text-xl">₹</span>
          <input type="number" value={payAmt} onChange={e=>setPayAmt(Number(e.target.value))}
            className="w-full border-2 border-slate-200 rounded-xl p-3 pl-9 text-xl font-black font-mono focus:outline-none focus:border-blue-600 bg-slate-50 text-slate-800"/>
        </div>
        <button onClick={pay} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black p-4 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all active:scale-95">
          <CreditCard size={16}/> Clear Outstanding Balance Now
        </button>
      </div>

      {/* Vehicle */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Assigned Fleet</span>
        <div className="flex items-center justify-between text-xs">
          <div>
            <h4 className="font-black text-slate-800">{telemetry.vehicleModel||'Fleet Vehicle'}</h4>
            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">Plate: {telemetry.vehicleNumber||'Not Assigned'}</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${telemetry.vehicleNumber&&telemetry.vehicleNumber!=='Not Assigned'?'bg-emerald-50 text-emerald-700 border border-emerald-100':'bg-amber-50 text-amber-700 border border-amber-100'}`}>
            {telemetry.vehicleNumber&&telemetry.vehicleNumber!=='Not Assigned'?'Linked':'Unassigned'}
          </span>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Recent Transactions</h3>
          <button onClick={()=>goHistory('viewAll')} className="text-[10px] text-blue-600 font-black">View All →</button>
        </div>
        <div className="divide-y">
          {payments.slice(0,3).map((p,i)=>(
            <div key={i} onClick={()=>{setSelTxn(p);setShowReceipt(true);}} className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${p.status==='SUCCESS'?'bg-emerald-100':'bg-rose-100'}`}>
                  {p.status==='SUCCESS'?<CheckCircle size={13} className="text-emerald-600"/>:<Clock size={13} className="text-rose-600"/>}
                </div>
                <div><p className="text-xs font-black text-slate-800">{p.type}</p><p className="text-[9px] text-slate-400">{p.date}</p></div>
              </div>
              <span className={`text-xs font-black ${p.status==='SUCCESS'?'text-emerald-600':'text-rose-600'}`}>-₹{p.amount}</span>
            </div>
          ))}
          {payments.length===0&&!loading&&<div className="p-5 text-center text-xs text-slate-400">No transactions yet</div>}
        </div>
      </div>
    </div>
  );

  // ════════ WALLET ════════
  const WalletTab=()=>(
    <div className="space-y-4 pb-4">
      <div className="border-b border-slate-100 pb-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Wallet Advance Matrix</h3>
      </div>
      <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl p-5 text-white shadow-lg space-y-4">
        <div>
          <span className="text-[10px] uppercase font-black tracking-widest text-emerald-200 block">Available Advance Float</span>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-3xl font-black font-mono">{showBalance?`₹${wallet.toLocaleString('en-IN')}.00`:'₹••••'}</h1>
            <button onClick={()=>setShowBal(!showBalance)} className="opacity-70">{showBalance?<EyeOff size={14}/>:<Eye size={14}/>}</button>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={()=>alert('Top-up gateway activated...')} className="flex-1 bg-white/20 hover:bg-white/30 text-white text-[11px] font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition">
            <PlusCircle size={13}/> Add Float
          </button>
          <button onClick={()=>alert('Withdrawal queued...')} className="flex-1 bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-100 text-[11px] font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition">
            <ArrowDownLeft size={13}/> Request Payout
          </button>
        </div>
      </div>

      {/* Rewards */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Milestone Incentives</span>
          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded text-[9px] font-black uppercase font-mono">Driver Perks</span>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 p-3.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md"><Trophy size={14}/></div>
            <div><span className="text-[10px] text-slate-400 block font-medium">Unclaimed Bonus</span><b className="font-mono text-base text-purple-900">₹{rewards}.00</b></div>
          </div>
          <button onClick={claimRewards} disabled={rewards===0}
            className="bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] px-3 py-2 rounded-lg transition shadow-sm uppercase disabled:bg-slate-200 disabled:text-slate-400">
            Claim Bonus
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="border border-slate-100 bg-slate-50/50 p-2.5 rounded-xl flex items-center gap-2"><Star size={13} className="text-amber-500 shrink-0"/><div><span className="text-slate-400 block text-[9px]">Eco-Score</span><b className="text-slate-700">4.9 / 5.0</b></div></div>
          <div className="border border-slate-100 bg-slate-50/50 p-2.5 rounded-xl flex items-center gap-2"><PackageCheck size={13} className="text-blue-500 shrink-0"/><div><span className="text-slate-400 block text-[9px]">SLA Match</span><b className="text-slate-700">98.4%</b></div></div>
        </div>
      </div>

      {/* Wallet ledger */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Recent Transactions</span>
        <div className="space-y-2 text-xs max-h-40 overflow-y-auto pr-1">
          {payments.slice(0,5).map((p,i)=>(
            <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-2">
              <div><p className="font-semibold text-slate-800">{p.type}</p><span className="text-[9px] text-slate-400 font-mono">{p.date} • {p.ref}</span></div>
              <span className={`font-mono font-black ${p.status==='SUCCESS'?'text-emerald-600':'text-rose-600'}`}>-₹{p.amount}</span>
            </div>
          ))}
          {payments.length===0&&<p className="text-[11px] italic text-slate-400">No transactions yet.</p>}
        </div>
      </div>
    </div>
  );

  // ════════ HISTORY ════════
  const HistoryTab=()=>(
    <div className="space-y-3 pb-4">
      <div className="flex items-center justify-between">
        {historyFrom==='viewAll'&&(
          <button onClick={()=>{setHistoryFrom('tab');setTab('home');}} className="flex items-center gap-1 text-blue-600 font-black text-xs">
            <ChevronLeft size={16}/> Back
          </button>
        )}
        <div className={historyFrom==='viewAll'?'':'flex-1'}>
          <h3 className="font-black text-slate-800 text-sm uppercase">All Transactions</h3>
        </div>
        <span className="text-[10px] text-slate-400 font-bold">{payments.length} records</span>
      </div>
      {payments.length===0?(
        <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-slate-200">
          <Receipt size={32} className="text-slate-300 mx-auto mb-2"/>
          <p className="text-sm font-bold text-slate-400">No transactions found</p>
        </div>
      ):payments.map((p,i)=>(
        <div key={i} onClick={()=>{setSelTxn(p);setShowReceipt(true);}}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 cursor-pointer hover:border-blue-200 transition">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${p.status==='SUCCESS'?'bg-emerald-100':'bg-rose-100'}`}>
            {p.status==='SUCCESS'?<CheckCircle size={18} className="text-emerald-600"/>:<Clock size={18} className="text-rose-600"/>}
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-slate-800">{p.type}</p>
            <p className="text-[10px] text-slate-400">{p.date}</p>
            <p className="text-[9px] text-slate-400 font-mono">Ref: {p.ref}</p>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-base font-black ${p.status==='SUCCESS'?'text-emerald-600':'text-rose-600'}`}>-₹{p.amount}</p>
            <p className={`text-[9px] font-black uppercase ${p.status==='SUCCESS'?'text-emerald-500':'text-rose-500'}`}>{p.status}</p>
          </div>
        </div>
      ))}
    </div>
  );

  // ════════ PROFILE ════════
  const ProfileTab=()=>(
    <div className="space-y-4 pb-4">
      <div className="border-b border-slate-100 pb-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Core Identity Details</h3>
      </div>
      <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-center cursor-pointer hover:bg-slate-50 transition shrink-0">
          <Camera size={18} className="mb-0.5"/><span className="text-[7px] leading-tight font-black">SELFIE</span>
        </div>
        <div className="flex-1 space-y-1">
          <b className="text-slate-800 text-[11px] block">Live Verification Snapshot</b>
          <p className="text-[10px] text-slate-400 font-medium leading-tight">Click frame for face verification</p>
        </div>
      </div>
      <div className="space-y-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider block">1. Basic Driver Records</span>
        {profEdit?(
          <>
            <div className="space-y-1"><label className="text-slate-400 text-xs">Legal Full Name</label>
              <input value={prof.name} onChange={e=>setProf({...prof,name:e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-blue-600 bg-slate-50 font-semibold text-slate-800 text-sm shadow-inner"/></div>
            <div className="space-y-1"><label className="text-slate-400 text-xs">Phone (+91)</label>
              <input value={prof.phone} className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-100 font-mono font-bold text-slate-600 text-sm" disabled/></div>
            <div className="flex gap-2">
              <button onClick={()=>setProfEdit(false)} className="flex-1 bg-slate-100 text-slate-600 font-black py-2.5 rounded-xl text-xs">Cancel</button>
              <button onClick={()=>{const u={...user,name:prof.name};localStorage.setItem('user',JSON.stringify(u));setUser(u);setProfEdit(false);alert('✅ Saved!');}}
                className="flex-[2] bg-blue-600 text-white font-black py-2.5 rounded-xl text-xs shadow-md">Save</button>
            </div>
          </>
        ):(
          <>
            <div className="flex justify-between py-1 border-b border-slate-50 text-xs"><span className="text-slate-400">Full Name</span><span className="font-semibold">{user?.name||'—'}</span></div>
            <div className="flex justify-between py-1 border-b border-slate-50 text-xs"><span className="text-slate-400">Phone</span><span className="font-mono font-bold">{user?.phone||user?.mobile_number||'—'}</span></div>
            <div className="flex justify-between py-1 text-xs"><span className="text-slate-400">Driver Code</span><div className="flex items-center gap-1"><span className="font-mono font-black text-blue-600">{user?.usercode||user?.user_code||'—'}</span><button onClick={()=>navigator.clipboard.writeText(user?.usercode||'')}><Copy size={10} className="text-slate-400"/></button></div></div>
            <button onClick={()=>setProfEdit(true)} className="w-full mt-1 bg-blue-50 text-blue-700 font-black py-2.5 rounded-xl text-xs hover:bg-blue-100 transition">Edit Profile</button>
          </>
        )}
      </div>
      <div className="space-y-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <span className="text-[10px] font-black text-red-600 uppercase tracking-wider block">2. Emergency Contact</span>
        <div className="space-y-1"><label className="text-slate-400 text-xs">Nominee Name</label>
          <input placeholder="e.g. Sunita Singh" className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-blue-600 bg-slate-50 font-semibold text-sm shadow-inner"/></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1"><label className="text-slate-400 text-xs">Relation</label><input placeholder="Spouse / Father" className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none bg-slate-50 text-sm shadow-inner"/></div>
          <div className="space-y-1"><label className="text-slate-400 text-xs">SOS Phone</label><input type="tel" placeholder="9812345678" className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none bg-slate-50 font-mono text-sm shadow-inner"/></div>
        </div>
        <button onClick={()=>alert('✅ Emergency contact saved!')} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black p-3 rounded-xl text-xs transition">Save Profile</button>
      </div>
      <button onClick={logout} className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-black py-4 rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-red-100">
        <LogOut size={14}/> Logout
      </button>
    </div>
  );

  // ════════ KYC ════════
  const KycTab=()=>{
    const DocCard=({icon:Icon,title,docKey,children,onVerify,verifyLabel})=>(
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-black text-slate-800 flex items-center gap-1"><Icon size={14} className="text-slate-400"/> {title}</span>
          {statusBadge(kycState[docKey]?.status||'pending')}
        </div>
        {children}
        <button onClick={onVerify} disabled={kycLoading===docKey}
          className="w-full bg-blue-50 border border-blue-200 text-blue-700 font-black py-1.5 rounded-lg text-[10px] hover:bg-blue-100 transition uppercase tracking-wider disabled:opacity-50">
          {kycLoading===docKey?'Verifying…':verifyLabel||'Execute API Verification'}
        </button>
      </div>
    );
    const inp="w-full border border-slate-200 rounded-xl p-2 font-mono font-bold focus:outline-none text-slate-800 bg-slate-50 text-[11px]";
    return(
      <div className="space-y-3 pb-4">
        <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">KYC Validation Hub</h3>
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-black rounded uppercase font-mono">API Setu</span>
        </div>
        <p className="text-[11px] font-medium text-slate-500 leading-tight">Verify your documents via official API gateways. Uploaded files serve as manual backup if API times out.</p>

        {/* Aadhaar */}
        <DocCard icon={Fingerprint} title="Aadhaar Identity Card" docKey="aadhaar"
          onVerify={kycState.aadhaar.showOtp?kycAadhaarVerify:kycAadhaarInit}
          verifyLabel={kycState.aadhaar.showOtp?'Verify OTP':'Send OTP to Aadhaar Mobile'}>
          <div className="flex gap-2">
            <input value={kycState.aadhaar.value} maxLength={12}
              onChange={e=>setKycState(s=>({...s,aadhaar:{...s.aadhaar,value:e.target.value.replace(/\D/g,'').slice(0,12)}}))}
              placeholder="Enter 12-Digit Aadhaar" className={`${inp} flex-1`}/>
            <button className="bg-slate-100 border border-slate-200 px-2 rounded-xl text-slate-600"><Paperclip size={14}/></button>
          </div>
          {kycState.aadhaar.showOtp&&(
            <input value={kycState.aadhaar.otp}
              onChange={e=>setKycState(s=>({...s,aadhaar:{...s.aadhaar,otp:e.target.value}}))}
              placeholder="Enter OTP" className={inp}/>
          )}
        </DocCard>

        {/* PAN */}
        <DocCard icon={FileText} title="PAN Tax Identification" docKey="pan" onVerify={kycVerifyPAN}>
          <div className="flex gap-2">
            <input value={kycState.pan.value} maxLength={10}
              onChange={e=>setKycState(s=>({...s,pan:{...s.pan,value:e.target.value.toUpperCase()}}))}
              placeholder="Enter 10-Character PAN" className={`${inp} flex-1 uppercase`}/>
            <button className="bg-slate-100 border border-slate-200 px-2 rounded-xl text-slate-600"><Paperclip size={14}/></button>
          </div>
        </DocCard>

        {/* DL */}
        <DocCard icon={FileCheck2} title="Driving License (DL)" docKey="dl" onVerify={kycVerifyDL}>
          <div className="flex gap-2">
            <input value={kycState.dl.value}
              onChange={e=>setKycState(s=>({...s,dl:{...s.dl,value:e.target.value.toUpperCase()}}))}
              placeholder="SARATHI License Number" className={`${inp} flex-1`}/>
            <button className="bg-slate-100 border border-slate-200 px-2 rounded-xl text-slate-600"><Paperclip size={14}/></button>
          </div>
          <input type="date" value={kycState.dl.dob}
            onChange={e=>setKycState(s=>({...s,dl:{...s.dl,dob:e.target.value}}))}
            className={`${inp} w-full`} placeholder="Date of Birth"/>
        </DocCard>

        {/* Bank */}
        <DocCard icon={Landmark} title="Settlement Bank Account" docKey="bank" onVerify={kycVerifyBank}>
          <input value={kycState.bank.acc}
            onChange={e=>setKycState(s=>({...s,bank:{...s.bank,acc:e.target.value}}))}
            placeholder="Account Number" className={`${inp} w-full`}/>
          <div className="flex gap-2">
            <input value={kycState.bank.ifsc}
              onChange={e=>setKycState(s=>({...s,bank:{...s.bank,ifsc:e.target.value.toUpperCase()}}))}
              placeholder="IFSC Code" className={`${inp} flex-1 uppercase`}/>
            <button className="bg-slate-100 border border-slate-200 px-2 rounded-xl text-slate-600"><Paperclip size={14}/></button>
          </div>
        </DocCard>
      </div>
    );
  };

  // ════════ RENDER ════════
  return(
    <div className="h-[100dvh] w-full bg-slate-200 flex justify-center overflow-hidden font-sans">
      <div className="w-full max-w-[412px] bg-slate-50 h-full flex flex-col shadow-2xl relative overflow-hidden">

        {/* STATUS BAR */}
        <div className="bg-slate-950 text-white text-[11px] px-4 py-2 flex justify-between shrink-0 z-50">
          <span className="text-emerald-400 font-black tracking-widest text-[10px]">DRIVER TERMINAL</span>
          <span>{time}</span>
          <div className="flex gap-1.5"><Wifi size={11} className="text-emerald-400"/><Battery size={11}/></div>
        </div>

        {/* HEADER */}
        <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 shadow-sm z-40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-600/20">MG</div>
            <div>
              <span className="font-black text-slate-800 text-sm tracking-tight block">MobilityGrid</span>
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest -mt-0.5 block">Driver PWA Terminal</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* EN/HI toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
              <button onClick={()=>setLang('en')} className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${lang==='en'?'bg-white text-blue-600 shadow-sm':'text-slate-400'}`}>English</button>
              <button onClick={()=>setLang('hi')} className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${lang==='hi'?'bg-white text-blue-600 shadow-sm':'text-slate-400'}`}>हिन्दी</button>
            </div>
            {/* Chat */}
            <button onClick={()=>setShowChat(true)} className="relative p-2 rounded-xl bg-slate-100 hover:bg-blue-50 transition">
              <MessageCircle size={16} className="text-slate-600"/>
              <span className="absolute top-0 right-0 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"/>
            </button>
            {/* Bell */}
            <button onClick={()=>{setShowNotif(!showNotif);if(!showNotif)markRead();}} className="relative p-2 rounded-xl bg-slate-100 hover:bg-blue-50 transition">
              {unread>0?<BellRing size={16} className="text-blue-600"/>:<Bell size={16} className="text-slate-600"/>}
              {unread>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{unread>9?'9+':unread}</span>}
            </button>
            {/* Logout top-right */}
            <button onClick={logout} className="p-2 rounded-xl bg-red-50 hover:bg-red-100 transition"><LogOut size={16} className="text-red-600"/></button>
          </div>
        </div>

        {/* NOTIFICATION DROPDOWN */}
        {showNotif&&(
          <div className="absolute top-[108px] right-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[60] overflow-hidden">
            <div className="px-4 py-2.5 border-b flex justify-between items-center bg-slate-50">
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Notifications</span>
              <button onClick={()=>setShowNotif(false)}><X size={14} className="text-slate-400"/></button>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y">
              {notifs.length===0?<div className="p-5 text-center text-xs text-slate-400">No notifications</div>
              :notifs.slice(0,10).map((n,i)=>(
                <div key={i} className={`px-4 py-3 ${!n.is_read?'bg-blue-50/40':''}`}>
                  <p className="text-xs font-black text-slate-800">{n.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-[9px] text-slate-400 mt-1 font-mono">{new Date(n.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 bg-slate-50" style={{paddingBottom:'8.5rem'}}>
          {loading?<div className="text-center py-16 text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Data…</div>:(
            <>
              {tab==='home'    &&<HomeTab/>}
              {tab==='wallet'  &&<WalletTab/>}
              {tab==='history' &&<HistoryTab/>}
              {tab==='profile' &&<ProfileTab/>}
              {tab==='kyc'     &&<KycTab/>}
            </>
          )}
        </div>

        {/* SOS BAR — persistent */}
        <div className="absolute left-0 right-0 bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-2 flex items-center justify-between z-40 shadow-[0_-4px_10px_rgba(220,38,38,0.2)] border-t border-red-500" style={{bottom:'64px'}}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center animate-pulse"><ShieldAlert size={13} className="text-white"/></div>
            <span className="text-[10px] font-black tracking-wide">Vehicle Incident Support</span>
          </div>
          <button onClick={()=>setShowSOS(true)} className="bg-white text-red-700 text-[9px] font-black px-3 py-1.5 rounded-lg shadow-sm hover:bg-red-50 uppercase tracking-wide">Trigger SOS</button>
        </div>

        {/* BOTTOM NAV — 4 tabs */}
        <div className="shrink-0 h-16 bg-white border-t border-slate-200 flex justify-around items-center z-50 shadow-[0_-4px_15px_rgba(0,0,0,0.04)]">
          {[
            {id:'home',    Icon:Home,         label:'Dashboard'},
            {id:'wallet',  Icon:Wallet,       label:'Wallet'},
            {id:'profile', Icon:CircleUser,   label:'Profile'},
            {id:'kyc',     Icon:FileCheck2,   label:'KYC Hub'},
          ].map(({id,Icon,label})=>(
            <button key={id} onClick={()=>{setHistoryFrom('tab');setTab(id);}}
              className={`flex flex-col items-center gap-1 transition-all px-2 ${tab===id?'text-blue-600 -translate-y-0.5':'text-slate-400'}`}>
              <Icon size={tab===id?22:20}/>
              <span className="text-[9px] font-black tracking-wide">{label}</span>
            </button>
          ))}
        </div>

        {/* CHATBOT MODAL */}
        {showChat&&(
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex flex-col justify-end">
            <div className="bg-white rounded-t-[28px] h-[78%] flex flex-col shadow-2xl">
              <div className="px-4 py-3 bg-blue-600 text-white rounded-t-[28px] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">CC</div>
                  <div><p className="text-xs font-black">MobilityGrid Support</p><p className="text-[9px] text-blue-200">Online • Active</p></div>
                </div>
                <button onClick={()=>setShowChat(false)}><X size={18} className="text-white/80"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {chatHistory.map((c,i)=>(
                  <div key={i} className={`flex gap-2 items-start ${c.from==='user'?'justify-end ml-auto max-w-[85%]':'max-w-[85%]'}`}>
                    {c.from==='bot'&&<div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-[9px] font-black text-slate-500">AI</div>}
                    <div className={`p-3 rounded-2xl text-[11px] leading-relaxed shadow-sm ${c.from==='user'?'bg-blue-600 text-white rounded-tr-none':'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>{c.text}</div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t bg-white flex gap-2 items-center shrink-0">
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()}
                  placeholder="Type your issue…" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-800"/>
                <button onClick={sendChat} className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition shrink-0 shadow-md"><Send size={14}/></button>
              </div>
            </div>
          </div>
        )}

        {/* SOS MODAL */}
        {showSOS&&(
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
              {sosSent?(
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle size={32} className="text-emerald-600"/></div>
                  <h3 className="text-lg font-black text-slate-800">SOS Sent!</h3>
                  <p className="text-xs text-slate-500 mt-2">Owner & support notified. Help is on the way.</p>
                </div>
              ):(
                <>
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-2"><div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><ShieldAlert size={20} className="text-red-600"/></div><h3 className="text-lg font-black text-slate-800">Send SOS Alert</h3></div>
                    <button onClick={()=>setShowSOS(false)}><X size={18} className="text-slate-400"/></button>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">Describe the incident (optional). Vehicle details auto-attached.</p>
                  <textarea value={sosMsg} onChange={e=>setSosMsg(e.target.value)} placeholder="e.g. Flat tyre on highway…" rows={3}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-red-400 resize-none bg-slate-50"/>
                  <button onClick={sendSOS} className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                    <ShieldAlert size={16}/> Broadcast Emergency Alert
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* PAYMENT LOADING */}
        {showPaying&&(
          <div className="absolute inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-xs p-8 text-center shadow-2xl">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"/>
              <p className="text-lg font-black text-slate-800">Redirecting to PayYantra…</p>
              <p className="text-xs text-slate-500 mt-2">Secure payment gateway connecting</p>
              <button onClick={()=>setShowPaying(false)} className="mt-6 w-full py-3 bg-slate-100 text-slate-600 font-black rounded-xl text-xs">CANCEL</button>
            </div>
          </div>
        )}

        {/* RECEIPT MODAL */}
        {showReceipt&&selTxn&&(
          <div className="absolute inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-5"><h3 className="text-lg font-black text-slate-800">Receipt</h3><button onClick={()=>setShowReceipt(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center"><X size={16}/></button></div>
              <div className="text-center pb-4 border-b border-dashed mb-4">
                <p className="text-4xl font-black text-slate-800">₹{selTxn.amount}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{selTxn.type}</p>
              </div>
              <div className="space-y-2 text-xs">
                {[['Transaction ID',selTxn.id],['Date',selTxn.date],['Status',selTxn.status],['Reference',selTxn.ref]].map(([k,v])=>(
                  <div key={k} className="flex justify-between bg-slate-50 px-3 py-2 rounded-xl">
                    <span className="text-slate-400 font-bold">{k}</span>
                    <span className={`font-mono font-black ${k==='Status'&&v==='SUCCESS'?'text-emerald-600':'text-slate-700'}`}>{v||'—'}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>setShowReceipt(false)} className="w-full mt-5 py-3.5 bg-slate-900 text-white font-black rounded-2xl text-xs">CLOSE</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}