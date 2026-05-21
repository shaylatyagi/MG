import Sidebar from '../components/Sidebar';
export default function VehicleStatus() {
  return (
    <div style={{ display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A' }}>Vehicle Status</h1>
          <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>Real time status of your assigned vehicle.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 2, backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <p style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Active Vehicle</p>
                <p style={{ fontSize: '22px', fontWeight: '700', color: '#1A1A1A' }}>UP-14-EA-2201</p>
              </div>
              <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', backgroundColor: '#DCFCE7', color: '#16A34A' }}>On Route</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              {[
                { label: 'Battery Level', value: '68%', icon: '🔋', color: '#16A34A' },
                { label: 'KMs Driven Today', value: '42.5 km', icon: '📍', color: '#1A1A1A' },
                { label: 'Vehicle Condition', value: 'Good', icon: '✅', color: '#16A34A' },
                { label: 'Last Serviced', value: 'Apr 2026', icon: '🔧', color: '#1A1A1A' },
                { label: 'Rental Start', value: 'May 1, 2026', icon: '📅', color: '#1A1A1A' },
                { label: 'Rental End', value: 'May 31, 2026', icon: '📅', color: '#D97706' },
              ].map((item, i) => (
                <div key={i} style={{ backgroundColor: '#FAF7F2', borderRadius: '10px', padding: '16px' }}>
                  <p style={{ fontSize: '20px', marginBottom: '8px' }}>{item.icon}</p>
                  <p style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>{item.label}</p>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>Battery Health</p>
              <div style={{ backgroundColor: '#F3EDE5', borderRadius: '8px', height: '12px', marginBottom: '8px' }}>
                <div style={{ backgroundColor: '#16A34A', borderRadius: '8px', height: '12px', width: '68%' }} />
              </div>
              <p style={{ fontSize: '13px', color: '#6B6B6B' }}>68% — Good condition</p>
            </div>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>Charging Stations Nearby</p>
              {[
                { name: 'Sector 10 Charging Hub', distance: '1.2 km', status: 'Available' },
                { name: 'Dwarka Mod Station', distance: '2.8 km', status: 'Busy' },
                { name: 'Sector 23 Point', distance: '3.5 km', status: 'Available' },
              ].map((station, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? '1px solid #F3EDE5' : 'none' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '500', color: '#1A1A1A' }}>{station.name}</p>
                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{station.distance}</p>
                  </div>
                  <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500', backgroundColor: station.status === 'Available' ? '#DCFCE7' : '#FEE2E2', color: station.status === 'Available' ? '#16A34A' : '#DC2626' }}>{station.status}</span>
                </div>
              ))}
            </div>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>Owner Contact</p>
              <p style={{ fontSize: '13px', color: '#1A1A1A', fontWeight: '500' }}>John Doe</p>
              <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>+91 9999999999</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button style={{ flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', backgroundColor: '#8B5E3C', color: 'white' }}>📞 Call</button>
                <button style={{ flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', backgroundColor: '#25D366', color: 'white' }}>💬 WhatsApp</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}