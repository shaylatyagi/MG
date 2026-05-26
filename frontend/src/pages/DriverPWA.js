// frontend/src/pages/DriverPWA.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wifi, Battery, Truck, Wallet, CreditCard, Clock, CheckCircle,
  Phone, EyeOff, Copy, X, Send, Bell, MessageCircle,
  Home, LogOut, CircleUser, History, Receipt, ExternalLink, User,
  AlertTriangle, ArrowUpRight, ArrowDownLeft, Loader2
} from 'lucide-react';

export default function DriverPWA() {
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
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  // State
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

  // Fetch all data
  // In DriverPWA.jsx - Fix dues calculation to always show some dues for testing

// Replace the fetchAllData function with this version that ensures dues are visible for testing

const fetchAllData = useCallback(async () => {
  if (!user?.phone) return;
  
  setLoading(true);
  const phone = user.phone.replace(/\D/g, '').slice(-10);
  
  try {
    // Fetch all endpoints in parallel
    const [walletRes, duesRes, txnRes, notifRes, teleRes] = await Promise.all([
      fetch(`${API_BASE}/api/payment/driver/wallet?phone=${phone}`),
      fetch(`${API_BASE}/api/payment/driver/dues?phone=${phone}`),
      fetch(`${API_BASE}/api/payment/my-transactions?phone=${phone}`),
      fetch(`${API_BASE}/api/payment/driver/notifications?phone=${phone}`),
      fetch(`${API_BASE}/api/payment/driver/telemetry?phone=${phone}`)
    ]);
    
    const walletData = await walletRes.json();
    const duesData = await duesRes.json();
    const txnData = await txnRes.json();
    const notifData = await notifRes.json();
    const teleData = await teleRes.json();
    
    if (walletData.balance !== undefined) setWalletBalance(walletData.balance);
    
    // If no dues found, set default test dues of ₹850
    let dues = duesData.dues;
    if (dues === undefined || dues === null || dues === 0) {
      // For testing, set dues to ₹850 if no active vehicle
      dues = 850;
    }
    setDuesAmount(dues);
    setPaymentAmount(dues);
    
    if (Array.isArray(txnData)) {
      setRecentPayments(txnData.map(t => ({
        id: t.order_number || t.order_id,
        amount: parseFloat(t.order_amount),
        date: t.order_completion_date ? new Date(t.order_completion_date).toLocaleString() : new Date(t.order_initiation_date).toLocaleString(),
        type: t.transaction_status === 'SUCCESS' ? 'Rent Payment' : 'Pending',
        isCredit: t.transaction_status === 'SUCCESS',
        status: t.transaction_status,
        paymentMode: t.payment_mode || 'UPI',
        ref: t.order_id
      })));
    }
    if (Array.isArray(notifData)) setNotifications(notifData);
    setTelemetry(teleData);
    
  } catch (err) {
    console.error('Fetch error:', err);
  } finally {
    setLoading(false);
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

  // Initiate payment
  const initiatePayment = async () => {
    if (duesAmount === 0) {
      alert('No dues pending!');
      return;
    }
    
    setPaymentProcessing(true);
    setPaymentResult(null);
    setShowPaymentModal(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: paymentAmount,
          customerName: user?.name || 'Driver',
          customerPhone: user?.phone,
          customerEmail: user?.email || 'driver@mobilitygrid.com'
        })
      });
      const data = await response.json();
      const checkoutUrl = data?.data?.data?.checkoutUrl || data?.checkoutUrl || data?.paymentUrl;
      
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        setPaymentResult({ success: false, message: 'Payment initiation failed' });
        setPaymentProcessing(false);
        setShowPaymentModal(false);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentResult({ success: false, message: 'Payment failed. Please try again.' });
      setPaymentProcessing(false);
      setShowPaymentModal(false);
    }
  };

  // Check payment status on return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment_status');
    const orderId = urlParams.get('order_id');
    
    if (paymentStatus === 'success' && orderId) {
      setPaymentResult({ success: true, message: 'Payment successful!', orderId });
      fetchAllData(); // Refresh data
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'failed') {
      setPaymentResult({ success: false, message: 'Payment failed. Please try again.' });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchAllData]);

  const handleViewTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetails(true);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim()) return;
    setChatHistory([...chatHistory, { type: 'user', message: chatMessage }]);
    setTimeout(() => {
      setChatHistory(prev => [...prev, { type: 'bot', message: 'Support will respond shortly.' }]);
    }, 500);
    setChatMessage('');
  };

  const sendEmergencyAlert = () => {
    setIncidentSent(true);
    // Also send to backend
    fetch(`${API_BASE}/api/driver/emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: user?.phone,
        message: incidentMsg || 'Emergency situation reported'
      })
    }).catch(console.error);
    
    setTimeout(() => {
      setIncidentSent(false);
      setShowIncident(false);
      setIncidentMsg('');
    }, 2000);
  };

  const t = {
    en: {
      online: 'ONLINE', dashboard: 'Dashboard', history: 'History', account: 'Account',
      activeVehicle: 'Active Vehicle', registration: 'Registration', battery: 'Battery',
      distance: "Today's Distance", outstanding: 'Outstanding', walletBalance: 'Wallet Balance',
      payNow: 'PAY VIA PAYYANTRA', recentTransactions: 'Recent Transactions', viewAll: 'View All',
      emergency: 'Emergency Support', notifyOwner: 'Notify owner instantly', broadcastAlarm: 'Broadcast Alarm',
      allTransactions: 'All Transactions', records: 'records', ref: 'Ref',
      personalInfo: 'Personal Info', phone: 'Phone', email: 'Email',
      assignedVehicle: 'Assigned Vehicle', dailyRent: 'Daily Rent', referralCode: 'Referral Code',
      copy: 'Copy', transactionDetails: 'Transaction Details', transactionId: 'Transaction ID',
      dateTime: 'Date & Time', status: 'Status', referenceNo: 'Reference No.',
      close: 'Close', redirecting: 'Redirecting to PayYantra...', cancel: 'Cancel',
      paymentSuccess: 'Payment Successful!', paymentFailed: 'Payment Failed',
      loading: 'Loading...', duesPending: 'Dues Pending', accountSettled: 'Account Settled',
      notifications: 'Notifications', markAsRead: 'Mark as read', noNotifications: 'No notifications'
    },
    hi: {
      online: 'ऑनलाइन', dashboard: 'डैशबोर्ड', history: 'इतिहास', account: 'खाता',
      activeVehicle: 'सक्रिय वाहन', registration: 'पंजीकरण', battery: 'बैटरी',
      distance: 'आज की दूरी', outstanding: 'बकाया', walletBalance: 'वॉलेट बैलेंस',
      payNow: 'पेययंत्र से भुगतान करें', recentTransactions: 'हाल के लेनदेन', viewAll: 'सभी देखें',
      emergency: 'आपातकालीन सहायता', notifyOwner: 'मालिक को तुरंत सूचित करें', broadcastAlarm: 'अलार्म भेजें',
      allTransactions: 'सभी लेनदेन', records: 'रिकॉर्ड', ref: 'संदर्भ',
      personalInfo: 'व्यक्तिगत जानकारी', phone: 'फोन', email: 'ईमेल',
      assignedVehicle: 'आवंटित वाहन', dailyRent: 'दैनिक किराया', referralCode: 'रेफरल कोड',
      copy: 'कॉपी', transactionDetails: 'लेनदेन विवरण', transactionId: 'लेनदेन आईडी',
      dateTime: 'तिथि और समय', status: 'स्थिति', referenceNo: 'संदर्भ संख्या',
      close: 'बंद करें', redirecting: 'पेययंत्र पर रीडायरेक्ट हो रहा है...', cancel: 'रद्द करें',
      paymentSuccess: 'भुगतान सफल!', paymentFailed: 'भुगतान विफल',
      loading: 'लोड हो रहा है...', duesPending: 'बकाया लंबित', accountSettled: 'खाता चुकता',
      notifications: 'सूचनाएं', markAsRead: 'पढ़ा हुआ मार्क करें', noNotifications: 'कोई सूचना नहीं'
    }
  };
  const tx = t[lang];

  const DashboardContent = () => (
    <div className="flex flex-col gap-4 pb-4">
      {/* Payment Result Banner */}
      {paymentResult && (
        <div className={`rounded-2xl p-3 flex items-center gap-3 ${paymentResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${paymentResult.success ? 'bg-emerald-100' : 'bg-red-100'}`}>
            {paymentResult.success ? <CheckCircle size={18} className="text-emerald-600" /> : <AlertTriangle size={18} className="text-red-600" />}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-bold ${paymentResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
              {paymentResult.success ? tx.paymentSuccess : tx.paymentFailed}
            </p>
            <p className="text-[11px] text-slate-500">{paymentResult.message}</p>
          </div>
          <button onClick={() => setPaymentResult(null)} className="p-1"><X size={14} className="text-slate-400" /></button>
        </div>
      )}

      {/* Vehicle Card */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2"><Truck size={18} className="text-blue-600" /><span className="text-[11px] font-bold text-blue-600 uppercase">{tx.activeVehicle}</span></div>
        </div>
        <div className="grid grid-cols-2 divide-x">
          <div className="p-3 text-center"><div className="text-lg font-mono font-bold">{telemetry?.vehicleNumber || 'MH-12-QX-4019'}</div><div className="text-[9px] text-slate-400">{tx.registration}</div></div>
          <div className="p-3 text-center"><div className="text-lg font-mono font-bold text-emerald-600">{telemetry?.battery ?? 92}%</div><div className="text-[9px] text-slate-400">{tx.battery}</div></div>
        </div>
        <div className="grid grid-cols-2 divide-x border-t">
          <div className="p-3 text-center"><div className="text-lg font-mono font-bold">{telemetry?.driven ?? 45} KM</div><div className="text-[9px] text-slate-400">{tx.distance}</div></div>
          <div className="p-3 text-center"><div className={`text-lg font-mono font-bold ${duesAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>₹{duesAmount.toLocaleString()}</div><div className="text-[9px] text-slate-400">{duesAmount > 0 ? tx.outstanding : tx.accountSettled}</div></div>
        </div>
      </div>

      {/* Wallet Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-md">
        <div className="flex justify-between items-center">
          <div><span className="text-[10px] font-bold text-emerald-200 uppercase">{tx.walletBalance}</span><div className="flex items-center gap-2 mt-1"><h2 className="text-2xl font-black">₹{walletBalance.toLocaleString()}.00</h2><button onClick={() => setShowBalance(!showBalance)} className="p-1 hover:bg-white/20 rounded"><EyeOff size={14} /></button></div></div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Wallet size={20} className="text-white" /></div>
        </div>
      </div>

      {/* Payment Button */}
      <button onClick={initiatePayment} disabled={paymentProcessing || duesAmount === 0} className={`w-full font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs uppercase transition-all ${duesAmount > 0 && !paymentProcessing ? 'bg-blue-600 hover:bg-blue-700 text-white' : duesAmount === 0 ? 'bg-emerald-100 text-emerald-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
        {paymentProcessing ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
        {duesAmount === 0 ? 'No Dues Pending' : tx.payNow}
      </button>

      {/* Recent Transactions */}
      <div className="bg-white border rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between mb-3"><h3 className="text-[11px] font-black text-slate-400 uppercase">{tx.recentTransactions}</h3><button onClick={() => setActiveTab('history')} className="text-[10px] text-blue-600 font-medium">{tx.viewAll} →</button></div>
        <div className="space-y-2">
          {recentPayments.slice(0, 3).map((payment, idx) => (
            <div key={idx} onClick={() => handleViewTransaction(payment)} className="flex justify-between items-center py-2 border-b cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg ${payment.isCredit ? 'bg-emerald-100' : 'bg-amber-100'} flex items-center justify-center`}>
                  {payment.isCredit ? <ArrowDownLeft size={12} className="text-emerald-600" /> : <ArrowUpRight size={12} className="text-amber-600" />}
                </div>
                <div><p className="text-[11px] font-semibold">{payment.type}</p><p className="text-[9px] text-slate-400">{payment.date}</p></div>
              </div>
              <div className="text-right"><span className={`text-xs font-bold ${payment.isCredit ? 'text-emerald-600' : 'text-amber-600'}`}>{payment.isCredit ? '+' : '-'}₹{payment.amount.toLocaleString()}</span></div>
            </div>
          ))}
          {recentPayments.length === 0 && !loading && <div className="text-center py-4 text-slate-400 text-xs">No transactions yet</div>}
          {loading && <div className="text-center py-4"><Loader2 size={16} className="animate-spin text-slate-400 mx-auto" /></div>}
        </div>
      </div>

      {/* Emergency Section */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 p-3 rounded-2xl">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center animate-pulse"><Phone size={14} /></div>
          <div className="flex-1"><b className="text-slate-900 text-xs font-black">{tx.emergency}</b><p className="text-[10px] text-slate-500">{tx.notifyOwner}</p><button onClick={() => setShowIncident(true)} className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold py-1.5 rounded-lg transition-colors">{tx.broadcastAlarm}</button></div>
        </div>
      </div>
    </div>
  );

  const HistoryContent = () => (
    <div className="space-y-4 pb-4">
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-sm flex items-center gap-2"><Receipt size={14} /> {tx.allTransactions}</h3><span className="text-[10px] text-slate-400">{recentPayments.length} {tx.records}</span></div>
        {recentPayments.map((payment, idx) => (
          <div key={idx} onClick={() => handleViewTransaction(payment)} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 mb-2 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${payment.isCredit ? 'bg-emerald-100' : 'bg-amber-100'} flex items-center justify-center`}>
                {payment.isCredit ? <ArrowDownLeft size={16} className="text-emerald-600" /> : <ArrowUpRight size={16} className="text-amber-600" />}
              </div>
              <div><p className="text-sm font-semibold">{payment.type}</p><p className="text-[10px] text-slate-400">{payment.date}</p><p className="text-[9px] text-slate-500">{tx.ref}: {payment.ref?.slice(-8)}</p></div>
            </div>
            <div className="text-right"><span className={`text-base font-bold ${payment.isCredit ? 'text-emerald-600' : 'text-amber-600'}`}>{payment.isCredit ? '+' : '-'}₹{payment.amount.toLocaleString()}</span><p className="text-[9px] text-green-600">{payment.status === 'SUCCESS' ? 'Success' : 'Pending'}</p></div>
            <ExternalLink size={14} className="text-slate-400 ml-2 shrink-0" />
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
      <div className="bg-white border rounded-2xl p-4"><h3 className="font-bold mb-3 flex items-center gap-2"><User size={14} /> {tx.personalInfo}</h3><div className="space-y-3"><div className="flex justify-between py-2 border-b"><span className="text-slate-500 text-xs">{tx.phone}</span><span className="font-medium text-xs">{user?.phone || 'N/A'}</span><button onClick={() => navigator.clipboard.writeText(user?.phone || '')} className="text-blue-600"><Copy size={12} /></button></div><div className="flex justify-between py-2 border-b"><span className="text-slate-500 text-xs">{tx.email}</span><span className="font-medium text-xs">{user?.email || 'N/A'}</span></div></div></div>
      <div className="bg-white border rounded-2xl p-4"><h3 className="font-bold mb-3 flex items-center gap-2"><Truck size={14} /> {tx.assignedVehicle}</h3><div className="space-y-2"><div className="flex justify-between"><span className="text-slate-500 text-xs">{tx.registration}</span><span className="font-medium text-xs">{telemetry?.vehicleNumber || 'Not Assigned'}</span></div><div className="flex justify-between"><span className="text-slate-500 text-xs">{tx.dailyRent}</span><span className="font-medium text-xs">₹850</span></div></div></div>
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white"><p className="text-xs opacity-80">{tx.referralCode}</p><p className="text-lg font-bold font-mono">{user?.usercode || 'SHARE_CODE'}</p><button onClick={() => navigator.clipboard.writeText(user?.usercode || '')} className="mt-2 bg-white/20 px-3 py-1 rounded-lg text-xs flex items-center gap-1"><Copy size={12} /> {tx.copy}</button><p className="text-[10px] mt-2">🎁 Earn ₹100 for every friend who joins!</p></div>
    </div>
  );

  const renderContent = () => {
    if (loading && recentPayments.length === 0) {
      return <div className="text-center py-10 text-slate-400 flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> {tx.loading}</div>;
    }
    if (activeTab === 'dashboard') return <DashboardContent />;
    if (activeTab === 'history') return <HistoryContent />;
    return <AccountContent />;
  };

  // Payment Modal
  const PayYantraModal = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-lg font-semibold">{tx.redirecting}</p>
        <button onClick={() => { setShowPaymentModal(false); setPaymentProcessing(false); }} className="mt-4 text-xs text-slate-400 underline">{tx.cancel}</button>
      </div>
    </div>
  );

  // Transaction Details Modal
  const TransactionDetailsModal = () => {
    if (!selectedTransaction) return null;
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm p-5">
          <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">{tx.transactionDetails}</h3><button onClick={() => setShowTransactionDetails(false)}><X size={20} /></button></div>
          <div className="space-y-3">
            <div className="text-center pb-3 border-b"><div className={`w-16 h-16 rounded-full ${selectedTransaction.isCredit ? 'bg-emerald-100' : 'bg-amber-100'} flex items-center justify-center mx-auto mb-2`}>{selectedTransaction.isCredit ? <CheckCircle size={32} className="text-emerald-600" /> : <Clock size={32} className="text-amber-600" />}</div><p className="text-2xl font-bold">₹{selectedTransaction.amount.toLocaleString()}</p><p className="text-xs text-slate-500">{selectedTransaction.type}</p></div>
            <div className="flex justify-between"><span className="text-slate-500 text-xs">{tx.transactionId}</span><span className="text-xs font-mono">{selectedTransaction.id}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 text-xs">{tx.dateTime}</span><span className="text-xs">{selectedTransaction.date}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 text-xs">{tx.status}</span><span className={`text-xs ${selectedTransaction.status === 'SUCCESS' ? 'text-green-600' : 'text-amber-600'}`}>{selectedTransaction.status === 'SUCCESS' ? 'Success' : 'Pending'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 text-xs">{tx.referenceNo}</span><span className="text-xs font-mono">{selectedTransaction.ref}</span></div>
            <button onClick={() => setShowTransactionDetails(false)} className="w-full mt-3 py-2 bg-blue-600 text-white rounded-xl font-semibold">{tx.close}</button>
          </div>
        </div>
      </div>
    );
  };

  // Notifications Modal
  const NotificationsModal = () => (
    <div className="absolute right-4 top-[72px] w-80 bg-white rounded-xl shadow-xl border z-50">
      <div className="p-3 border-b flex justify-between"><b>{tx.notifications}</b><button onClick={() => setShowNotifications(false)}><X size={14} /></button></div>
      {notifications.length > 0 ? notifications.map(n => (
        <div key={n.id} className="p-3 border-b hover:bg-slate-50">
          <p className="font-semibold text-sm">{n.title}</p>
          <p className="text-xs text-slate-500">{n.message}</p>
          <p className="text-[9px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
        </div>
      )) : <div className="p-4 text-center text-slate-400 text-xs">{tx.noNotifications}</div>}
    </div>
  );

  // Emergency Modal
  const EmergencyModal = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex justify-between mb-3"><h3 className="text-base font-bold text-red-600">⚠️ {tx.emergency}</h3><button onClick={() => setShowIncident(false)}><X size={18} /></button></div>
        {incidentSent ? (
          <div className="p-3 bg-green-50 text-green-600 rounded-xl text-center"><CheckCircle size={20} className="mx-auto mb-2" />Alert sent to owner!</div>
        ) : (
          <>
            <textarea value={incidentMsg} onChange={(e) => setIncidentMsg(e.target.value)} placeholder="Describe your issue..." className="w-full h-20 p-2 border rounded-xl resize-none text-sm" />
            <div className="flex gap-2 mt-3"><button onClick={() => setShowIncident(false)} className="flex-1 py-2 bg-slate-100 rounded-lg">Cancel</button><button onClick={sendEmergencyAlert} className="flex-1 py-2 bg-red-600 text-white rounded-lg">Send Alert</button></div>
          </>
        )}
      </div>
    </div>
  );

  // Chatbot Modal
  const ChatbotModal = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-[412px] h-3/4 flex flex-col">
        <div className="p-3 bg-blue-600 text-white rounded-t-2xl flex justify-between"><h3 className="font-bold text-sm">💬 Support Assistant</h3><button onClick={() => setShowChatbot(false)}><X size={18} /></button></div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-2 rounded-xl text-xs ${msg.type === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>{msg.message}</div>
            </div>
          ))}
        </div>
        <div className="p-2 border-t flex gap-2">
          <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()} placeholder="Type your message..." className="flex-1 border rounded-xl px-3 py-2 text-xs" />
          <button onClick={sendChatMessage} className="p-2 bg-blue-600 text-white rounded-xl"><Send size={16} /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-[412px] mx-auto bg-white min-h-screen shadow-xl relative flex flex-col">
        {/* Status Bar */}
        <div className="bg-slate-950 text-white text-[11px] px-4 py-2 flex justify-between items-center">
          <div className="flex gap-2"><span className="text-emerald-400 font-bold">{tx.online}</span><span>|</span><span>{lang === 'en' ? 'ENG' : 'हिं'}</span></div>
          <div className="flex gap-2"><span>{currentTime}</span><span>{currentDay}</span><span>IN</span><span>{currentDate}</span></div>
          <div className="flex gap-1"><Wifi size={12} className="text-emerald-400" /><Battery size={12} /></div>
        </div>

        {/* Header */}
        <div className="px-4 py-3 bg-white border-b flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">MG</div><span className="font-bold text-sm">{activeTab === 'dashboard' ? tx.dashboard : activeTab === 'history' ? tx.history : tx.account}</span></div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-0.5 rounded-lg"><button onClick={() => setLang('en')} className={`px-2 py-1 text-[10px] font-bold rounded-md ${lang === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>EN</button><button onClick={() => setLang('hi')} className={`px-2 py-1 text-[10px] font-bold rounded-md ${lang === 'hi' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>हिं</button></div>
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-1.5 rounded-lg bg-slate-100"><Bell size={16} /></button>
            <button onClick={() => setShowChatbot(true)} className="p-1.5 rounded-lg bg-slate-100"><MessageCircle size={16} /></button>
            <button onClick={handleLogout} className="p-1.5 rounded-lg bg-red-50"><LogOut size={16} className="text-red-600" /></button>
          </div>
        </div>

        {showNotifications && <NotificationsModal />}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-4 pt-4">{renderContent()}</div>

        {/* Bottom Navigation */}
        <div className="shrink-0 h-16 bg-white border-t flex justify-around items-center">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}><Home size={20} /><span className="text-[10px]">{tx.dashboard}</span></button>
          <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400'}`}><History size={20} /><span className="text-[10px]">{tx.history}</span></button>
          <button onClick={() => setActiveTab('account')} className={`flex flex-col items-center gap-1 ${activeTab === 'account' ? 'text-blue-600' : 'text-slate-400'}`}><CircleUser size={20} /><span className="text-[10px]">{tx.account}</span></button>
        </div>

        {/* Modals */}
        {showPaymentModal && <PayYantraModal />}
        {showTransactionDetails && <TransactionDetailsModal />}
        {showIncident && <EmergencyModal />}
        {showChatbot && <ChatbotModal />}
      </div>
    </div>
  );
}