import { useState, useEffect } from 'react';
import api from '../../api';

const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;
const fmtTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) +
    ', ' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function OwnerDashboardTab({ lang, user, onOpenChat }) {
  const [stats, setStats]     = useState({
    total_vehicles: 0, total_drivers: 0, active_contracts: 0, pending_kyc: 0,
    collection_today: 0, collection_month: 0, outstanding: 0, collection_efficiency: 0,
  });
  const [vehicles, setVehicles]   = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
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

  return (
    <div style={{ padding: '16px' }}>

      {/* Yield Card */}
      <div style={{ backgroundColor: '#7D5235', borderRadius: '16px', padding: '20px', marginBottom: '16px', color: 'white' }}>
        <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '12px', fontWeight: '600', letterSpacing: '0.5px' }}>
          {lang === 'en' ? 'COLLECTION OVERVIEW' : 'कलेक्शन सारांश'}
        </p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '12px' }}>
            <p style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>{lang === 'en' ? 'Today' : 'आज'}</p>
            <p style={{ fontSize: '20px', fontWeight: '800' }}>{loading ? '…' : fmt(stats.collection_today)}</p>
          </div>
          <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '12px' }}>
            <p style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>{lang === 'en' ? 'Outstanding' : 'बकाया'}</p>
            <p style={{ fontSize: '20px', fontWeight: '800' }}>{loading ? '…' : fmt(stats.outstanding)}</p>
          </div>
          <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '12px' }}>
            <p style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>{lang === 'en' ? 'Efficiency' : 'दक्षता'}</p>
            <p style={{ fontSize: '20px', fontWeight: '800' }}>{loading ? '…' : `${stats.collection_efficiency}%`}</p>
          </div>
        </div>

        <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>
            {lang === 'en' ? 'This Month' : 'इस महीने'}: {loading ? '…' : fmt(stats.collection_month)}
          </p>
          <span style={{ backgroundColor: '#16A34A', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600' }}>LIVE</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: lang === 'en' ? 'Vehicles' : 'वाहन',           value: stats.total_vehicles },
          { label: lang === 'en' ? 'Drivers' : 'ड्राइवर',         value: stats.total_drivers },
          { label: lang === 'en' ? 'Active Contracts' : 'सक्रिय',  value: stats.active_contracts },
          { label: lang === 'en' ? 'KYC Pending' : 'KYC बाकी',    value: stats.pending_kyc, warn: stats.pending_kyc > 0 },
        ].map((s) => (
          <div key={s.label} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: `1px solid ${s.warn ? '#FCA5A5' : '#E8E0D5'}`, textAlign: 'center' }}>
            <p style={{ fontSize: '28px', fontWeight: '800', color: s.warn ? '#DC2626' : '#8B5E3C', margin: 0 }}>
              {loading ? '…' : s.value}
            </p>
            <p style={{ fontSize: '11px', color: '#6B6B6B', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* DSH-04: SOS Alerts */}
      {sosAlerts.length > 0 && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: '800', color: '#DC2626', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🆘 SOS Alerts ({sosAlerts.length})
          </p>
          {sosAlerts.map(s => (
            <div key={s.id} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '10px 12px', marginBottom: '8px', border: '1px solid #FCA5A5', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 2px' }}>{s.driver_name}</p>
                <p style={{ fontSize: '11px', color: '#6B6B6B', margin: '0 0 2px' }}>{s.phone_number}</p>
                {s.lat && s.lng && (
                  <a href={`https://maps.google.com/?q=${s.lat},${s.lng}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: '11px', color: '#2563EB', textDecoration: 'none' }}>
                    📍 {parseFloat(s.lat).toFixed(4)}, {parseFloat(s.lng).toFixed(4)}
                  </a>
                )}
                <p style={{ fontSize: '10px', color: '#9CA3AF', margin: '2px 0 0' }}>{fmtTime(s.created_at)}</p>
              </div>
              <button onClick={() => resolveSos(s.id)}
                style={{ flexShrink: 0, padding: '6px 12px', backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                Resolve
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Vehicle list */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #E8E0D5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>
            {lang === 'en' ? 'Fleet Overview' : 'फ्लीट ओवरव्यू'}
          </p>
          <span style={{ backgroundColor: '#DCFCE7', color: '#16A34A', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600' }}>LIVE</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF', fontSize: '13px' }}>Loading…</div>
        ) : vehicles.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>
            {lang === 'en' ? 'No vehicles yet. Use the Handover tab to register.' : 'कोई वाहन नहीं। हैंडओवर टैब से पंजीकृत करें।'}
          </p>
        ) : vehicles.map((v) => (
          <div key={v.id} style={{ padding: '12px', backgroundColor: '#FAF7F2', borderRadius: '10px', marginBottom: '8px', border: '1px solid #E8E0D5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>{v.reg_number}</p>
                <p style={{ fontSize: '11px', color: '#6B6B6B', margin: 0 }}>{v.type}{v.model ? ` • ${v.model}` : ''}</p>
              </div>
              <span style={{
                backgroundColor: v.status === 'ASSIGNED' ? '#DCFCE7' : v.status === 'AVAILABLE' ? '#DBEAFE' : '#FEF3C7',
                color: v.status === 'ASSIGNED' ? '#16A34A' : v.status === 'AVAILABLE' ? '#2563EB' : '#D97706',
                padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600'
              }}>
                {v.status}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '12px', color: '#6B6B6B', margin: 0 }}>
                {lang === 'en' ? 'Driver' : 'ड्राइवर'}: <strong>{v.driver_name || (lang === 'en' ? 'Unassigned' : 'अनअसाइन्ड')}</strong>
              </p>
              <p style={{ fontSize: '12px', color: '#8B5E3C', fontWeight: '600', margin: 0 }}>
                {fmt(v.daily_rent)}/{v.rent_type === 'DAILY' ? (lang === 'en' ? 'day' : 'दिन') : v.rent_type?.toLowerCase()}
              </p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
