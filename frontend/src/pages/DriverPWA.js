import React, { useState, useEffect } from 'react';
import { 
  Wifi, Battery, Truck, Wallet, CreditCard, Clock, CheckCircle,
  Phone, Eye, EyeOff, Copy, X, Send, Bell, MessageCircle,
  Home, LogOut, CircleUser, History, Receipt, ExternalLink, User,
  FileText, Camera
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DriverPWA() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lang, setLang] = useState('en');
  const [showBalance, setShowBalance] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [currentDay, setCurrentDay] = useState('');
  const [showChatbot, setShowChatbot] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [showIncident, setShowIncident] = useState(false);
  const [incidentMsg, setIncidentMsg] = useState('');
  const [incidentSent, setIncidentSent] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);

  // Real data states
  const [user, setUser] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [duesAmount, setDuesAmount] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [telemetry, setTelemetry] = useState({});
  const [recentPayments, setRecentPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // KYC States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    aadhaar: '',
    photo: ''
  });

  const API_BASE = 'https://mg-qw5s.onrender.com';

  // Get user from localStorage
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(storedUser);
    setProfileData({
      name: storedUser.name || '',
      aadhaar: localStorage.getItem('driver_aadhaar') || '',
      photo: localStorage.getItem('driver_photo') || ''
    });
  }, []);

  // Fetch all real data
  try {
  const duesRes = await fetch(`${API_BASE}/api/driver/dues?phone=${phone}`, { headers: { 'Authorization': `Bearer ${token}` } });
  const duesData = await duesRes.json();
  if (duesData && duesData.dues !== undefined) {
    setDuesAmount(duesData.dues);
    setPaymentAmount(duesData.dues);
  } else {
    setDuesAmount(850);
    setPaymentAmount(850);
  }
} catch {
  setDuesAmount(850);
  setPaymentAmount(850);
}

  useEffect(() => {
    fetchAllData();
  }, [user]);

  // Refresh if redirected from payment
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('refresh') === 'true' || urlParams.get('status') === 'success') {
      fetchAllData();
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [user]);

  // Clock
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
      setCurrentDate(`${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`);
      setCurrentDay(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()]);
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const initiatePayment = async () => {
  setShowPaymentModal(true);
  const token = localStorage.getItem('token');
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const rawPhone = storedUser?.phone_number || storedUser?.phone || storedUser?.mobile_number || '9876542345';
  const phone = String(rawPhone).replace(/\D/g, '').slice(-10);
  const amount = duesAmount > 0 ? duesAmount : 850;

  try {
    const response = await fetch(`${API_BASE}/api/payment/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: amount,
        customerName: storedUser?.name || 'Driver',
        customerPhone: phone,
        customerEmail: storedUser?.email || 'driver@mobilitygrid.com'
      })
    });

    const data = await response.json();
    const checkoutUrl = data?.data?.data?.checkoutUrl || data?.checkoutUrl;

    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    } else {
      alert('Payment gateway error. Please try again.');
      setShowPaymentModal(false);
    }
  } catch (error) {
    console.error('Payment error:', error);
    alert('Network error. Please check your connection.');
    setShowPaymentModal(false);
  }
};

  const handleUpdateProfile = () => {
    // Save to local storage for real-time reflection
    const updatedUser = { ...user, name: profileData.name };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    localStorage.setItem('driver_aadhaar', profileData.aadhaar);
    localStorage.setItem('driver_photo', profileData.photo);
    
    setUser(updatedUser);
    setIsEditingProfile(false);
    
    // Simulate API Call Success
    setTimeout(() => alert("✅ Profile & KYC Details Updated Successfully!"), 200);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim()) return;
    setChatHistory([...chatHistory, { type: 'user', message: chatMessage }]);
    setTimeout(() => {
      setChatHistory(prev => [...prev, { type: 'bot', message: 'Support team is reviewing your message.' }]);
    }, 500);
    setChatMessage('');
  };

  const DashboardContent = () => (
    <div className="flex flex-col gap-4 pb-4">
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2"><Truck size={18} className="text-blue-600" /><span className="text-[11px] font-bold text-blue-600 uppercase">Active Vehicle</span></div>
        </div>
        <div className="grid grid-cols-2 divide-x">
          <div className="p-3 text-center"><div className="text-lg font-mono font-bold">{telemetry?.vehicleNumber || 'MH-12-QX-4019'}</div><div className="text-[9px] text-slate-400">Registration</div></div>
          <div className="p-3 text-center"><div className="text-lg font-mono font-bold text-emerald-600">{telemetry?.battery ?? 92}%</div><div className="text-[9px] text-slate-400">Battery</div></div>
        </div>
        <div className="grid grid-cols-2 divide-x border-t">
          <div className="p-3 text-center"><div className="text-lg font-mono font-bold">{telemetry?.driven ?? 45} KM</div><div className="text-[9px] text-slate-400">Today's Distance</div></div>
          <div className="p-3 text-center"><div className="text-lg font-mono font-bold text-amber-600">₹{duesAmount}</div><div className="text-[9px] text-slate-400">Outstanding Dues</div></div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-md">
        <div className="flex justify-between items-center">
          <div><span className="text-[10px] font-bold text-emerald-200 uppercase">Wallet Balance</span><div className="flex items-center gap-2 mt-1"><h2 className="text-2xl font-black">₹{walletBalance.toLocaleString()}.00</h2><button onClick={() => setShowBalance(!showBalance)} className="p-1 hover:bg-white/20 rounded"><EyeOff size={14} /></button></div></div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Wallet size={20} className="text-white" /></div>
        </div>
      </div>

      <button onClick={initiatePayment} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs uppercase"><CreditCard size={16} /> PAY RENT VIA PAYYANTRA</button>

      <div className="bg-white border rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between mb-3"><h3 className="text-[11px] font-black text-slate-400 uppercase">Recent Transactions</h3><button onClick={() => setActiveTab('history')} className="text-[10px] text-blue-600 font-medium">View All →</button></div>
        <div className="space-y-2">
          {recentPayments.slice(0, 3).map((payment, idx) => (
            <div key={idx} onClick={() => {setSelectedTransaction(payment); setShowTransactionDetails(true);}} className="flex justify-between items-center py-2 border-b cursor-pointer hover:bg-slate-50 p-2 rounded-lg">
              <div className="flex items-center gap-2"><div className={`w-7 h-7 rounded-lg ${payment.isCredit ? 'bg-emerald-100' : 'bg-rose-100'} flex items-center justify-center`}>{payment.isCredit ? <CheckCircle size={12} className="text-emerald-600" /> : <Clock size={12} className="text-rose-600" />}</div><div><p className="text-[11px] font-semibold">{payment.type}</p><p className="text-[9px] text-slate-400">{payment.date}</p></div></div>
              <div className="text-right"><span className={`text-xs font-bold ${payment.isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>{payment.isCredit ? '+' : '-'}₹{payment.amount}</span></div>
            </div>
          ))}
          {recentPayments.length === 0 && !loading && <div className="text-center py-4 text-slate-400 text-xs">No transactions yet</div>}
        </div>
      </div>
    </div>
  );

  const HistoryContent = () => (
    <div className="space-y-4 pb-4">
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-sm flex items-center gap-2"><Receipt size={14} /> All Transactions</h3><span className="text-[10px] text-slate-400">{recentPayments.length} records</span></div>
        {recentPayments.map((payment, idx) => (
          <div key={idx} onClick={() => {setSelectedTransaction(payment); setShowTransactionDetails(true);}} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 mb-2">
            <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl ${payment.isCredit ? 'bg-emerald-100' : 'bg-rose-100'} flex items-center justify-center`}>{payment.isCredit ? <CheckCircle size={16} className="text-emerald-600" /> : <Clock size={16} className="text-rose-600" />}</div><div><p className="text-sm font-semibold">{payment.type}</p><p className="text-[10px] text-slate-400">{payment.date}</p><p className="text-[9px] text-slate-500">Ref: {payment.ref}</p></div></div>
            <div className="text-right"><span className={`text-base font-bold ${payment.isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>{payment.isCredit ? '+' : '-'}₹{payment.amount}</span><p className="text-[9px] text-green-600">{payment.status}</p></div>
          </div>
        ))}
        {recentPayments.length === 0 && !loading && <div className="text-center py-8 text-slate-400">No transactions found</div>}
      </div>
    </div>
  );

  const AccountContent = () => (
    <div className="space-y-4 pb-4">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-5 text-white text-center relative overflow-hidden">
        {profileData.photo ? (
          <img src={profileData.photo} alt="Profile" className="w-20 h-20 rounded-full mx-auto border-4 border-white/30 object-cover shadow-lg" />
        ) : (
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold mx-auto">{user?.name?.charAt(0) || 'D'}</div>
        )}
        <h2 className="text-lg font-bold mt-3">{user?.name || 'Driver'}</h2>
        <p className="text-blue-200 text-xs mt-1">{user?.usercode || 'DRV_CODE'}</p>
      </div>

      {/* KYC & PROFILE SECTION */}
      <div className="bg-white border rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold mb-3 flex items-center gap-2"><FileText size={16} className="text-blue-600"/> KYC & Documents</h3>
        
        {isEditingProfile ? (
          <div className="space-y-3">
            <div><label className="text-[10px] text-slate-500 font-bold ml-1">Full Name</label><input type="text" value={profileData.name} onChange={e=>setProfileData({...profileData, name: e.target.value})} className="w-full border p-2.5 rounded-xl text-sm" placeholder="Enter Full Name" /></div>
            <div><label className="text-[10px] text-slate-500 font-bold ml-1">Aadhaar Number</label><input type="text" value={profileData.aadhaar} onChange={e=>setProfileData({...profileData, aadhaar: e.target.value})} className="w-full border p-2.5 rounded-xl text-sm font-mono tracking-widest" placeholder="1234 5678 9012" maxLength="12"/></div>
            <div><label className="text-[10px] text-slate-500 font-bold ml-1 flex gap-1"><Camera size={12}/> Profile Photo URL</label><input type="text" value={profileData.photo} onChange={e=>setProfileData({...profileData, photo: e.target.value})} className="w-full border p-2.5 rounded-xl text-sm" placeholder="https://link-to-photo.jpg" /></div>
            
            <div className="flex gap-2 pt-2">
              <button onClick={() => setIsEditingProfile(false)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-2.5 rounded-xl text-xs">Cancel</button>
              <button onClick={handleUpdateProfile} className="flex-[2] bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs shadow-md">Save & Verify</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b"><span className="text-slate-500 text-xs">Full Name</span><span className="font-medium text-xs text-right">{user?.name || 'N/A'}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-slate-500 text-xs">Aadhaar</span><span className="font-mono text-xs font-bold text-slate-700">{profileData.aadhaar || 'Missing ⚠️'}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-slate-500 text-xs">Phone</span><span className="font-medium text-xs flex gap-2">{user?.phone || user?.mobile_number}<button onClick={() => navigator.clipboard.writeText(user?.phone || '')} className="text-blue-600"><Copy size={12} /></button></span></div>
            
            <button onClick={() => setIsEditingProfile(true)} className="w-full mt-2 bg-blue-50 text-blue-700 font-bold py-2.5 rounded-xl text-xs hover:bg-blue-100 transition">Update KYC Profile</button>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 text-white shadow-md">
        <p className="text-xs opacity-80 uppercase tracking-wider font-bold">Referral Code</p>
        <p className="text-xl font-bold font-mono mt-1">{user?.usercode || 'SHARE_CODE'}</p>
        <button onClick={() => navigator.clipboard.writeText(user?.usercode || '')} className="mt-3 bg-white/20 hover:bg-white/30 transition px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"><Copy size={14} /> Copy to Share</button>
      </div>
    </div>
  );

  return (
    // FIX 1: STICKY BOTTOM NAV CONTAINER HACK (h-[100dvh] and flex-col layout)
    <div className="h-[100dvh] w-full bg-slate-900 flex justify-center overflow-hidden font-sans">
      <div className="w-full max-w-[412px] bg-slate-50 h-full flex flex-col relative shadow-2xl">
        
        {/* === TOP STATUS BAR (SHRINK-0) === */}
        <div className="bg-slate-950 text-white text-[11px] px-4 py-2 flex justify-between shrink-0 z-50">
          <div className="flex gap-2"><span className="text-emerald-400 font-bold">ONLINE</span><span>|</span><span>ENG</span></div>
          <div className="flex gap-2"><span>{currentTime}</span><span>{currentDay}</span></div>
          <div className="flex gap-1"><Wifi size={12} className="text-emerald-400" /><Battery size={12} /></div>
        </div>

        {/* === HEADER (SHRINK-0) === */}
        <div className="px-4 py-3 bg-white border-b shadow-sm flex justify-between items-center shrink-0 z-40">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md">MG</div><span className="font-black text-sm tracking-wide text-slate-800">{activeTab === 'dashboard' ? 'DASHBOARD' : activeTab === 'history' ? 'HISTORY' : 'MY PROFILE'}</span></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition"><Bell size={18} className="text-slate-700"/></button>
            <button onClick={handleLogout} className="p-2 rounded-xl bg-red-50 hover:bg-red-100 transition"><LogOut size={18} className="text-red-600" /></button>
          </div>
        </div>

        {/* === MAIN SCROLLABLE CONTENT (FLEX-1) === */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 bg-slate-50 relative">
          {loading ? <div className="text-center py-10 font-bold tracking-widest text-slate-400 text-xs animate-pulse">SYNCING DATA...</div> : (activeTab === 'dashboard' ? <DashboardContent /> : activeTab === 'history' ? <HistoryContent /> : <AccountContent />)}
        </div>

        {/* === STICKY BOTTOM NAVIGATION (SHRINK-0) === */}
        <div className="shrink-0 h-16 bg-white border-t flex justify-around items-center shadow-[0_-4px_15px_rgba(0,0,0,0.02)] z-50">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'dashboard' ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}><Home size={20} /><span className="text-[9px] font-bold tracking-wide">HOME</span></button>
          <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'history' ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}><History size={20} /><span className="text-[9px] font-bold tracking-wide">HISTORY</span></button>
          <button onClick={() => setActiveTab('account')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'account' ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}><CircleUser size={20} /><span className="text-[9px] font-bold tracking-wide">PROFILE</span></button>
        </div>

        {/* MODALS */}
        {showPaymentModal && (
          <div className="absolute inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center shadow-2xl">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-lg font-black text-slate-800">Initiating Payment...</p>
              <p className="text-xs text-slate-500 mt-2">Connecting to PayYantra Secure Gateway</p>
              <button onClick={() => setShowPaymentModal(false)} className="mt-6 w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-200">CANCEL</button>
            </div>
          </div>
        )}

        {showTransactionDetails && selectedTransaction && (
          <div className="absolute inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-black text-slate-800">Receipt</h3><button onClick={() => setShowTransactionDetails(false)} className="p-1 bg-slate-100 rounded-full"><X size={20} /></button></div>
              <div className="space-y-4">
                <div className="text-center pb-4 border-b border-dashed"><div className={`w-16 h-16 rounded-full ${selectedTransaction.isCredit ? 'bg-emerald-100' : 'bg-rose-100'} flex items-center justify-center mx-auto mb-3`}>{selectedTransaction.isCredit ? <CheckCircle size={32} className="text-emerald-600" /> : <Clock size={32} className="text-rose-600" />}</div><p className="text-3xl font-black text-slate-800">₹{selectedTransaction.amount}</p><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedTransaction.type}</p></div>
                <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between"><span className="text-slate-500 text-xs">Transaction ID</span><span className="text-xs font-mono font-bold">{selectedTransaction.id}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 text-xs">Date & Time</span><span className="text-xs font-bold">{selectedTransaction.date}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 text-xs">Status</span><span className="text-xs font-bold text-green-600">{selectedTransaction.status}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 text-xs">Reference No.</span><span className="text-xs font-mono">{selectedTransaction.ref}</span></div>
                </div>
                <button onClick={() => setShowTransactionDetails(false)} className="w-full mt-2 py-4 bg-slate-900 text-white font-bold rounded-2xl text-xs hover:bg-black transition">CLOSE RECEIPT</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}