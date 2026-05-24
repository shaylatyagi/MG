import { useState } from 'react';
import DriverDashboardTab from './driver/DriverDashboardTab';
import DriverWalletTab from './driver/DriverWalletTab';
import DriverProfileTab from './driver/DriverProfileTab';
import DriverKYCTab from './driver/DriverKYCTab';

const W = 390;

export default function DriverApp() {
  const [tab, setTab] = useState('dashboard');
  const [lang, setLang] = useState('en');
  const [showIncident, setShowIncident] = useState(false);
  const [incidentMsg, setIncidentMsg] = useState('');
  const [incidentSent, setIncidentSent] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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

  return (
    <div style={{ maxWidth: `${W}px`, margin: '0 auto', minHeight: '100vh', backgroundColor: '#FAF7F2', fontFamily: 'Inter, sans-serif', position: 'relative', paddingBottom: '70px' }}>

      {/* Top Bar */}
      <div style={{ backgroundColor: '#7D5235', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', backgroundColor: '#C49A6C', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: 'white' }}>M</div>
          <span style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>MobilityGrid</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
          >
            {lang === 'en' ? 'हिं' : 'EN'}
          </button>
          <button
            onClick={() => setShowIncident(true)}
            style={{ backgroundColor: '#DC2626', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
          >
            🚨
          </button>
          <button
            style={{ backgroundColor: 'transparent', color: 'white', border: 'none', fontSize: '18px', cursor: 'pointer' }}
          >
            🔔
          </button>
          <button
            onClick={handleLogout}
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', border: 'none', cursor: 'pointer' }}
          >
            ⏻
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ padding: '0' }}>
        {tab === 'dashboard' && <DriverDashboardTab lang={lang} user={user} />}
        {tab === 'wallet' && <DriverWalletTab lang={lang} user={user} />}
        {tab === 'profile' && <DriverProfileTab lang={lang} user={user} />}
        {tab === 'kyc' && <DriverKYCTab lang={lang} user={user} />}
      </div>

      {/* Bottom Navigation */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: `${W}px`, backgroundColor: 'white', borderTop: '1px solid #E8E0D5', display: 'flex', zIndex: 100 }}>
        {[
          { key: 'dashboard', icon: '🏠', label: tx.dashboard },
          { key: 'wallet', icon: '💳', label: tx.wallet },
          { key: 'profile', icon: '👤', label: tx.profile },
          { key: 'kyc', icon: '✅', label: tx.kyc },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            style={{
              flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer',
              backgroundColor: tab === item.key ? '#F3EDE5' : 'white',
              color: tab === item.key ? '#8B5E3C' : '#9CA3AF',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
            }}
          >
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: tab === item.key ? '700' : '400' }}>{item.label}</span>
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

    </div>
  );
}