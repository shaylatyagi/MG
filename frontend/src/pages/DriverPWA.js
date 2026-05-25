// frontend/src/pages/DriverApp.jsx
import { useState, useEffect } from 'react';
import { 
  Wifi, Battery, LayoutDashboard, Wallet, User, FileCheck2,
  AlertCircle, TrendingUp, CreditCard, Clock, CheckCircle,
  Truck, Phone, Eye, EyeOff, Copy, Star, Award, Package,
  ArrowLeft, X, Send, Bell, Search, MessageCircle, Shield,
  Zap, Info, ChevronRight, Home, Navigation, MapPin,
  Calendar, Settings, HelpCircle, LogOut, Plus, Minus,
  Activity, Coins, Landmark, Fingerprint, Scroll, FileText
} from 'lucide-react';

export default function DriverApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [lang, setLang] = useState('en');
  const [showBalance, setShowBalance] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [showChatbot, setShowChatbot] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showIncident, setShowIncident] = useState(false);
  const [incidentMsg, setIncidentMsg] = useState('');
  const [incidentSent, setIncidentSent] = useState(false);
  const [showBalanceHistory, setShowBalanceHistory] = useState(false);

  // Demo data
  const [duesAmount, setDuesAmount] = useState(1450);
  const [walletBalance, setWalletBalance] = useState(1500);
  const [paymentAmount, setPaymentAmount] = useState(1450);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [activeHorizon, setActiveHorizon] = useState('today');
  const [unclaimedBonus, setUnclaimedBonus] = useState(350);
  const [ecoScore, setEcoScore] = useState(4.9);
  const [slaMatch, setSlaMatch] = useState(98.4);

  // Chat history
  const [chatHistory, setChatHistory] = useState([
    { type: 'bot', message: 'Hello! I\'m your MobilityGrid assistant. How can I help you today?' }
  ]);

  // Recent payments - EXACT from HTML
  const [recentPayments, setRecentPayments] = useState([
    { id: "TXN-4401-2026", amount: 850, date: "23-05-2026 12:09:11", type: "Daily Lease Rent Charge Deducted", isCredit: false, ref: "DEB-8812", tag: "Lease Rent" },
    { id: "ADV-9011", amount: 1500, date: "22-05-2026 09:15:22", type: "Handover Security Advance Float Received", isCredit: true, ref: "ADV-9011", tag: "Security Advance" }
  ]);

  // Notifications - EXACT from HTML
  const [notifications, setNotifications] = useState([
    { id: 1, title: "System Alert", message: "High Battery Degradation Alert. Please dock vehicle by 06:00 PM today.", time: "11:30 AM", read: false, icon: "⚡" },
    { id: 2, title: "Operational Update", message: "Route Parameter Modifications for e-commerce hub.", time: "04:15 PM Yesterday", read: true, icon: "ℹ️" }
  ]);

  // Vehicle telemetry data
  const [telemetry, setTelemetry] = useState({
    battery: 92,
    driven: 45,
    temp: 72,
    tirePressure: 36
  });

  // User data - EXACT from HTML
  const user = {
    name: "Rajesh Kumar",
    usercode: "DRV_DEMO_001",
    phone: "+91 9876542345",
    email: "rajesh.driver@mobilitygrid.com",
    licenseNo: "DL-142021008892",
    licenseExpiry: "2028-05-15",
    aadhaar: "XXXX-XXXX-XXXX",
    pan: "ABCDE1234F",
    bankAccount: "XXXXXXXXXX1234",
    ifsc: "HDFC0001234",
    vehicle: {
      registration: "MH-12-QX-4019",
      model: "Tata Ace EV Truck",
      dailyRent: 850,
      type: "Electric Cargo",
      insurance: "Valid till Dec 2026"
    },
    emergency: {
      name: "Sunita Singh",
      relation: "Spouse",
      phone: "+91 9876543210"
    },
    stats: {
      totalTrips: 342,
      rating: 4.9,
      joinedDate: "2024-01-15"
    }
  };

  // Update time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Translations - Bilingual support
  const t = {
    en: {
      home: 'Dashboard',
      wallet: 'Wallet Float',
      profile: 'My Profile',
      kyc: 'KYC Hub',
      dues: 'Rent Dues To Pay',
      balance: 'Driver Wallet Balance',
      baseRent: 'Base Rent',
      deductions: 'Deductions',
      pay: 'Clear Outstanding Balance Now',
      asset: 'Assigned Fleet Deployment',
      history: 'Ledger & Payment History',
      sos: 'Vehicle Incident Support Trigger',
      sosDesc: 'Encountered an on-road system error, breakdown, or scheduling delay? Notify the owner instantly.',
      sosBtn: 'Broadcast Alarm to Owner',
      navHome: 'Dashboard',
      navWallet: 'Wallet Float',
      navProf: 'My Profile',
      navKyc: 'KYC Hub',
      bonus: 'Unclaimed Fleet Bonus',
      claim: 'Claim Bonus',
      ecoScore: 'Eco-Score',
      slaMatch: 'SLA Match',
      today: 'Today',
      yesterday: 'Yesterday',
      week: '7 Days',
      month: 'Month',
      lastMonth: 'Last Mo',
      paymentActions: 'Select Payment Action',
      clearDues: 'Clear Dues',
      advance: 'Advance adjustment security deposited at vehicle handover',
      deploymentToken: 'Deployment Token',
      activeFleetLog: 'Active Fleet Log',
      liveAudited: 'Live Audited',
      credit: 'Credit',
      debit: 'Debit',
      telemetry: 'Vehicle Telemetry',
      battery: 'Battery',
      driven: 'Driven',
      temperature: 'Temp',
      tirePressure: 'Tire Pressure',
      personalInfo: 'Personal Information',
      emergencyContact: 'Emergency Contact',
      vehicleDetails: 'Vehicle Details',
      kycVerification: 'KYC Verification',
      aadhaar: 'Aadhaar Identity Card',
      pan: 'PAN Tax Identification Card',
      drivingLicense: 'Driving License',
      bankAccount: 'Settlement Bank Account',
      pendingInputs: 'Pending Inputs',
      verifyApi: 'Execute API Verification Pipeline',
      apiEnabled: 'API Enabled',
      kycDesc: 'The platform verifies your records instantly via electronic gateway APIs. If the central registry gateway timeouts, your uploaded documents act as an offline fallback for the compliance team\'s manual verification loop.'
    },
    hi: {
      home: 'डैशबोर्ड',
      wallet: 'वॉलेट फ्लोट',
      profile: 'मेरी प्रोफ़ाइल',
      kyc: 'केवाईसी हब',
      dues: 'किराए का बकाया',
      balance: 'ड्राइवर वॉलेट बैलेंस',
      baseRent: 'मूल किराया',
      deductions: 'कटौती',
      pay: 'बकाया राशि का भुगतान करें',
      asset: 'आवंटित वाहन',
      history: 'लेन-देन का इतिहास',
      sos: 'वाहन सहायता',
      sosDesc: 'सड़क पर कोई समस्या? मालिक को तुरंत सूचित करें।',
      sosBtn: 'अलार्म भेजें',
      navHome: 'डैशबोर्ड',
      navWallet: 'वॉलेट',
      navProf: 'प्रोफाइल',
      navKyc: 'केवाईसी',
      bonus: 'बिना दावा बोनस',
      claim: 'दावा करें',
      ecoScore: 'इको-स्कोर',
      slaMatch: 'एसएलए मैच',
      today: 'आज',
      yesterday: 'कल',
      week: '7 दिन',
      month: 'महीना',
      lastMonth: 'पिछला माह',
      paymentActions: 'भुगतान राशि चुनें',
      clearDues: 'बकाया चुकता करें',
      advance: 'वाहन हैंडओवर पर जमा एडवांस सुरक्षा',
      deploymentToken: 'डिप्लॉयमेंट टोकन',
      activeFleetLog: 'सक्रिय फ्लीट लॉग',
      liveAudited: 'लाइव ऑडिटेड',
      credit: 'जमा',
      debit: 'निकासी',
      telemetry: 'वाहन टेलीमेट्री',
      battery: 'बैटरी',
      driven: 'ड्राइवन',
      temperature: 'तापमान',
      tirePressure: 'टायर प्रेशर',
      personalInfo: 'व्यक्तिगत जानकारी',
      emergencyContact: 'आपातकालीन संपर्क',
      vehicleDetails: 'वाहन विवरण',
      kycVerification: 'केवाईसी सत्यापन',
      aadhaar: 'आधार कार्ड',
      pan: 'पैन कार्ड',
      drivingLicense: 'ड्राइविंग लाइसेंस',
      bankAccount: 'बैंक खाता',
      pendingInputs: 'लंबित',
      verifyApi: 'एपीआई सत्यापन करें',
      apiEnabled: 'एपीआई सक्षम',
      kycDesc: 'प्लेटफ़ॉर्म आपके रिकॉर्ड की तुरंत पुष्टि करता है। यदि गेटवे टाइमआउट होता है, तो आपके दस्तावेज़ ऑफ़लाइन बैकअप के रूप में काम करेंगे।'
    }
  };

  const tx = t[lang];

  // Payment handlers
  const handlePayment = () => {
    const newPayment = {
      id: `TXN-${Math.floor(4400 + Math.random() * 100)}-2026`,
      amount: duesAmount,
      date: new Date().toLocaleString(),
      type: "Online Payment Received",
      isCredit: true,
      ref: `TXN-${Date.now()}`,
      tag: "Wallet Deposit"
    };
    setRecentPayments([newPayment, ...recentPayments]);
    setWalletBalance(walletBalance + (paymentAmount > duesAmount ? paymentAmount - duesAmount : 0));
    setDuesAmount(0);
    setPaymentSuccess(true);
    setTimeout(() => setPaymentSuccess(false), 3000);
    
    setNotifications([{ 
      id: Date.now(), 
      title: "Payment Success", 
      message: `₹${duesAmount} payment successful.`, 
      time: "Just now", 
      read: false, 
      icon: "✅" 
    }, ...notifications]);
  };

  const handleClaimBonus = () => {
    if (unclaimedBonus > 0) {
      setWalletBalance(walletBalance + unclaimedBonus);
      setUnclaimedBonus(0);
      alert(`₹${unclaimedBonus} added to your wallet!`);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const handleIncidentSend = () => {
    if (!incidentMsg.trim()) return;
    setIncidentSent(true);
    setTimeout(() => {
      setIncidentSent(false);
      setShowIncident(false);
      setIncidentMsg('');
    }, 2000);
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim()) return;
    setChatHistory([...chatHistory, { type: 'user', message: chatMessage }]);
    setTimeout(() => {
      setChatHistory(prev => [...prev, { type: 'bot', message: 'Thank you for your message. Our support team will get back to you shortly.' }]);
    }, 1000);
    setChatMessage('');
  };

  const markNotificationRead = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Dashboard Content - EXACT replica from HTML
  const DashboardContent = () => (
    <div className="flex flex-col gap-4">
      {/* Time Horizon Selector */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-5 gap-1">
        <button onClick={() => setActiveHorizon('today')} className={`text-[10px] font-black uppercase py-2 rounded-lg transition-all ${activeHorizon === 'today' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>{tx.today}</button>
        <button onClick={() => setActiveHorizon('yesterday')} className={`text-[10px] font-black uppercase py-2 rounded-lg ${activeHorizon === 'yesterday' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>{tx.yesterday}</button>
        <button onClick={() => setActiveHorizon('week')} className={`text-[10px] font-black uppercase py-2 rounded-lg ${activeHorizon === 'week' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>{tx.week}</button>
        <button onClick={() => setActiveHorizon('month')} className={`text-[10px] font-black uppercase py-2 rounded-lg ${activeHorizon === 'month' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>{tx.month}</button>
        <button onClick={() => setActiveHorizon('last_month')} className={`text-[10px] font-black uppercase py-2 rounded-lg ${activeHorizon === 'last_month' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>{tx.lastMonth}</button>
      </div>

      {/* Vehicle Telemetry Card - from HTML */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-slate-400 uppercase">{tx.telemetry}</span>
          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Live</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-slate-50 p-2 rounded-xl"><span className="text-[9px] text-slate-400 block">Active Vehicle</span><b className="text-xs">{user.vehicle.registration}</b></div>
          <div className="bg-slate-50 p-2 rounded-xl"><span className="text-[9px] text-slate-400 block">{tx.battery}</span><b className="text-base text-emerald-600">{telemetry.battery}%</b></div>
          <div className="bg-slate-50 p-2 rounded-xl"><span className="text-[9px] text-slate-400 block">{tx.driven}</span><b className="text-base">{telemetry.driven} KM</b></div>
          <div className="bg-slate-50 p-2 rounded-xl"><span className="text-[9px] text-slate-400 block">Outstanding</span><b className="text-base text-amber-600">₹{duesAmount}</b></div>
        </div>
      </div>

      {/* Dues Card */}
      <div className="bg-white border-2 border-amber-400 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs font-black text-amber-600 uppercase tracking-wider flex items-center gap-1"><AlertCircle size={14} /> {tx.dues}</span>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">₹{duesAmount.toLocaleString()}.00</h2>
          <div className="flex items-center gap-3 pt-1.5 text-[11px] font-bold text-slate-500 border-t border-dashed border-slate-100 mt-1">
            <div>{tx.baseRent}: <span className="font-mono text-slate-800">₹1,200.00</span></div>
            <div className="w-1 h-1 rounded-full bg-slate-300"></div>
            <div>{tx.deductions}: <span className="font-mono text-rose-600">₹250.00</span></div>
          </div>
        </div>
        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 border border-amber-100"><TrendingUp size={24} /></div>
      </div>

      {/* Wallet Card */}
      <div className="bg-gradient-to-br from-emerald-950 to-slate-900 text-white rounded-2xl p-4 shadow-md flex items-center justify-between border border-emerald-800">
        <div className="space-y-1">
          <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1"><Wallet size={14} /> {tx.balance}</span>
          <div className="flex items-center gap-2">
            <h2 className="text-4xl font-black text-emerald-300 tracking-tight">₹{walletBalance.toLocaleString()}.00</h2>
            <button onClick={() => setShowBalance(!showBalance)} className="p-1 hover:bg-white/20 rounded"><EyeOff size={14} /></button>
          </div>
          <p className="text-[11px] font-medium text-slate-300">{tx.advance}</p>
        </div>
        <div className="w-12 h-12 bg-emerald-800/40 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-700/50"><Shield size={24} /></div>
      </div>

      {/* Payment Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3.5">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wide block">{tx.paymentActions}</span>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => setPaymentAmount(duesAmount)} className="border-2 border-blue-600 bg-blue-50 text-blue-700 text-xs font-black py-3 rounded-xl">{tx.clearDues}</button>
          <button onClick={() => setPaymentAmount(500)} className="border border-slate-200 hover:border-blue-600 text-slate-700 text-xs font-extrabold py-3 rounded-xl">+ ₹500</button>
          <button onClick={() => setPaymentAmount(2000)} className="border border-slate-200 hover:border-blue-600 text-slate-700 text-xs font-extrabold py-3 rounded-xl">+ ₹2,000</button>
        </div>
        <div className="relative">
          <span className="absolute left-4 top-2.5 font-black text-slate-400 text-xl">₹</span>
          <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} className="w-full border-2 border-slate-200 rounded-xl p-3 pl-9 text-xl font-black focus:outline-none focus:border-blue-600 bg-slate-50 text-slate-800 shadow-inner" />
        </div>
        <button onClick={handlePayment} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black p-4 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all">
          <CreditCard size={18} /> {tx.pay}
        </button>
        {paymentSuccess && <div className="p-3 bg-green-50 text-green-600 rounded-xl text-sm flex items-center gap-2"><CheckCircle size={16} /> Payment successful!</div>}
      </div>

      {/* Assigned Vehicle */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{tx.asset}</span>
        <div className="flex items-center justify-between text-xs font-bold">
          <div><h4 className="text-slate-800 text-sm font-black">{user.vehicle.model}</h4><span className="text-[10px] font-mono text-slate-400 block mt-0.5">Plate: {user.vehicle.registration}</span></div>
          <div className="text-right bg-slate-50 p-2 rounded-xl border border-slate-100"><span className="text-[9px] text-slate-400 block uppercase tracking-tight">{tx.deploymentToken}</span><b className="font-mono text-slate-800 text-xs uppercase">{tx.activeFleetLog}</b></div>
        </div>
      </div>

      {/* Rewards Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-50 pb-2"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Milestone Incentives & Rewards</span><span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded text-[9px] font-bold">Driver Perks</span></div>
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 p-3.5 rounded-xl mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center"><Award size={16} /></div><div><span className="text-[10px] text-slate-400 block">{tx.bonus}</span><b className="font-mono text-base text-purple-900">₹{unclaimedBonus}.00</b></div></div>
          <button onClick={handleClaimBonus} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] px-3 py-2 rounded-lg">{tx.claim}</button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] mt-3">
          <div className="border border-slate-100 bg-slate-50/50 p-2.5 rounded-xl flex items-center gap-2"><Star size={14} className="text-amber-500" /><div><span className="text-slate-400 block text-[9px]">{tx.ecoScore}</span><b>{ecoScore} / 5.0</b></div></div>
          <div className="border border-slate-100 bg-slate-50/50 p-2.5 rounded-xl flex items-center gap-2"><Package size={14} className="text-blue-500" /><div><span className="text-slate-400 block text-[9px]">{tx.slaMatch}</span><b>{slaMatch}%</b></div></div>
        </div>
      </div>

      {/* Payment History */}
      <div className="space-y-2">
        <div className="flex items-center justify-between"><h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{tx.history}</h3><span className="text-[10px] font-bold text-slate-400 font-mono">{tx.liveAudited}</span></div>
        <div className="space-y-2">
          {recentPayments.map((payment, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${payment.isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} flex items-center justify-center border`}>
                  {payment.isCredit ? <CheckCircle size={16} /> : <Clock size={16} />}
                </div>
                <div><b className="text-xs text-slate-800 block font-black">{payment.type}</b><span className="text-[10px] text-slate-400 font-mono block">{payment.date} • Ref: {payment.ref}</span></div>
              </div>
              <div className="text-right"><b className={`text-sm font-mono font-black ${payment.isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>{payment.isCredit ? '+' : '-'}₹{payment.amount}</b><span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase font-extrabold block mt-0.5">{payment.isCredit ? tx.credit : tx.debit}</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* SOS Section */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3.5 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center animate-pulse"><Phone size={20} /></div>
        <div className="flex-1 text-xs"><b className="text-slate-900 font-black block">{tx.sos}</b><p className="text-[11px] text-slate-500 font-semibold leading-tight mt-0.5">{tx.sosDesc}</p><button onClick={() => setShowIncident(true)} className="mt-2.5 w-full bg-red-600 hover:bg-red-700 text-white text-xs font-black py-2.5 px-3 rounded-xl shadow-sm tracking-wide uppercase transition-colors">{tx.sosBtn}</button></div>
      </div>
    </div>
  );

  // Wallet Content
  const WalletContent = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl p-5 text-white shadow-lg">
        <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-200 block">Available Advance Float Balance</span>
        <h1 className="text-3xl font-mono font-bold mt-1">₹{walletBalance.toLocaleString()}.00</h1>
        <div className="flex gap-2 pt-3">
          <button className="flex-1 bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold py-2 rounded-xl flex items-center justify-center gap-1"><Wallet size={14} /> Add Float</button>
          <button className="flex-1 bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-100 text-[11px] font-bold py-2 rounded-xl flex items-center justify-center gap-1"><ArrowLeft size={14} /> Request Payout</button>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between border-b pb-2 mb-3"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent Transactions</span><button onClick={() => setShowBalanceHistory(!showBalanceHistory)} className="text-blue-600 text-[10px]">View All</button></div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {recentPayments.map((p, i) => (
            <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-2">
              <div><p className="font-semibold text-slate-800 text-xs">{p.type}</p><span className="text-[10px] text-slate-400 font-mono">{p.date}</span></div>
              <span className={`font-mono font-bold ${p.isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>{p.isCredit ? '+' : '-'}₹{p.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Profile Content (merged with KYC)
  const ProfileContent = () => (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto">{user.name.charAt(0)}</div>
        <h2 className="text-xl font-bold mt-3">{user.name}</h2>
        <p className="text-slate-500 text-sm">{user.usercode}</p>
        <div className="flex justify-center gap-2 mt-2"><span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1"><Star size={12} /> {user.stats.rating}</span><span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">{user.stats.totalTrips} Trips</span></div>
      </div>

      {/* Personal Information */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <h3 className="font-bold mb-3 flex items-center gap-2"><User size={14} /> {tx.personalInfo}</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b"><span className="text-slate-500">Phone</span><span className="font-medium">{user.phone}</span><button onClick={() => navigator.clipboard.writeText(user.phone)} className="text-blue-600"><Copy size={14} /></button></div>
          <div className="flex justify-between py-2 border-b"><span className="text-slate-500">Email</span><span className="font-medium">{user.email}</span></div>
          <div className="flex justify-between py-2 border-b"><span className="text-slate-500">License No</span><span className="font-medium">{user.licenseNo}</span></div>
          <div className="flex justify-between py-2"><span className="text-slate-500">License Expiry</span><span className="font-medium">{user.licenseExpiry}</span></div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Phone size={14} /> {tx.emergencyContact}</h3>
        <div className="space-y-2">
          <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium">{user.emergency.name}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Relation</span><span className="font-medium">{user.emergency.relation}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-medium">{user.emergency.phone}</span></div>
        </div>
      </div>

      {/* Vehicle Details */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Truck size={14} /> {tx.vehicleDetails}</h3>
        <div className="space-y-2">
          <div className="flex justify-between"><span className="text-slate-500">Model</span><span className="font-medium">{user.vehicle.model}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Registration</span><span className="font-medium">{user.vehicle.registration}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-medium">{user.vehicle.type}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Daily Rent</span><span className="font-medium">₹{user.vehicle.dailyRent}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Insurance</span><span className="font-medium">{user.vehicle.insurance}</span></div>
        </div>
      </div>
    </div>
  );

  // KYC Content - API verification
  const KYCContent = () => (
    <div className="space-y-4">
      <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tx.kycVerification}</h3>
        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold rounded uppercase font-mono">{tx.apiEnabled}</span>
      </div>
      <p className="text-[11px] font-medium text-slate-500 leading-tight">{tx.kycDesc}</p>
      
      <div className="space-y-3.5">
        {/* Aadhaar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between"><span className="font-bold text-slate-800 flex items-center gap-1"><Fingerprint size={14} className="text-slate-400" /> {tx.aadhaar}</span><span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded uppercase font-mono">{tx.pendingInputs}</span></div>
          <div className="flex gap-2"><input type="text" placeholder="Enter 12-Digit Smart Card ID String" className="flex-1 border border-slate-200 rounded-xl p-2 font-mono font-bold text-[11px]" /><button className="bg-slate-100 border border-slate-200 px-3 rounded-xl"><Copy size={14} /></button></div>
          <button className="w-full bg-blue-50 border border-blue-200 text-blue-700 font-bold py-1.5 rounded-lg text-[10px] uppercase tracking-wider">{tx.verifyApi}</button>
        </div>

        {/* PAN */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between"><span className="font-bold text-slate-800 flex items-center gap-1"><FileText size={14} className="text-slate-400" /> {tx.pan}</span><span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded uppercase font-mono">{tx.pendingInputs}</span></div>
          <div className="flex gap-2"><input type="text" placeholder="Enter 10-Character Alphanumeric ID" className="flex-1 border border-slate-200 rounded-xl p-2 font-mono font-bold text-[11px] uppercase" /><button className="bg-slate-100 border border-slate-200 px-3 rounded-xl"><Copy size={14} /></button></div>
          <button className="w-full bg-blue-50 border border-blue-200 text-blue-700 font-bold py-1.5 rounded-lg text-[10px] uppercase tracking-wider">{tx.verifyApi}</button>
        </div>

        {/* Driving License */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between"><span className="font-bold text-slate-800 flex items-center gap-1"><Shield size={14} className="text-slate-400" /> {tx.drivingLicense}</span><span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded uppercase font-mono">{tx.pendingInputs}</span></div>
          <div className="flex gap-2"><input type="text" placeholder="Enter SARATHI License Reference Number" className="flex-1 border border-slate-200 rounded-xl p-2 font-mono font-bold text-[11px]" /><button className="bg-slate-100 border border-slate-200 px-3 rounded-xl"><Copy size={14} /></button></div>
          <button className="w-full bg-blue-50 border border-blue-200 text-blue-700 font-bold py-1.5 rounded-lg text-[10px] uppercase tracking-wider">{tx.verifyApi}</button>
        </div>

        {/* Bank Account */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between"><span className="font-bold text-slate-800 flex items-center gap-1"><Landmark size={14} className="text-slate-400" /> {tx.bankAccount}</span><span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded uppercase font-mono">{tx.pendingInputs}</span></div>
          <div className="space-y-2"><input type="text" placeholder="Account Number String" className="w-full border border-slate-200 rounded-xl p-2 font-mono font-bold text-[11px]" /><div className="flex gap-2"><input type="text" placeholder="IFSC Code Routing" className="flex-1 border border-slate-200 rounded-xl p-2 font-mono font-bold text-[11px] uppercase" /><button className="bg-slate-100 border border-slate-200 px-3 rounded-xl"><Copy size={14} /></button></div></div>
          <button className="w-full bg-blue-50 border border-blue-200 text-blue-700 font-bold py-1.5 rounded-lg text-[10px] uppercase tracking-wider">{tx.verifyApi}</button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch(activeTab) {
      case 'home': return <DashboardContent />;
      case 'wallet': return <WalletContent />;
      case 'profile': return <ProfileContent />;
      case 'kyc': return <KYCContent />;
      default: return <DashboardContent />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-[412px] mx-auto bg-white min-h-screen shadow-xl relative">
        {/* Status Bar */}
        <div className="bg-slate-950 text-white text-[11px] px-6 py-2 flex items-center justify-between shrink-0 font-medium">
          <span>{currentTime}</span>
          <div className="flex items-center gap-1.5"><Wifi size={14} className="text-emerald-400" /><Battery size={14} /></div>
        </div>

        {/* Header with Icons */}
        <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-md">M</div>
            <div><span className="font-heading font-black text-sm text-slate-900 block">MobilityGrid</span><span className="text-[9px] text-slate-400 block -mt-0.5 font-bold uppercase tracking-wider">Driver PWA Terminal</span></div>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-32 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 hidden sm:block" />
              <button className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-blue-50"><Search size={14} /></button>
            </div>
            
            {/* Notification Bell */}
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-blue-50">
                <Bell size={14} />
                {notifications.filter(n => !n.read).length > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse"></span>}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-8 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-sm">Notifications</h3><button onClick={() => setShowNotifications(false)}><X size={14} /></button></div>
                  {notifications.map(n => (
                    <div key={n.id} onClick={() => markNotificationRead(n.id)} className={`p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${!n.read ? 'bg-blue-50' : ''}`}>
                      <div className="flex gap-2"><span className="text-lg">{n.icon}</span><div><p className="font-semibold text-xs">{n.title}</p><p className="text-[10px] text-slate-500">{n.message}</p><p className="text-[9px] text-slate-400 mt-1">{n.time}</p></div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Chatbot */}
            <button onClick={() => setShowChatbot(true)} className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-blue-50"><MessageCircle size={14} /></button>
            
            {/* Language Toggle */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button onClick={() => setLang('en')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${lang === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>EN</button>
              <button onClick={() => setLang('hi')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${lang === 'hi' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>हिं</button>
            </div>
            
            {/* Logout */}
            <button onClick={handleLogout} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><LogOut size={14} /></button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-28">
          {renderContent()}
        </div>

        {/* SOS Footer Bar */}
        <div className="absolute bottom-16 left-0 right-0 bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-2 flex items-center justify-between z-40 shadow-[0_-4px_10px_rgba(220,38,38,0.15)] border-t border-red-500">
          <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center animate-pulse"><AlertCircle size={14} /></div><div className="text-[10px] font-medium"><span className="block font-bold leading-tight">{tx.sos}</span></div></div>
          <button onClick={() => setShowIncident(true)} className="bg-white text-red-700 text-[9px] font-bold px-2.5 py-1 rounded shadow-sm hover:bg-red-50 transition-colors uppercase tracking-wide">{tx.sosBtn}</button>
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around text-slate-400 font-black text-[10px] z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] rounded-b-[36px]">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-blue-600' : 'hover:text-slate-800'}`}><LayoutDashboard size={20} /><span className="text-[10px]">{tx.navHome}</span></button>
          <button onClick={() => setActiveTab('wallet')} className={`flex flex-col items-center gap-1 ${activeTab === 'wallet' ? 'text-blue-600' : 'hover:text-slate-800'}`}><Wallet size={20} /><span className="text-[10px]">{tx.navWallet}</span></button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-blue-600' : 'hover:text-slate-800'}`}><User size={20} /><span className="text-[10px]">{tx.navProf}</span></button>
          <button onClick={() => setActiveTab('kyc')} className={`flex flex-col items-center gap-1 ${activeTab === 'kyc' ? 'text-blue-600' : 'hover:text-slate-800'}`}><FileCheck2 size={20} /><span className="text-[10px]">{tx.navKyc}</span></button>
        </div>

        {/* Incident Modal */}
        {showIncident && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
              <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-red-600">🚨 {tx.sos}</h3><button onClick={() => setShowIncident(false)}><X size={20} /></button></div>
              {incidentSent ? (
                <div className="p-4 bg-green-50 text-green-600 rounded-xl text-center"><CheckCircle size={24} className="mx-auto mb-2" />Alert sent to owner successfully!</div>
              ) : (
                <>
                  <textarea value={incidentMsg} onChange={(e) => setIncidentMsg(e.target.value)} placeholder={tx.sosDesc} className="w-full h-24 p-3 border border-slate-200 rounded-xl resize-none text-sm" />
                  <div className="flex gap-3 mt-4"><button onClick={() => setShowIncident(false)} className="flex-1 py-2 bg-slate-100 rounded-lg">Cancel</button><button onClick={handleIncidentSend} className="flex-1 py-2 bg-red-600 text-white rounded-lg">Send Alert</button></div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Chatbot Modal */}
        {showChatbot && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
            <div className="bg-white rounded-t-2xl w-full max-w-[412px] h-3/4 flex flex-col">
              <div className="p-4 bg-blue-600 text-white rounded-t-2xl flex justify-between items-center"><h3 className="font-bold">MobilityGrid Assistant</h3><button onClick={() => setShowChatbot(false)}><X size={20} /></button></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-xl ${msg.type === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-slate-200 flex gap-2">
                <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()} placeholder="Type your message..." className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                <button onClick={sendChatMessage} className="p-2 bg-blue-600 text-white rounded-xl"><Send size={18} /></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}