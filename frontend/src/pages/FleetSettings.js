import { useState } from 'react';
import Sidebar from '../components/Sidebar';
export default function FleetSettings() {
  const [settings, setSettings] = useState({
    ownerName: 'John Doe',
    email: 'johndoe@gmail.com',
    phone: '9999999999',
    bankName: 'HDFC Bank',
    accountNumber: '1234567890',
    ifsc: 'HDFC0001234',
    defaultFine: '50',
    defaultDeadline: '3',
    notifyRentDue: true,
    notifyPaymentReceived: true,
    notifyDocumentExpiry: true,
  });
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };
  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '14px', backgroundColor: '#FAF7F2', color: '#1A1A1A' };
  const labelStyle = { fontSize: '12px', color: '#6B6B6B', marginBottom: '6px', fontWeight: '500' };
  return (
    <div style={{ display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A' }}>Fleet Settings</h1>
          <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>Manage your account and fleet preferences.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Profile */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', marginBottom: '20px' }}>Profile Information</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={labelStyle}>Owner Name</p>
                <input style={inputStyle} value={settings.ownerName} onChange={(e) => setSettings({ ...settings, ownerName: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Email Address</p>
                <input style={inputStyle} value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Phone Number</p>
                <input style={inputStyle} value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
              </div>
            </div>
          </div>
          {/* Bank */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', marginBottom: '20px' }}>Bank Account Details</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={labelStyle}>Bank Name</p>
                <input style={inputStyle} value={settings.bankName} onChange={(e) => setSettings({ ...settings, bankName: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Account Number</p>
                <input style={inputStyle} value={settings.accountNumber} onChange={(e) => setSettings({ ...settings, accountNumber: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>IFSC Code</p>
                <input style={inputStyle} value={settings.ifsc} onChange={(e) => setSettings({ ...settings, ifsc: e.target.value })} />
              </div>
            </div>
          </div>
          {/* Fleet Defaults */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', marginBottom: '20px' }}>Fleet Defaults</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={labelStyle}>Default Fine Per Day (₹)</p>
                <input style={inputStyle} type="number" value={settings.defaultFine} onChange={(e) => setSettings({ ...settings, defaultFine: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Default Payment Deadline (days)</p>
                <input style={inputStyle} type="number" value={settings.defaultDeadline} onChange={(e) => setSettings({ ...settings, defaultDeadline: e.target.value })} />
              </div>
            </div>
          </div>
          {/* Notifications */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', marginBottom: '20px' }}>Notification Preferences</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { key: 'notifyRentDue', label: 'Rent Due Reminders', sub: 'Get notified when driver rent is due' },
                { key: 'notifyPaymentReceived', label: 'Payment Received', sub: 'Get notified when a payment is made' },
                { key: 'notifyDocumentExpiry', label: 'Document Expiry Alerts', sub: 'Get notified before documents expire' },
              ].map((item) => (
                <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A' }}>{item.label}</p>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{item.sub}</p>
                  </div>
                  <div
                    onClick={() => setSettings({ ...settings, [item.key]: !settings[item.key] })}
                    style={{ width: '44px', height: '24px', borderRadius: '12px', backgroundColor: settings[item.key] ? '#8B5E3C' : '#E8E0D5', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
                  >
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '3px', left: settings[item.key] ? '23px' : '3px', transition: 'left 0.2s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            {saved && <p style={{ fontSize: '14px', color: '#16A34A', fontWeight: '500', alignSelf: 'center' }}>✓ Settings saved successfully</p>}
            <button onClick={handleSave} style={{ padding: '12px 32px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#8B5E3C', color: 'white' }}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}