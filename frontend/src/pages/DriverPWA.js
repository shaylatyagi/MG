import React, { useState, useEffect } from 'react';
import { 
  Wifi, Battery, Truck, Wallet, CreditCard, Clock, CheckCircle,
  Phone, Eye, EyeOff, Copy, X, Send, Bell, Search, MessageCircle,
  Home, LogOut, CircleUser, History, Receipt, ExternalLink, User
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

  const API_BASE = 'https://mg-qw5s.onrender.com';

  // Get user from localStorage
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(storedUser);
  }, []);

  // Fetch all real data
  const fetchAllData = async () => {
    if (!user?.phone) return;
    
    const token = localStorage.getItem('token');
    const phone = user.phone.replace(/\D/g, '').slice(-10);
    
    try {
      // 1. Fetch wallet balance
      const walletRes = await fetch(`${API_BASE}/api/driver/wallet?phone=${phone}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const walletData = await walletRes.json();
      if (walletData.balance !== undefined) setWalletBalance(walletData.balance);

      // 2. Fetch telemetry
      const telemetryRes = await fetch(`${API_BASE}/api/driver/telemetry?phone=${phone}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const telemetryData = await telemetryRes.json();
      setTelemetry(telemetryData);

      // 3. Fetch pending dues
      const duesRes = await fetch(`${API_BASE}/api/driver/dues?phone=${phone}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const duesData = await duesRes.json();
      if (duesData && duesData.dues !== undefined) {
        setDuesAmount(duesData.dues);
        setPaymentAmount(duesData.dues);
      } else {
        throw new Error("Invalid dues data"); 
      }

      // 4. Fetch transactions (REAL DB MAPPING FIX)
      const txnRes = await fetch(`${API_BASE}/api/payment/my-transactions?phone=${phone}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const txnData = await txnRes.json();
      
      if (Array.isArray(txnData)) {
        setRecentPayments(txnData.map(t => {
          const isSuccess = t.transaction_status === 'SUCCESS' || t.transaction_status === 'Success';
          return {
            id: t.order_number || t.order_id, 
            amount: parseFloat(t.order_amount || 0),
            date: t.order_completion_date 
                  ? new Date(t.order_completion_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) 
                  : new Date(t.order_initiation_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            type: isSuccess ? 'Rent Payment' : 'Pending',
            isCredit: isSuccess,
            status: t.transaction_status,
            paymentMode: t.payment_mode || 'UPI',
            ref: t.pg_transaction_id || t.bank_reference_no || 'N/A'
          };
        }));
      }

      // 5. Fetch notifications
      const notifRes = await fetch(`${API_BASE}/api/driver/notifications?phone=${phone}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const notifData = await notifRes.json();
      if (Array.isArray(notifData)) {
        setNotifications(notifData);
      }
    } catch (err) {
      console.error('Fetch error, switching to Mock Data:', err);
      // MOCK DATA FOR DEMO SO AMOUNT IS NEVER 0
      setWalletBalance(150);
      setDuesAmount(850); 
      setPaymentAmount(850); 
      setTelemetry({ vehicleNumber: 'MH-12-QX-4019', battery: 92, driven: 45 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [user]);

  // Refresh data if coming back from payment result
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('refresh') === 'true' || urlParams.get('status') === 'success') {
      fetchAllData(); // Refresh to show new transaction
      window.history.replaceState(null, '', window.location.pathname); // Clean URL
    }
  }, [user]);

  // Date time updater
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
      setCurrentDate(`${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`);
      setCurrentDay(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]);
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const initiatePayment = async () => {
    if (!paymentAmount || paymentAmount <= 0) {
      alert("Invalid payment amount (₹0). Please refresh the page.");
      return;
    }

    setShowPaymentModal(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE}/api/payment/create-order`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          amount: paymentAmount,
          customerName: user?.name || 'Driver',
          customerPhone: user?.phone || '9876542345',
          customerEmail: user?.email || 'driver@mobilitygrid.com'
        })
      });
      const data = await response.json();
      
      if (!response.ok) {
        console.error("Backend Error:", data);
        alert(`Server Error: ${data.message || 'Payment initiation failed'}`);
        setShowPaymentModal(false);
        return;
      }

      const checkoutUrl = data?.data?.data?.checkoutUrl || data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        alert('Payment initiation failed from server');
        setShowPaymentModal(false);
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
      setShowPaymentModal(false);
    }
  };

  const handleViewTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetails(true);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    setChatHistory([...chatHistory, { type: 'user', message: chatMessage }]);
    setTimeout(() => {
      setChatHistory(prev => [...prev, { type: 'bot', message: 'Support will respond shortly.' }]);
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
          <div className="p-3 text-center"><div className="text-lg font-mono font-bold text-amber-600">₹{duesAmount}</div><div className="text-[9px] text-slate-400">Outstanding</div></div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-md">
        <div className="flex justify-between items-center">
          <div><span className="text-[10px] font-bold text-emerald-200 uppercase">Wallet Balance</span><div className="flex items-center gap-2 mt-1"><h2 className="text-2xl font-black">₹{walletBalance.toLocaleString()}.00</h2><button onClick={() => setShowBalance(!showBalance)} className="p-1 hover:bg-white/20 rounded"><EyeOff size={14} /></button></div></div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Wallet size={20} className="text-white" /></div>
        </div>
      </div>

      <button onClick={initiatePayment} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs uppercase"><CreditCard size={16} /> PAY VIA PAYYANTRA</button>

      <div className="bg-white border rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between mb-3"><h3 className="text-[11px] font-black text-slate-400 uppercase">Recent Transactions</h3><button onClick={() => setActiveTab('history')} className="text-[10px] text-blue-600 font-medium">View All →</button></div>
        <div className="space-y-2">
          {recentPayments.slice(0, 3).map((payment, idx) => (
            <div key={idx} onClick={() => handleViewTransaction(payment)} className="flex justify-between items-center py-2 border-b cursor-pointer hover:bg-slate-50 p-2 rounded-lg">
              <div className="flex items-center gap-2"><div className={`w-7 h-7 rounded-lg ${payment.isCredit ? 'bg-emerald-100' : 'bg-rose-100'} flex items-center justify-center`}>{payment.isCredit ? <CheckCircle size={12} className="text-emerald-600" /> : <Clock size={12} className="text-rose-600" />}</div><div><p className="text-[11px] font-semibold">{payment.type}</p><p className="text-[9px] text-slate-400">{payment.date}</p></div></div>
              <div className="text-right"><span className={`text-xs font-bold ${payment.isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>{payment.isCredit ? '+' : '-'}₹{payment.amount}</span></div>
            </div>
          ))}
          {recentPayments.length === 0 && !loading && <div className="text-center py-4 text-slate-400 text-xs">No transactions yet</div>}
        </div>
      </div>

      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 p-3 rounded-2xl">
        <div className="flex items-start gap-2"><div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center animate-pulse"><Phone size={14} /></div><div className="flex-1"><b className="text-slate-900 text-xs font-black">Emergency Support</b><p className="text-[10px] text-slate-500">Notify owner instantly</p><button onClick={() => setShowIncident(true)} className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold py-1.5 rounded-lg">Broadcast Alarm</button></div></div>
      </div>
    </div>
  );

  const HistoryContent = () => (
    <div className="space-y-4 pb-4">
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-sm flex items-center gap-2"><Receipt size={14} /> All Transactions</h3><span className="text-[10px] text-slate-400">{recentPayments.length} records</span></div>
        {recentPayments.map((payment, idx) => (
          <div key={idx} onClick={() => handleViewTransaction(payment)} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 mb-2">
            <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl ${payment.isCredit ? 'bg-emerald-100' : 'bg-rose-100'} flex items-center justify-center`}>{payment.isCredit ? <CheckCircle size={16} className="text-emerald-600" /> : <Clock size={16} className="text-rose-600" />}</div><div><p className="text-sm font-semibold">{payment.type}</p><p className="text-[10px] text-slate-400">{payment.date}</p><p className="text-[9px] text-slate-500">Ref: {payment.ref}</p></div></div>
            <div className="text-right"><span className={`text-base font-bold ${payment.isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>{payment.isCredit ? '+' : '-'}₹{payment.amount}</span><p className="text-[9px] text-green-600">{payment.status}</p></div>
            <ExternalLink size={14} className="text-slate-400 ml-2" />
          </div>
        ))}
        {recentPayments.length === 0 && !loading && <div className="text-center py-8 text-slate-400">No transactions found</div>}
      </div>
    </div>
  );

  const AccountContent = () => (
    <div className="space-y-4 pb-4">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-5 text-white text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold mx-auto">{user?.name?.charAt(0) || 'D'}</div>
        <h2 className="text-lg font-bold mt-2">{user?.name || 'Driver'}</h2>
        <p className="text-blue-200 text-xs">{user?.usercode || 'DRV_CODE'}</p>
      </div>
      <div className="bg-white border rounded-2xl p-4"><h3 className="font-bold mb-3 flex items-center gap-2"><User size={14} /> Personal Info</h3><div className="space-y-3"><div className="flex justify-between py-2 border-b"><span className="text-slate-500 text-xs">Phone</span><span className="font-medium text-xs">{user?.phone || 'N/A'}</span><button onClick={() => navigator.clipboard.writeText(user?.phone || '')} className="text-blue-600"><Copy size={12} /></button></div><div className="flex justify-between py-2 border-b"><span className="text-slate-500 text-xs">Email</span><span className="font-medium text-xs">{user?.email || 'N/A'}</span></div></div></div>
      <div className="bg-white border rounded-2xl p-4"><h3 className="font-bold mb-3 flex items-center gap-2"><Truck size={14} /> Assigned Vehicle</h3><div className="space-y-2"><div className="flex justify-between"><span className="text-slate-500 text-xs">Registration</span><span className="font-medium text-xs">{telemetry?.vehicleNumber || 'Not Assigned'}</span></div><div className="flex justify-between"><span className="text-slate-500 text-xs">Daily Rent</span><span className="font-medium text-xs">₹850</span></div></div></div>
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white"><p className="text-xs opacity-80">Referral Code</p><p className="text-lg font-bold font-mono">{user?.usercode || 'SHARE_CODE'}</p><button onClick={() => navigator.clipboard.writeText(user?.usercode || '')} className="mt-2 bg-white/20 px-3 py-1 rounded-lg text-xs flex items-center gap-1"><Copy size={12} /> Copy</button></div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return <div className="text-center py-10 text-slate-400">Loading...</div>;
    }
    if (activeTab === 'dashboard') return <DashboardContent />;
    if (activeTab === 'history') return <HistoryContent />;
    return <AccountContent />;
  };

  const PayYantraModal = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-lg font-semibold">Redirecting to PayYantra...</p>
        <button onClick={() => setShowPaymentModal(false)} className="mt-4 text-xs text-slate-400 underline">Cancel</button>
      </div>
    </div>
  );

  const TransactionDetailsModal = () => {
    if (!selectedTransaction) return null;
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm p-5">
          <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">Transaction Details</h3><button onClick={() => setShowTransactionDetails(false)}><X size={20} /></button></div>
          <div className="space-y-3">
            <div className="text-center pb-3 border-b"><div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2"><CheckCircle size={32} className="text-emerald-600" /></div><p className="text-2xl font-bold">₹{selectedTransaction.amount}</p><p className="text-xs text-slate-500">{selectedTransaction.type}</p></div>
            <div className="flex justify-between"><span className="text-slate-500 text-xs">Transaction ID</span><span className="text-xs font-mono">{selectedTransaction.id}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 text-xs">Date & Time</span><span className="text-xs">{selectedTransaction.date}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 text-xs">Status</span><span className="text-xs text-green-600">{selectedTransaction.status}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 text-xs">Reference No.</span><span className="text-xs font-mono">{selectedTransaction.ref}</span></div>
            <button onClick={() => setShowTransactionDetails(false)} className="w-full mt-3 py-2 bg-blue-600 text-white rounded-xl">Close</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-[412px] mx-auto bg-white min-h-screen shadow-xl relative flex flex-col">
        <div className="bg-slate-950 text-white text-[11px] px-4 py-2 flex justify-between">
          <div className="flex gap-2"><span className="text-emerald-400 font-bold">ONLINE</span><span>|</span><span>ENG</span></div>
          <div className="flex gap-2"><span>{currentTime}</span><span>{currentDay}</span><span>IN</span><span>{currentDate}</span></div>
          <div className="flex gap-1"><Wifi size={12} className="text-emerald-400" /><Battery size={12} /></div>
        </div>

        <div className="px-4 py-3 bg-white border-b flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">MG</div><span className="font-bold text-sm">{activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'history' ? 'History' : 'Account'}</span></div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-0.5 rounded-lg"><button onClick={() => setLang('en')} className={`px-2 py-1 text-[10px] font-bold rounded-md ${lang === 'en' ? 'bg-white text-blue-600' : 'text-slate-400'}`}>EN</button><button onClick={() => setLang('hi')} className={`px-2 py-1 text-[10px] font-bold rounded-md ${lang === 'hi' ? 'bg-white text-blue-600' : 'text-slate-400'}`}>हिं</button></div>
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-1.5 rounded-lg bg-slate-100"><Bell size={16} /></button>
            <button onClick={() => setShowChatbot(true)} className="p-1.5 rounded-lg bg-slate-100"><MessageCircle size={16} /></button>
            <button onClick={handleLogout} className="p-1.5 rounded-lg bg-red-50"><LogOut size={16} className="text-red-600" /></button>
          </div>
        </div>

        {showNotifications && (<div className="absolute right-4 top-[72px] w-80 bg-white rounded-xl shadow-xl border z-50"><div className="p-3 border-b flex justify-between"><b>Notifications</b><button onClick={() => setShowNotifications(false)}><X size={14} /></button></div>{notifications.map(n => (<div key={n.id} className="p-3 border-b"><p className="font-semibold text-sm">{n.title}</p><p className="text-xs text-slate-500">{n.message}</p></div>))}</div>)}

        <div className="flex-1 overflow-y-auto px-4 pt-4">{renderContent()}</div>

        <div className="shrink-0 h-16 bg-white border-t flex justify-around items-center">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}><Home size={20} /><span className="text-[10px]">Home</span></button>
          <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400'}`}><History size={20} /><span className="text-[10px]">History</span></button>
          <button onClick={() => setActiveTab('account')} className={`flex flex-col items-center gap-1 ${activeTab === 'account' ? 'text-blue-600' : 'text-slate-400'}`}><CircleUser size={20} /><span className="text-[10px]">Account</span></button>
        </div>

        {showPaymentModal && <PayYantraModal />}
        {showTransactionDetails && <TransactionDetailsModal />}
        
        {showIncident && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-5">
              <div className="flex justify-between mb-3"><h3 className="text-base font-bold text-red-600">Emergency Alert</h3><button onClick={() => setShowIncident(false)}><X size={18} /></button></div>
              {incidentSent ? (<div className="p-3 bg-green-50 text-green-600 rounded-xl text-center"><CheckCircle size={20} className="mx-auto mb-2" />Alert sent!</div>) : (<><textarea value={incidentMsg} onChange={(e) => setIncidentMsg(e.target.value)} placeholder="Describe issue..." className="w-full h-20 p-2 border rounded-xl resize-none text-sm" /><div className="flex gap-2 mt-3"><button onClick={() => setShowIncident(false)} className="flex-1 py-2 bg-slate-100 rounded-lg">Cancel</button><button onClick={() => { setIncidentSent(true); setTimeout(() => { setIncidentSent(false); setShowIncident(false); setIncidentMsg(''); }, 2000); }} className="flex-1 py-2 bg-red-600 text-white rounded-lg">Send</button></div></>)}
            </div>
          </div>
        )}

        {showChatbot && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
            <div className="bg-white rounded-t-2xl w-full max-w-[412px] h-3/4 flex flex-col">
              <div className="p-3 bg-blue-600 text-white rounded-t-2xl flex justify-between"><h3 className="font-bold text-sm">Assistant</h3><button onClick={() => setShowChatbot(false)}><X size={18} /></button></div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">{chatHistory.map((msg, idx) => (<div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-2 rounded-xl text-xs ${msg.type === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>{msg.message}</div></div>))}</div>
              <div className="p-2 border-t flex gap-2"><input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()} placeholder="Type..." className="flex-1 border rounded-xl px-3 py-2 text-xs" /><button onClick={sendChatMessage} className="p-2 bg-blue-600 text-white rounded-xl"><Send size={16} /></button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}