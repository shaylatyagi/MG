import { useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api';

const MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

const NEARBY_TILES = [
  { icon: '⚡', label: 'EV Charging',    query: 'electric+vehicle+charging+station', color: '#6d28d9', bg: '#f5f3ff' },
  { icon: '⛽', label: 'Petrol Pump',    query: 'petrol+pump+near+me',                color: '#b45309', bg: '#fef3c7' },
  { icon: '🏥', label: 'Hospital',       query: 'hospital+near+me',                   color: '#dc2626', bg: '#fef2f2' },
  { icon: '🔧', label: 'Repair Shop',    query: 'vehicle+repair+shop+near+me',        color: '#0369a1', bg: '#f0f9ff' },
  { icon: '🚔', label: 'Police Station', query: 'police+station+near+me',             color: '#0f172a', bg: '#f8fafc' },
  { icon: '🛒', label: 'Grocery Store',  query: 'grocery+store+near+me',              color: '#16a34a', bg: '#f0fdf4' },
];

const faqs = [
  { q: 'How do I pay my daily rent?', a: 'Go to your Driver Dashboard and click "Quick Pay Rent" or go to My Wallet and click "Pay Balance". You can pay using UPI, debit card, or net banking.' },
  { q: 'What happens if I miss my payment deadline?', a: 'A daily fine will be added to your dues automatically after the deadline set by your owner. You can see your accumulated dues in real time on your dashboard.' },
  { q: 'How do I contact my vehicle owner?', a: 'Go to Vehicle Status page and you will find your owner contact details with options to call or WhatsApp them directly.' },
  { q: 'How is my trust score calculated?', a: 'Your trust score goes up with every on-time payment and consistent usage. Late payments and fines reduce your score. Check Trust Rewards for a detailed breakdown.' },
  { q: 'What documents do I need to keep updated?', a: 'Your Aadhaar, Driving License, and vehicle RC must always be valid on the platform. You will receive alerts before any document expires.' },
];

// stages: idle | locating | sending | sent | error
export default function HelpSOS() {
  const [openFaq, setOpenFaq]   = useState(null);
  const [showSOS, setShowSOS]   = useState(false);
  const [message, setMessage]   = useState('');
  const [stage, setStage]       = useState('idle');
  const [coords, setCoords]     = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [alertId, setAlertId]   = useState(null);

  // Nearby Stations state
  const [nearbyLoc, setNearbyLoc]       = useState(null);   // { lat, lng }
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError]   = useState('');
  const [mapTile, setMapTile]           = useState(null);    // currently selected tile for embed

  const locateMe = useCallback(() => {
    setNearbyLoading(true); setNearbyError(''); setMapTile(null);
    if (!navigator.geolocation) { setNearbyError('GPS not available on this device.'); setNearbyLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setNearbyLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setNearbyLoading(false); },
      ()    => { setNearbyError('Could not get location. Please allow GPS access.'); setNearbyLoading(false); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  const openModal = () => {
    setStage('idle'); setMessage(''); setCoords(null); setErrorMsg(''); setAlertId(null);
    setShowSOS(true);
  };

  const getLocation = () => new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()     => resolve(null),
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: true }
    );
  });

  const sendSOS = async () => {
    setStage('locating'); setErrorMsg('');
    const location = await getLocation();
    setCoords(location);
    setStage('sending');
    try {
      const res  = await api.post('/api/driver/sos', { lat: location?.lat ?? null, lng: location?.lng ?? null, message: message.trim() || null });
      const data = res.data?.data ?? res.data;
      setAlertId(data?.alert_id);
      setStage('sent');
    } catch (e) {
      setErrorMsg(e.response?.data?.message || 'Failed to send. Please call support directly.');
      setStage('error');
    }
  };

  const mapsLink = coords ? `https://maps.google.com/?q=${coords.lat},${coords.lng}` : null;

  return (
    <div style={{ display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A' }}>Help & SOS</h1>
          <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>Get support or raise an emergency alert.</p>
        </div>

        {/* Action cards */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 1, backgroundColor: '#DC2626', borderRadius: '16px', padding: '28px', color: 'white', textAlign: 'center', cursor: 'pointer' }} onClick={openModal}>
            <p style={{ fontSize: '40px', marginBottom: '12px' }}>🆘</p>
            <p style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Emergency SOS</p>
            <p style={{ fontSize: '13px', opacity: 0.85 }}>Alerts owner + support with your GPS location</p>
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

        {/* FAQ */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5', marginBottom: '24px' }}>
          <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>Frequently Asked Questions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ borderRadius: '8px', border: '1px solid #E8E0D5', overflow: 'hidden' }}>
                <div onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', cursor: 'pointer', backgroundColor: openFaq === i ? '#F3EDE5' : 'white' }}>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A', margin: 0 }}>{faq.q}</p>
                  <span style={{ fontSize: '18px', color: '#8B5E3C', fontWeight: '700' }}>{openFaq === i ? '−' : '+'}</span>
                </div>
                {openFaq === i && (
                  <div style={{ padding: '12px 16px', backgroundColor: '#FAF7F2', borderTop: '1px solid #E8E0D5' }}>
                    <p style={{ fontSize: '13px', color: '#6B6B6B', lineHeight: '1.6', margin: 0 }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5', marginBottom: '24px' }}>
          <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>Contact Information</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            {[{ icon: '📧', label: 'Email', value: 'support@mobilitygrid.in' }, { icon: '📞', label: 'Phone', value: '+91 99999 99999' }, { icon: '🕐', label: 'Support Hours', value: 'Mon-Sat, 9AM-8PM' }].map((item, i) => (
              <div key={i} style={{ backgroundColor: '#FAF7F2', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{item.label}</p>
                <p style={{ fontSize: '13px', fontWeight: '500', color: '#1A1A1A', margin: 0 }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── NEARBY STATIONS ─────────────────────────────────────────── */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E8E0D5', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', margin: 0 }}>📍 Nearby Stations</p>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>Find EV charging, petrol pumps, hospitals and more near you</p>
            </div>
            <button onClick={locateMe} disabled={nearbyLoading}
              style={{ padding: '8px 16px', backgroundColor: nearbyLoc ? '#f0fdf4' : '#4F46E5', color: nearbyLoc ? '#16a34a' : 'white', border: nearbyLoc ? '1px solid #bbf7d0' : 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {nearbyLoading ? '📡 Locating…' : nearbyLoc ? '✓ Located' : '📡 Get My Location'}
            </button>
          </div>

          <div style={{ padding: '20px 24px' }}>
            {nearbyError && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#dc2626', fontSize: '13px' }}>
                ⚠️ {nearbyError}
              </div>
            )}

            {!nearbyLoc && !nearbyLoading && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                <p style={{ fontSize: '32px', marginBottom: '8px' }}>🗺</p>
                <p style={{ fontSize: '13px' }}>Tap "Get My Location" to find nearby services</p>
              </div>
            )}

            {nearbyLoc && (
              <>
                <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '14px' }}>
                  📍 Your location: {nearbyLoc.lat.toFixed(5)}, {nearbyLoc.lng.toFixed(5)}
                </p>

                {/* Tile grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                  {NEARBY_TILES.map((tile) => {
                    const mapsUrl = `https://www.google.com/maps/search/${tile.query}/@${nearbyLoc.lat},${nearbyLoc.lng},15z`;
                    const isActive = mapTile?.query === tile.query;
                    return (
                      <div key={tile.query}
                        style={{ borderRadius: '10px', border: `1.5px solid ${isActive ? tile.color : '#e5e7eb'}`, backgroundColor: isActive ? tile.bg : 'white', cursor: 'pointer', overflow: 'hidden' }}>
                        {/* Open in Maps button */}
                        <a href={mapsUrl} target="_blank" rel="noreferrer"
                          style={{ display: 'block', padding: '14px 8px', textAlign: 'center', textDecoration: 'none' }}>
                          <p style={{ fontSize: '26px', margin: '0 0 6px' }}>{tile.icon}</p>
                          <p style={{ fontSize: '11px', fontWeight: '600', color: tile.color, margin: 0 }}>{tile.label}</p>
                          <p style={{ fontSize: '10px', color: '#6b7280', margin: '2px 0 0' }}>Open Maps ↗</p>
                        </a>
                        {/* Show embed button — only if API key present */}
                        {MAPS_KEY && (
                          <button onClick={() => setMapTile(isActive ? null : tile)}
                            style={{ width: '100%', padding: '5px', fontSize: '10px', fontWeight: '600', color: tile.color, backgroundColor: tile.bg, border: 'none', borderTop: '1px solid #f0f0f0', cursor: 'pointer' }}>
                            {isActive ? 'Hide map ▲' : 'Show map ▼'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Embedded map — shown when tile selected and API key is present */}
                {MAPS_KEY && mapTile && (
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                    <div style={{ padding: '8px 12px', backgroundColor: mapTile.bg, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{mapTile.icon}</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: mapTile.color }}>{mapTile.label} near you</span>
                    </div>
                    <iframe
                      title="nearby-map"
                      width="100%"
                      height="300"
                      frameBorder="0"
                      style={{ display: 'block' }}
                      src={`https://www.google.com/maps/embed/v1/search?key=${MAPS_KEY}&q=${mapTile.query}&center=${nearbyLoc.lat},${nearbyLoc.lng}&zoom=14`}
                      allowFullScreen
                    />
                  </div>
                )}

                {/* Fallback embed (no key) — basic map of current location */}
                {!MAPS_KEY && (
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                    <p style={{ padding: '8px 12px', fontSize: '12px', color: '#6b7280', margin: 0, backgroundColor: '#f9fafb' }}>
                      📌 Your current location
                    </p>
                    <iframe
                      title="current-location-map"
                      width="100%"
                      height="260"
                      frameBorder="0"
                      style={{ display: 'block' }}
                      src={`https://maps.google.com/maps?q=${nearbyLoc.lat},${nearbyLoc.lng}&z=15&output=embed`}
                      allowFullScreen
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* SOS Modal */}
      {showSOS && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>

            {/* IDLE / ERROR */}
            {(stage === 'idle' || stage === 'error') && (<>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ fontSize: '52px', marginBottom: '6px' }}>🆘</p>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#DC2626', margin: 0 }}>Emergency SOS</h2>
                <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '6px' }}>Your GPS location will be shared with your owner and support team automatically.</p>
              </div>
              {stage === 'error' && (
                <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px' }}>⚠️ {errorMsg}</div>
              )}
              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#6B6B6B', marginBottom: '6px' }}>Emergency description (optional)</p>
                <textarea style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', backgroundColor: '#FAF7F2', height: '90px', resize: 'none', boxSizing: 'border-box' }}
                  placeholder="e.g. Accident on highway, vehicle breakdown, medical emergency…"
                  value={message} onChange={e => setMessage(e.target.value)} />
              </div>
              <div style={{ backgroundColor: '#FEF3C7', borderRadius: '8px', padding: '10px 12px', marginBottom: '20px', display: 'flex', gap: '8px' }}>
                <span>📍</span>
                <p style={{ fontSize: '12px', color: '#92400E', margin: 0, lineHeight: 1.5 }}>Your GPS location will be captured and included. Alert is sent even if location is denied.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowSOS(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #E8E0D5', backgroundColor: 'white', color: '#6B6B6B', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button onClick={sendSOS} style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#DC2626', color: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>🆘 Send SOS Alert</button>
              </div>
            </>)}

            {/* LOCATING */}
            {stage === 'locating' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>📍</p>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1A1A1A', marginBottom: '8px' }}>Getting your location…</h2>
                <p style={{ fontSize: '13px', color: '#6B6B6B' }}>Allow location permission if prompted.</p>
                <div style={{ marginTop: '20px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#DC2626', animation: `mgpulse 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
                </div>
              </div>
            )}

            {/* SENDING */}
            {stage === 'sending' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>📡</p>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1A1A1A', marginBottom: '12px' }}>Sending SOS alert…</h2>
                {coords
                  ? <p style={{ fontSize: '13px', color: '#16A34A' }}>✓ Location: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>
                  : <p style={{ fontSize: '13px', color: '#D97706' }}>⚠ Location unavailable — sending without coordinates</p>}
              </div>
            )}

            {/* SENT */}
            {stage === 'sent' && (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <p style={{ fontSize: '52px', marginBottom: '12px' }}>✅</p>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#16A34A', marginBottom: '8px' }}>SOS Alert Sent!</h2>
                <p style={{ fontSize: '13px', color: '#6B6B6B', marginBottom: '16px' }}>Your owner and support team have been notified. Stay calm — help is on the way.</p>
                {alertId && <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>Alert ID: #{alertId}</p>}
                {mapsLink && (
                  <a href={mapsLink} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginBottom: '16px', fontSize: '12px', color: '#2563EB', textDecoration: 'underline' }}>
                    📍 View your location on Google Maps
                  </a>
                )}
                {!coords && <p style={{ fontSize: '12px', color: '#D97706', marginBottom: '16px' }}>⚠ Location not shared. Send it manually if needed.</p>}
                <button onClick={() => setShowSOS(false)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#16A34A', color: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Close</button>
              </div>
            )}

          </div>
        </div>
      )}

      <style>{`@keyframes mgpulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }`}</style>
    </div>
  );
}
