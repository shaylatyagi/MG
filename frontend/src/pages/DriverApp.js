// frontend/src/pages/DriverApp.jsx
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Wallet, User, FileCheck2, LogOut, 
  CreditCard, Clock, CheckCircle, AlertCircle, Truck,
  Phone, Bell, Search, MessageCircle, X, Send, 
  Wifi, Battery, Shield, TrendingUp, Eye, EyeOff, Copy, Star
} from 'lucide-react';
import DriverDashboardTab from './driver/DriverDashboardTab';
import DriverWalletTab from './driver/DriverWalletTab';
import DriverProfileTab from './driver/DriverProfileTab';
import DriverKYCTab from './driver/DriverKYCTab';

const W = 390;

export default function DriverApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lang, setLang] = useState('en');
  const [showIncident, setShowIncident] = useState(false);
  const [incidentMsg, setIncidentMsg] = useState('');
  const [incidentSent, setIncidentSent] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { type: 'bot', message: 'Hello! I\'m your MobilityGrid assistant. How can I help you today?' }
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

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

  const [notifications, setNotifications] = useState([
    { id: 1, title: "System Alert", message: "High Battery Degradation Alert", time: "11:30 AM", read: false, icon: "⚡" },
    { id: 2, title: "Payment Reminder", message: "Rent due tomorrow", time: "Yesterday", read: true, icon: "💰" }
  ]);

  // Get current page title based on active tab
  const getPageTitle = () => {
    const titles = {
      dashboard: 'Driver Dashboard',
      wallet: 'My Wallet',
      profile: 'My Profile',
      kyc: 'KYC Hub'
    };
    return titles[activeTab] || 'Driver Terminal';
  };

  const t = {
    en: {
      dashboard: 'Dashboard',
      wallet: 'Wallet',
      profile: 'Profile',
      kyc: 'KYC Hub',
      incident: 'Report Incident',
      incidentPlaceholder: 'Describe the incident...',
      send: 'Send Alert',
      cancel: 'Cancel',
      incidentSent: 'Alert sent to owner successfully',
    },
    hi: {
      dashboard: 'डैशबोर्ड',
      wallet: 'वॉलेट',
      profile: 'प्रोफाइल',
      kyc: 'KYC',
      incident: 'घटना रिपोर्ट करें',
      incidentPlaceholder: 'घटना का विवरण दें...',
      send: 'अलर्ट भेजें',
      cancel: 'रद्द करें',
      incidentSent: 'अलर्ट मालिक को भेज दिया गया',
    }
  };

  const tx = t[lang];

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const handleIncidentSend = () => {
    if (!incidentMsg.trim()) return;
    setIncidentSent(true);
    setIncidentMsg('');
    setTimeout(() => {
      setIncidentSent(false);
      setShowIncident(false);
    }, 3000);
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim()) return;
    setChatHistory([...chatHistory, { type: 'user', message: chatMessage }]);
    setTimeout(() => {
      setChatHistory(prev => [...prev, { type: 'bot', message: 'Thank you for your message. Our support team will get back to you shortly.' }]);
    }, 500);
    setChatMessage('');
  };

  const markNotificationRead = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <div style={{ maxWidth: `${W}px`, margin: '0 auto', minHeight: '100vh', backgroundColor: '#FAF7F2', fontFamily: 'Inter, sans-serif', position: 'relative', paddingBottom: '70px' }}>

      {/* Status Bar */}
      <div style={{ backgroundColor: '#1a1a2e', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#fff' }}>
        <span>{currentTime}</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <Wifi size={12} color="#4ade80" />
          <Battery size={12} color="#fff" />
        </div>
      </div>

      {/* Top Bar with Dynamic Title & Logo */}
      <div style={{ backgroundColor: '#7D5235', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', backgroundColor: '#C49A6C', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800', color: 'white' }}>M</div>
          <div>
            <div style={{ fontSize: '10px', color: '#C49A6C', fontWeight: '500' }}>Driver Terminal</div>
            <div style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>{getPageTitle()}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '16px', border: 'none', fontSize: '10px', width: '80px', display: 'none' }}
            />
            <button style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              <Search size={14} color="white" />
            </button>
          </div>
          
          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px', border: 'none', cursor: 'pointer', position: 'relative' }}
            >
              <Bell size={14} color="white" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%' }}></span>
              )}
            </button>
            {showNotifications && (
              <div style={{ position: 'absolute', right: 0, top: '40px', width: '280px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 200 }}>
                <div style={{ padding: '12px', borderBottom: '1px solid #E8E0D5', display: 'flex', justifyContent: 'space-between' }}>
                  <b>Notifications</b>
                  <button onClick={() => setShowNotifications(false)}><X size={14} /></button>
                </div>
                {notifications.map(notif => (
                  <div key={notif.id} onClick={() => markNotificationRead(notif.id)} style={{ padding: '10px 12px', borderBottom: '1px solid #E8E0D5', cursor: 'pointer', backgroundColor: notif.read ? 'white' : '#FEF3C7' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{notif.icon}</span>
                      <div><b style={{ fontSize: '12px' }}>{notif.title}</b><p style={{ fontSize: '10px', color: '#666', margin: '2px 0 0' }}>{notif.message}</p><span style={{ fontSize: '9px', color: '#999' }}>{notif.time}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Chatbot */}
          <button 
            onClick={() => setShowChatbot(true)}
            style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            <MessageCircle size={14} color="white" />
          </button>
          
          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
          >
            {lang === 'en' ? 'हिं' : 'EN'}
          </button>
          
          {/* SOS Button */}
          <button
            onClick={() => setShowIncident(true)}
            style={{ backgroundColor: '#DC2626', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
          >
            🚨 SOS
          </button>
          
          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', padding: '6px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ padding: '0' }}>
        {activeTab === 'dashboard' && <DriverDashboardTab lang={lang} user={user} />}
        {activeTab === 'wallet' && <DriverWalletTab lang={lang} user={user} />}
        {activeTab === 'profile' && <DriverProfileTab lang={lang} user={user} />}
        {activeTab === 'kyc' && <DriverKYCTab lang={lang} user={user} />}
      </div>

      {/* Bottom Navigation */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: `${W}px`, backgroundColor: 'white', borderTop: '1px solid #E8E0D5', display: 'flex', zIndex: 100 }}>
        {[
          { key: 'dashboard', icon: <LayoutDashboard size={18} />, label: tx.dashboard },
          { key: 'wallet', icon: <Wallet size={18} />, label: tx.wallet },
          { key: 'profile', icon: <User size={18} />, label: tx.profile },
          { key: 'kyc', icon: <FileCheck2 size={18} />, label: tx.kyc },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            style={{
              flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer',
              backgroundColor: activeTab === item.key ? '#F3EDE5' : 'white',
              color: activeTab === item.key ? '#8B5E3C' : '#9CA3AF',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
            }}
          >
            {item.icon}
            <span style={{ fontSize: '10px', fontWeight: activeTab === item.key ? '700' : '400' }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Incident Modal */}
      {showIncident && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ backgroundColor: 'white', width: '100%', borderRadius: '20px 20px 0 0', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#DC2626', marginBottom: '8px' }}>🚨 {tx.incident}</h3>
            {incidentSent ? (
              <p style={{ color: '#16A34A', fontWeight: '600', textAlign: 'center', padding: '16px' }}>✓ {tx.incidentSent}</p>
            ) : (
              <>
                <textarea
                  value={incidentMsg}
                  onChange={(e) => setIncidentMsg(e.target.value)}
                  placeholder={tx.incidentPlaceholder}
                  style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '14px', resize: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }}
                />
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button onClick={() => setShowIncident(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: '#F3EDE5', color: '#8B5E3C', border: 'none', fontWeight: '600', fontSize: '14px' }}>{tx.cancel}</button>
                  <button onClick={handleIncidentSend} style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: '#DC2626', color: 'white', border: 'none', fontWeight: '600', fontSize: '14px' }}>{tx.send}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Chatbot Modal */}
      {showChatbot && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ backgroundColor: 'white', width: '100%', borderRadius: '20px 20px 0 0', height: '70%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', backgroundColor: '#7D5235', color: 'white', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between' }}>
              <b>MobilityGrid Assistant</b>
              <button onClick={() => setShowChatbot(false)}><X size={18} color="white" /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {chatHistory.map((msg, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: '16px', backgroundColor: msg.type === 'user' ? '#7D5235' : '#F3EDE5', color: msg.type === 'user' ? 'white' : '#333', fontSize: '13px' }}>
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px', borderTop: '1px solid #E8E0D5', display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type your message..." 
                style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #E8E0D5', outline: 'none' }} 
              />
              <button onClick={sendChatMessage} style={{ padding: '10px', backgroundColor: '#7D5235', borderRadius: '20px', border: 'none', cursor: 'pointer' }}>
                <Send size={16} color="white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}