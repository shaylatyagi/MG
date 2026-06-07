import { useState } from 'react';

const drivers = [
  { name: 'Rajesh Kumar', plate: 'MH-12-QX-4019', model: 'Tata Ace EV Truck', rent: 850, paid: 850, status: 'Paid', kyc: 'Verified' },
  { name: 'Amit Sharma', plate: 'MH-14-EU-8821', model: 'Mahindra Treo Zor', rent: 700, paid: 0, status: 'Pending', kyc: 'Verified' },
];

export default function OwnerDriversTab({ lang }) {
  const [selected, setSelected] = useState(null);

  return (
    <div style={{ padding: '16px' }}>
      <p style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A', marginBottom: '16px' }}>
        {lang === 'en' ? 'Driver Matrix & KYC Audit' : 'ड्राइवर मैट्रिक्स और KYC ऑडिट'}
      </p>

      {drivers.map((d, i) => (
        <div key={i} onClick={() => setSelected(selected === i ? null : i)} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: '1px solid #E8E0D5', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#F3EDE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#8B5E3C' }}>
                {d.name.charAt(0)}
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>{d.name}</p>
                <p style={{ fontSize: '11px', color: '#6B6B6B', margin: 0 }}>{d.plate} • {d.model}</p>
              </div>
            </div>
            <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', backgroundColor: d.status === 'Paid' ? '#DCFCE7' : '#FEF3C7', color: d.status === 'Paid' ? '#16A34A' : '#D97706' }}>
              {d.status}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, backgroundColor: '#FAF7F2', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: '#9CA3AF', margin: 0 }}>{lang === 'en' ? 'Daily Rent' : 'दैनिक किराया'}</p>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>₹{d.rent}</p>
            </div>
            <div style={{ flex: 1, backgroundColor: '#FAF7F2', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: '#9CA3AF', margin: 0 }}>{lang === 'en' ? 'Paid Today' : 'आज भुगतान'}</p>
              <p style={{ fontSize: '14px', fontWeight: '700', color: d.paid > 0 ? '#16A34A' : '#D97706', margin: 0 }}>₹{d.paid}</p>
            </div>
            <div style={{ flex: 1, backgroundColor: '#FAF7F2', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: '#9CA3AF', margin: 0 }}>KYC</p>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#16A34A', margin: 0 }}>✓</p>
            </div>
          </div>

          {selected === i && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E8E0D5' }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#1A1A1A', marginBottom: '8px' }}>KYC Document Status</p>
              {['Aadhaar', 'Driving License', 'Bank Account'].map((doc) => (
                <div key={doc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F3EDE5' }}>
                  <p style={{ fontSize: '12px', color: '#6B6B6B', margin: 0 }}>{doc}</p>
                  <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: '600' }}>✓ Verified</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}