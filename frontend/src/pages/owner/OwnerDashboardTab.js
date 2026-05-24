import { useState, useEffect } from 'react';
import api from '../../api';

const DATE_FILTERS = ['Today (Live)', 'Yesterday', 'Last 7 Days', 'This Month', 'Last Month'];

export default function OwnerDashboardTab({ lang, user, onOpenChat }) {
  const [filter, setFilter] = useState(0);
  const [stats, setStats] = useState({ total_vehicles: 0, total_earnings: 0, collection_efficiency: 0 });

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/api/owner/stats');
        setStats(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetch();
  }, []);

  const vehicles = [
    { plate: 'MH-12-QX-4019', model: 'Tata Ace EV Truck', driver: 'Rajesh Kumar', rent: 850, status: 'Active' },
    { plate: 'MH-14-EU-8821', model: 'Mahindra Treo Zor', driver: 'Amit Sharma', rent: 700, status: 'Active' },
  ];

  return (
    <div style={{ padding: '16px' }}>

      {/* Yield Ledger */}
      <div style={{ backgroundColor: '#7D5235', borderRadius: '16px', padding: '20px', marginBottom: '16px', color: 'white' }}>
        <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '12px', fontWeight: '600', letterSpacing: '0.5px' }}>
          {lang === 'en' ? 'ECOSYSTEM YIELD LEDGER' : 'इकोसिस्टम यील्ड लेजर'}
        </p>

        {/* Date Filters */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
          {DATE_FILTERS.map((f, i) => (
            <button key={i} onClick={() => setFilter(i)} style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', backgroundColor: filter === i ? 'white' : 'rgba(255,255,255,0.2)', color: filter === i ? '#7D5235' : 'white' }}>
              {f}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '12px' }}>
            <p style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>{lang === 'en' ? 'Received' : 'प्राप्त'}</p>
            <p style={{ fontSize: '20px', fontWeight: '800' }}>₹{stats.total_earnings || '24,500'}</p>
          </div>
          <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '12px' }}>
            <p style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>{lang === 'en' ? 'Outstanding' : 'बकाया'}</p>
            <p style={{ fontSize: '20px', fontWeight: '800' }}>₹4,200</p>
          </div>
          <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '12px' }}>
            <p style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>{lang === 'en' ? 'Pending' : 'अनुमोदन'}</p>
            <p style={{ fontSize: '20px', fontWeight: '800' }}>₹1,800</p>
          </div>
        </div>

        <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '12px', opacity: 0.8 }}>Virtual Escrow Connected</p>
          <span style={{ backgroundColor: '#16A34A', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600' }}>LIVE</span>
        </div>
      </div>

      {/* Incident Alert */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2' }}>
        <p style={{ fontSize: '12px', fontWeight: '700', color: '#DC2626', marginBottom: '8px' }}>
          🚨 {lang === 'en' ? 'Driver Incident Escalation' : 'ड्राइवर घटना एस्केलेशन'}
        </p>
        <p style={{ fontSize: '12px', color: '#1A1A1A', marginBottom: '12px' }}>
          Amit Sharma (MH-14-EU-8821) {lang === 'en' ? 'reported battery charge level dropping rapidly below standard curve thresholds.' : 'ने बैटरी चार्ज तेजी से गिरने की सूचना दी।'}
        </p>
        <button onClick={onOpenChat} style={{ width: '100%', padding: '10px', backgroundColor: '#DC2626', color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
          {lang === 'en' ? 'Open Live Workspace Chat' : 'लाइव चैट खोलें'}
        </button>
      </div>

      {/* Fleet Stats */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #E8E0D5', textAlign: 'center' }}>
          <p style={{ fontSize: '28px', fontWeight: '800', color: '#8B5E3C' }}>{vehicles.length}</p>
          <p style={{ fontSize: '11px', color: '#6B6B6B' }}>{lang === 'en' ? 'Fleet Registered' : 'वाहन पंजीकृत'}</p>
        </div>
        <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #E8E0D5', textAlign: 'center' }}>
          <p style={{ fontSize: '28px', fontWeight: '800', color: '#8B5E3C' }}>{vehicles.length}</p>
          <p style={{ fontSize: '11px', color: '#6B6B6B' }}>{lang === 'en' ? 'Active Contracts' : 'सक्रिय अनुबंध'}</p>
        </div>
      </div>

      {/* Live Asset Management */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #E8E0D5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A' }}>
            {lang === 'en' ? 'Live Asset Management Desk' : 'लाइव एसेट मैनेजमेंट'}
          </p>
          <span style={{ backgroundColor: '#DCFCE7', color: '#16A34A', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600' }}>LIVE</span>
        </div>
        {vehicles.map((v, i) => (
          <div key={i} style={{ padding: '12px', backgroundColor: '#FAF7F2', borderRadius: '10px', marginBottom: '8px', border: '1px solid #E8E0D5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>{v.model}</p>
                <p style={{ fontSize: '11px', color: '#6B6B6B', margin: 0 }}>Plate: {v.plate} • Freq: Daily Bound & Active</p>
              </div>
              <span style={{ backgroundColor: '#DCFCE7', color: '#16A34A', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600' }}>{v.status}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '12px', color: '#6B6B6B', margin: 0 }}>Driver: <strong>{v.driver}</strong></p>
              <p style={{ fontSize: '12px', color: '#8B5E3C', fontWeight: '600', margin: 0 }}>₹{v.rent}/day</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}