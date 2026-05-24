import { useState } from 'react';
import OwnerDashboardTab from './owner/OwnerDashboardTab';
import OwnerHandoverTab from './owner/OwnerHandoverTab';
import OwnerDriversTab from './owner/OwnerDriversTab';
import OwnerProfileTab from './owner/OwnerProfileTab';

export default function OwnerApp() {
  const [tab, setTab] = useState('dashboard');
  const [lang, setLang] = useState('en');
  const [showChat, setShowChat] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { from: 'system', msg: 'Incident ticket #TKT-8902 auto-instantiated based on driver Amit Sharma telemetry alert exception context.' },
    { from: 'owner', msg: 'Hi Core Support Node, our vehicle driver on plate MH-14-EU-8821 reports immediate thermal throttling and charge loss flags. Please audit gateway calibration data.' },
  ]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const handleChatSend = () => {
    if (!chatMsg.trim()) return;
    setChatHistory(prev => [...prev, { from: 'owner', msg: chatMsg }]);
    setChatMsg('');
    setTimeout(() => {
      setChatHistory(prev => [...prev, { from: 'system', msg: 'Support team has received your message. ID: #TKT-' + Math.floor(Math.random() * 9000 + 1000) }]);
    }, 1000);
  };

  const tabs = [
    { key: 'dashboard', icon: '🏠', label: lang === 'en' ? 'Dashboard' : 'डैशबोर्ड' },
    { key: 'handover', icon: '🚗', label: lang === 'en' ? 'Handover' : 'हैंडओवर' },
    { key: 'drivers', icon: '👥', label: lang === 'en' ? 'Drivers' : 'ड्राइवर' },
    { key: 'profile', icon: '👤', label: lang === 'en' ? 'Profile' : 'प्रोफाइल' },
  ];

  return (
    <div style={{ maxWidth: '390px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#FAF7F2', fontFamily: 'Inter, sans-serif', position: 'relative', paddingBottom: '70px' }}>

      {/* Top Bar */}
      <div style={{ backgroundColor: '#7D5235', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', backgroundColor: '#C49A6C', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: 'white' }}>M</div>
          <div>
            <p style={{ color: 'white', fontWeight: '700', fontSize: '13px', margin: 0 }}>MobilityGrid Owner Portal</p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', margin: 0 }}>{user.name || 'EcoFleet Corp'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setLang(lang === 'en' ? 'hi' : 'en')} style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
            {lang === 'en' ? 'हिं' : 'EN'}
          </button>
          <button style={{ backgroundColor: 'transparent', color: 'white', border: 'none', fontSize: '18px', cursor: 'pointer' }}>🔔</button>
          <button onClick={handleLogout} style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', border: 'none', cursor: 'pointer' }}>⏻</button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {tab === 'dashboard' && <OwnerDashboardTab lang={lang} user={user} onOpenChat={() => setShowChat(true)} />}
        {tab === 'handover' && <OwnerHandoverTab lang={lang} />}
        {tab === 'drivers' && <OwnerDriversTab lang={lang} />}
        {tab === 'profile' && <OwnerProfileTab lang={lang} user={user} />}
      </div>

      {/* Bottom Navigation */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '390px', backgroundColor: 'white', borderTop: '1px solid #E8E0D5', display: 'flex', zIndex: 100 }}>
        {tabs.map((item) => (
          <button key={item.key} onClick={() => setTab(item.key)} style={{ flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer', backgroundColor: tab === item.key ? '#F3EDE5' : 'white', color: tab === item.key ? '#8B5E3C' : '#9CA3AF', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: tab === item.key ? '700' : '400' }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Live Chat Modal */}
      {showChat && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ backgroundColor: 'white', width: '100%', borderRadius: '20px 20px 0 0', padding: '20px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>System Admin Core Support</p>
                <p style={{ fontSize: '11px', color: '#16A34A', margin: 0 }}>● Online • Active Response Node</p>
              </div>
              <button onClick={() => setShowChat(false)} style={{ fontSize: '20px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#6B6B6B' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '50vh' }}>
              {chatHistory.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: c.from === 'owner' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: c.from === 'owner' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', backgroundColor: c.from === 'owner' ? '#8B5E3C' : '#F3EDE5', color: c.from === 'owner' ? 'white' : '#1A1A1A', fontSize: '13px' }}>
                    {c.msg}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                placeholder="Type your message..."
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '14px' }}
              />
              <button onClick={handleChatSend} style={{ padding: '12px 16px', backgroundColor: '#8B5E3C', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Send</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}