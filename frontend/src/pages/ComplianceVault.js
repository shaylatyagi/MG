import { useState } from 'react';
import Sidebar from '../components/Sidebar';
const initialDocs = [
  { name: 'Vehicle RC', vehicle: 'UP-14-EA-2201', status: 'Valid', expiry: 'Dec 2026', file: null },
  { name: 'Insurance Certificate', vehicle: 'UP-14-EA-2201', status: 'Valid', expiry: 'Aug 2026', file: null },
  { name: 'Pollution Certificate', vehicle: 'UP-14-EA-2201', status: 'Expiring Soon', expiry: 'Jun 2026', file: null },
  { name: 'Vehicle RC', vehicle: 'UP-14-EA-2005', status: 'Valid', expiry: 'Mar 2027', file: null },
  { name: 'Insurance Certificate', vehicle: 'UP-14-EA-2005', status: 'Expired', expiry: 'Apr 2026', file: null },
  { name: 'Pollution Certificate', vehicle: 'UP-14-EA-2005', status: 'Valid', expiry: 'Nov 2026', file: null },
];
const statusColor = (status) => {
  if (status === 'Valid') return { bg: '#DCFCE7', color: '#16A34A' };
  if (status === 'Expiring Soon') return { bg: '#FEF3C7', color: '#D97706' };
  return { bg: '#FEE2E2', color: '#DC2626' };
};
export default function ComplianceVault() {
  const [docs, setDocs] = useState(initialDocs);
  const handleUpload = (index, file) => {
    if (file) {
      const updated = [...docs];
      updated[index] = { ...updated[index], file: file.name, status: 'Valid' };
      setDocs(updated);
    }
  };
  return (
    <div style={{ display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A' }}>Compliance Vault</h1>
          <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>Manage all vehicle documents and compliance status.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Documents', value: '6', sub: 'Across all vehicles' },
            { label: 'Valid', value: '4', sub: 'Up to date', color: '#16A34A' },
            { label: 'Expiring Soon', value: '1', sub: 'Action needed', color: '#D97706' },
            { label: 'Expired', value: '1', sub: 'Upload new document', color: '#DC2626' },
          ].map((card, i) => (
            <div key={i} style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #E8E0D5' }}>
              <p style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{card.label}</p>
              <p style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', marginBottom: '4px' }}>{card.value}</p>
              <p style={{ fontSize: '12px', color: card.color || '#6B6B6B' }}>{card.sub}</p>
            </div>
          ))}
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
          <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>Document Status</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E8E0D5' }}>
                {['Document', 'Vehicle', 'Status', 'Expiry', 'Action'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.map((doc, i) => {
                const s = statusColor(doc.status);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #E8E0D5' }}>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1A1A1A', fontWeight: '500' }}>{doc.name}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6B6B6B' }}>{doc.vehicle}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: s.bg, color: s.color }}>{doc.status}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6B6B6B' }}>{doc.expiry}</td>
                    <td style={{ padding: '14px 16px' }}>
                      {doc.file ? (
                        <p style={{ fontSize: '12px', color: '#16A34A', fontWeight: '500' }}>✓ {doc.file}</p>
                      ) : (
                        <label style={{ backgroundColor: doc.status === 'Expired' ? '#DC2626' : '#8B5E3C', color: 'white', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                          {doc.status === 'Expired' ? 'Upload New' : 'Update'}
                          <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleUpload(i, e.target.files[0])} />
                        </label>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}