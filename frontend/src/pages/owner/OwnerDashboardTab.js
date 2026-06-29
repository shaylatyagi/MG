import { useState, useEffect } from 'react';
import api from '../../api';

const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;
const fmtTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) +
    ', ' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const I = '#4f46e5'; // indigo-600
const IG = 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)';
const GOLD = '#c4965a';

export default function OwnerDashboardTab({ lang, user, onOpenChat }) {
  const [stats, setStats] = useState({
    total_vehicles: 0, total_drivers: 0, active_contracts: 0, pending_kyc: 0,
    collection_today: 0, collection_month: 0, collection_total: 0, outstanding: 0, collection_efficiency: 0,
    active_vehicles_today: 0, rent_due_today: 0,
  });
  const [vehicles, setVehicles]   = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [expandedSos, setExpandedSos] = useState(null); // id of alert with map open
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [sRes, vRes, sosRes] = await Promise.all([
          api.get('/api/owner/stats'),
          api.get('/api/owner/vehicles'),
          api.get('/api/owner/sos').catch(() => ({ data: { data: [] } })),
        ]);
        const sData = sRes.data?.data ?? sRes.data;
        const vData = vRes.data?.data ?? vRes.data;
        const sosData = sosRes.data?.data ?? [];
        if (sData) setStats(sData);
        setVehicles(Array.isArray(vData) ? vData : []);
        setSosAlerts(Array.isArray(sosData) ? sosData : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const resolveSos = async (id) => {
    try {
      await api.post(`/api/owner/sos/${id}/resolve`);
      setSosAlerts(prev => prev.filter(s => s.id !== id));
    } catch (e) { console.error(e); }
  };

  const L = (en, hi) => lang === 'hi' ? hi : en;

  return (
    <div style={{ padding: '16px', fontFamily: "'Inter', sans-serif" }}>

      {/* Collection Hero Card */}
      <div style={{ background: IG, borderRadius: '16px', padding: '20px', marginBottom: '14px', color: 'white', boxShadow: '0 8px 24px rgba(79,70,229,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', opacity: 0.75, margin: 0, textTransform: 'uppercase' }}>
              {L('Collection Overview', 'कलेक्शन सारांश')}
            </p>
            <p style={{ fontSize: '26px', fontWeight: 800, margin: '4px 0 0', letterSpacing: '-0.5px' }}>
              {loading ? '…' : fmt(stats.collection_total)}
            </p>
            <p style={{ fontSize: '11px', opacity: 0.65, margin: '2px 0 0' }}>
              {L('All-time collected', 'कुल कलेक्शन')}
            </p>
          </div>
          <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '20px', padding: '4px 10px', fontSize: '10px', fontWeight: 700, backdropFilter: 'blur(8px)' }}>
            LIVE
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          {[
            { label: L('Today', 'आज'), value: fmt(stats.collection_today) },
            { label: L('This Month', 'इस माह'), value: fmt(stats.collection_month) },
            { label: L('Active Vehicles Today', 'आज सक्रिय वाहन'), value: stats.active_vehicles_today },
            { label: L('Rent Due Today', 'आज का किराया'), value: fmt(stats.rent_due_today) },
            { label: L('Outstanding', 'बकाया'), value: fmt(stats.outstanding) },
          ].map((c) => (
            <div key={c.label} style={{ flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 8px', backdropFilter: 'blur(4px)' }}>
              <p style={{ fontSize: '10px', opacity: 0.7, margin: '0 0 4px', fontWeight: 600 }}>{c.label}</p>
              <p style={{ fontSize: '16px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>{loading ? '…' : c.value}</p>
            </div>
          ))}
        </div>

        {/* Efficiency bar */}
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '11px', opacity: 0.75, margin: 0, fontWeight: 600 }}>
            {L('Collection Efficiency', 'दक्षता')}
          </p>
          <p style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: stats.collection_efficiency >= 80 ? '#4ade80' : '#fbbf24' }}>
            {loading ? '…' : `${stats.collection_efficiency || 0}%`}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
        {[
          { label: L('Vehicles', 'वाहन'),           value: stats.total_vehicles,   color: I,        bg: '#f5f3ff' },
          { label: L('Drivers', 'ड्राइवर'),          value: stats.total_drivers,    color: '#0891b2', bg: '#ecfeff' },
          { label: L('Active Contracts', 'सक्रिय'),  value: stats.active_contracts, color: '#16a34a', bg: '#f0fdf4' },
          { label: L('KYC Pending', 'KYC बाकी'),    value: stats.pending_kyc,      color: stats.pending_kyc > 0 ? '#dc2626' : '#64748b', bg: stats.pending_kyc > 0 ? '#fef2f2' : '#f8fafc', warn: stats.pending_kyc > 0 },
        ].map((s) => (
          <div key={s.label} style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: `1.5px solid ${s.warn ? '#fecaca' : '#e2e8f0'}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 800, color: s.color, margin: 0, letterSpacing: '-0.5px' }}>
                  {loading ? '…' : s.value}
                </p>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0', fontWeight: 600 }}>{s.label}</p>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, marginTop: 4, opacity: 0.6 }} />
            </div>
          </div>
        ))}
      </div>

      {/* SOS Alerts */}
      {sosAlerts.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
          <p style={{ fontSize: '13px', fontWeight: 800, color: '#dc2626', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🆘 {L('SOS Alerts', 'SOS अलर्ट')} ({sosAlerts.length})
          </p>
          {sosAlerts.map(s => (
            <div key={s.id} style={{ background: '#fff', borderRadius: '10px', marginBottom: '8px', border: '1px solid #fecaca', overflow: 'hidden' }}>
              {/* Header row */}
              <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>🆘</span>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{s.driver_name}</p>
                  </div>
                  {s.message && (
                    <p style={{ fontSize: '11px', color: '#374151', margin: '0 0 3px', fontStyle: 'italic' }}>"{s.message}"</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <a href={`tel:${s.phone_number}`}
                      style={{ fontSize: '11px', color: '#0891b2', textDecoration: 'none', fontWeight: 600 }}>
                      📞 {s.phone_number}
                    </a>
                    <a href={`https://wa.me/91${s.phone_number?.replace(/[^0-9]/g,'')}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: '11px', color: '#16a34a', textDecoration: 'none', fontWeight: 600 }}>
                      💬 WhatsApp
                    </a>
                    <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>{fmtTime(s.created_at)}</p>
                  </div>
                  {/* Location row */}
                  {s.lat && s.lng ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <button onClick={() => setExpandedSos(expandedSos === s.id ? null : s.id)}
                        style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', background: '#eef2ff', border: 'none', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}>
                        {expandedSos === s.id ? '🗺 Hide Map' : '🗺 View on Map'}
                      </button>
                      <a href={`https://maps.google.com/?q=${s.lat},${s.lng}`} target="_blank" rel="noreferrer"
                        style={{ fontSize: '11px', color: '#64748b', textDecoration: 'none' }}>
                        📍 {parseFloat(s.lat).toFixed(5)}, {parseFloat(s.lng).toFixed(5)} ↗
                      </a>
                    </div>
                  ) : (
                    <p style={{ fontSize: '10px', color: '#f59e0b', margin: '4px 0 0', fontWeight: 600 }}>⚠ Location not shared</p>
                  )}
                </div>
                <button onClick={() => resolveSos(s.id)}
                  style={{ flexShrink: 0, marginLeft: '10px', padding: '6px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                  Resolve
                </button>
              </div>
              {/* Expandable map */}
              {expandedSos === s.id && s.lat && s.lng && (
                <div style={{ borderTop: '1px solid #fecaca' }}>
                  <iframe
                    title={`sos-map-${s.id}`}
                    width="100%"
                    height="220"
                    frameBorder="0"
                    style={{ display: 'block' }}
                    src={`https://maps.google.com/maps?q=${s.lat},${s.lng}&z=15&output=embed`}
                    allowFullScreen
                  />
                  <div style={{ padding: '8px 12px', background: '#fef9f9', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <a href={`https://maps.google.com/?q=${s.lat},${s.lng}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', textDecoration: 'none', padding: '5px 10px', background: '#eef2ff', borderRadius: '6px' }}>
                      Open in Google Maps ↗
                    </a>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', textDecoration: 'none', padding: '5px 10px', background: '#f0fdf4', borderRadius: '6px' }}>
                      Get Directions ↗
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fleet Overview */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1.5px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569' }}>
            {L('Fleet Overview', 'फ्लीट ओवरव्यू')}
          </p>
          <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 700 }}>LIVE</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>Loading…</div>
        ) : vehicles.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
            {L('No vehicles yet. Use the Handover tab to register.', 'कोई वाहन नहीं। हैंडओवर टैब से पंजीकृत करें।')}
          </p>
        ) : vehicles.map((v) => (
          <div key={v.id} style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{v.reg_number}</p>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{v.type}{v.model ? ` · ${v.model}` : ''}</p>
              </div>
              <span style={{
                background: v.status === 'ASSIGNED' ? '#f0fdf4' : v.status === 'AVAILABLE' ? '#f5f3ff' : '#fffbeb',
                color: v.status === 'ASSIGNED' ? '#16a34a' : v.status === 'AVAILABLE' ? '#4f46e5' : '#d97706',
                padding: '3px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700
              }}>
                {v.status}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                {L('Driver', 'ड्राइवर')}: <strong style={{ color: '#0f172a' }}>{v.driver_name || L('Unassigned', 'अनअसाइन्ड')}</strong>
              </p>
              <p style={{ fontSize: '12px', color: I, fontWeight: 700, margin: 0 }}>
                {fmt(v.daily_rent)}/{v.rent_type === 'DAILY' ? L('day', 'दिन') : v.rent_type?.toLowerCase()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
