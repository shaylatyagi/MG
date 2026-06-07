import { useState } from 'react';
import Sidebar from '../components/Sidebar';
const faqs = [
  { q: 'How do I pay my daily rent?', a: 'Go to your Driver Dashboard and click "Quick Pay Rent" or go to My Wallet and click "Pay Balance ". You can pay using UPI, debit card, or net banking.' },
  { q: 'What happens if I miss my payment deadline?', a: 'A daily fine will be added to your dues automatically after the deadline set by your owner. You can see your accumulated dues in real time on your dashboard.' },
  { q: 'How do I contact my vehicle owner?', a: 'Go to Vehicle Status page and you will find your owner contact details with options to call or WhatsApp them directly.' },
  { q: 'How is my trust score calculated?', a: 'Your trust score goes up with every on-time payment and consistent usage. Late payments and fines reduce your score. Check Trust Rewards for a detailed breakdown.' },
  { q: 'What documents do I need to keep updated?', a: 'Your Aadhaar, Driving License, and vehicle RC must always be valid on the platform. You will receive alerts before any document expires.' },
];
export default function HelpSOS() {
  const [openFaq, setOpenFaq] = useState(null);
  const [showSOS, setShowSOS] = useState(false);
  const [sosMessage, setSosMessage] = useState('');
  const [sosSent, setSosSent] = useState(false);
  const handleSOS = () => {
    if (!sosMessage) { alert('Please describe your emergency'); return; }
    setSosSent(true);
    setShowSOS(false);
    setSosMessage('');
    setTimeout(() => setSosSent(false), 5000);
  };
  return (
    <div style={{ display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A' }}>Help & SOS</h1>
          <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>Get support or raise an emergency alert.</p>
        </div>
        {sosSent && (
          <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #16A34A', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '14px', color: '#16A34A', fontWeight: '500' }}>
            ✓ SOS alert sent. Support team will contact you within 10 minutes.
          </div>
        )}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 1, backgroundColor: '#DC2626', borderRadius: '16px', padding: '28px', color: 'white', textAlign: 'center', cursor: 'pointer' }} onClick={() => setShowSOS(true)}>
            <p style={{ fontSize: '40px', marginBottom: '12px' }}>🆘</p>
            <p style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Emergency SOS</p>
            <p style={{ fontSize: '13px', opacity: 0.85 }}>Tap to alert support team immediately</p>
          </div>
          <div style={{ flex: 1, backgroundColor: '#25D366', borderRadius: '16px', padding: '28px', color: 'white', textAlign: 'center', cursor: 'pointer' }} onClick={() => window.open('https://wa.me/919999999999', '_blank')}>
            <p style={{ fontSize: '40px', marginBottom: '12px' }}>💬</p>
            <p style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>WhatsApp Support</p>
            <p style={{ fontSize: '13px', opacity: 0.85 }}>Chat with our support team</p>
          </div>
          <div style={{ flex: 1, backgroundColor: '#3B82F6', borderRadius: '16px', padding: '28px', color: 'white', textAlign: 'center', cursor: 'pointer' }} onClick={() => window.open('tel:+919999999999')}>
            <p style={{ fontSize: '40px', marginBottom: '12px' }}>📞</p>
            <p style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Call Support</p>
            <p style={{ fontSize: '13px', opacity: 0.85 }}>Mon-Sat, 9AM to 8PM</p>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5', marginBottom: '24px' }}>
          <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>Frequently Asked Questions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ borderRadius: '8px', border: '1px solid #E8E0D5', overflow: 'hidden' }}>
                <div
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', cursor: 'pointer', backgroundColor: openFaq === i ? '#F3EDE5' : 'white' }}
                >
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A' }}>{faq.q}</p>
                  <span style={{ fontSize: '18px', color: '#8B5E3C', fontWeight: '700' }}>{openFaq === i ? '−' : '+'}</span>
                </div>
                {openFaq === i && (
                  <div style={{ padding: '12px 16px', backgroundColor: '#FAF7F2', borderTop: '1px solid #E8E0D5' }}>
                    <p style={{ fontSize: '13px', color: '#6B6B6B', lineHeight: '1.6' }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
          <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>Contact Information</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            {[
              { icon: '📧', label: 'Email', value: 'support@mobilitygrid.in' },
              { icon: '📞', label: 'Phone', value: '+91 99999 99999' },
              { icon: '🕐', label: 'Support Hours', value: 'Mon-Sat, 9AM to 8PM' },
            ].map((item, i) => (
              <div key={i} style={{ backgroundColor: '#FAF7F2', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</p>
                <p style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>{item.label}</p>
                <p style={{ fontSize: '13px', fontWeight: '500', color: '#1A1A1A' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      {showSOS && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <p style={{ fontSize: '48px', marginBottom: '8px' }}>🆘</p>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#DC2626' }}>Emergency SOS</h2>
              <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>Describe your emergency and our team will contact you immediately.</p>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '6px', fontWeight: '500' }}>Emergency Description</p>
              <textarea
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '14px', backgroundColor: '#FAF7F2', color: '#1A1A1A', height: '100px', resize: 'none', fontFamily: 'Inter, sans-serif' }}
                placeholder="Describe your emergency..."
                value={sosMessage}
                onChange={(e) => setSosMessage(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowSOS(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#F3F4F6', color: '#6B6B6B' }}>Cancel</button>
              <button onClick={handleSOS} style={{ flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#DC2626', color: 'white' }}>Send SOS Alert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}