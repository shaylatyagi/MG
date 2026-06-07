import { useState } from 'react';
import Sidebar from '../components/Sidebar';
export default function MyVehicles() {
  const [vehicles] = useState(() => {
    const saved = localStorage.getItem('vehicles');
    return saved ? JSON.parse(saved) : [
      { id: 'UP-14-EA-2201', driver: 'Amit Sharma', driverPhone: '9999999999', status: 'On Route', rent: '₹450', payout: 'Paid', area: 'Dwarka', condition: 'Good' },
      { id: 'UP-14-EA-2005', driver: 'Suresh Yadav', driverPhone: '8888888888', status: 'Idle', rent: '₹450', payout: 'Pending', area: 'Dwarka', condition: 'Fair' },
    ];
  });
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A' }}>My Vehicles</h1>
          <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>All vehicles registered under your fleet.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {vehicles.map((v, i) => (
            <div
              key={i}
              onClick={() => setSelected(v)}
              style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', border: `2px solid ${selected?.id === v.id ? '#8B5E3C' : '#E8E0D5'}`, cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <p style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A' }}>{v.id}</p>
                <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', backgroundColor: v.status === 'On Route' ? '#DCFCE7' : '#F3F4F6', color: v.status === 'On Route' ? '#16A34A' : '#6B7280' }}>{v.status}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Driver</p>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#1A1A1A' }}>{v.driver}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Daily Rent</p>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#1A1A1A' }}>{v.rent}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Area</p>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#1A1A1A' }}>{v.area || 'N/A'}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Condition</p>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: v.condition === 'Good' ? '#16A34A' : v.condition === 'Fair' ? '#D97706' : '#DC2626' }}>{v.condition || 'N/A'}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Today's Payout</p>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: v.payout === 'Paid' ? '#16A34A' : '#D97706' }}>{v.payout}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {selected && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>{selected.id}</h2>
                <button onClick={() => setSelected(null)} style={{ fontSize: '20px', color: '#6B6B6B', backgroundColor: 'transparent' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: 'Driver Name', value: selected.driver },
                  { label: 'Driver Phone', value: selected.driverPhone || 'N/A' },
                  { label: 'Status', value: selected.status },
                  { label: 'Daily Rent', value: selected.rent },
                  { label: 'Operating Area', value: selected.area || 'N/A' },
                  { label: 'Condition', value: selected.condition || 'N/A' },
                  { label: 'Today\'s Payout', value: selected.payout },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #F3EDE5' }}>
                    <p style={{ fontSize: '13px', color: '#9CA3AF' }}>{item.label}</p>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setSelected(null)} style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#8B5E3C', color: 'white', marginTop: '24px' }}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}