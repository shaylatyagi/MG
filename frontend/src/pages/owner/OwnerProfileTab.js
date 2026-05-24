import { useState } from 'react';

export default function OwnerProfileTab({ lang, user }) {
  const [docs, setDocs] = useState({ gst: 'gst_registration_2026.pdf', pan: null, utility: null });

  const handleUpload = (key, file) => {
    if (file) setDocs(prev => ({ ...prev, [key]: file.name }));
  };

  return (
    <div style={{ padding: '16px' }}>

      {/* Owner Identity */}
      <div style={{ backgroundColor: '#7D5235', borderRadius: '16px', padding: '20px', marginBottom: '16px', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#C49A6C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800' }}>
            {(user.name || 'E').charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: '700', fontSize: '15px', margin: 0 }}>{user.name || 'EcoFleet Admin'}</p>
            <p style={{ fontSize: '11px', opacity: 0.8, margin: 0 }}>Profile ID: OWNER-MGE-0041</p>
            <p style={{ fontSize: '11px', opacity: 0.8, margin: 0 }}>Tier: Premium Enterprise</p>
          </div>
        </div>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px', display: 'flex', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>API Gateway</p>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#C49A6C' }}>Live ●</span>
        </div>
      </div>

      {/* KYC Vault */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #E8E0D5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>
            {lang === 'en' ? 'Owner KYC Document Vault' : 'ओनर KYC दस्तावेज़ वॉल्ट'}
          </p>
          <span style={{ fontSize: '10px', color: '#16A34A', fontWeight: '600' }}>🔒 AES-256</span>
        </div>

        {[
          { key: 'gst', label: lang === 'en' ? 'Corporate GSTIN Certificate' : 'GSTIN प्रमाण पत्र', required: false },
          { key: 'pan', label: lang === 'en' ? 'Enterprise PAN Card Smart Copy' : 'PAN कार्ड कॉपी', required: true },
          { key: 'utility', label: lang === 'en' ? 'Corporate Utility Electricity Bill' : 'बिजली बिल', required: true },
        ].map((doc) => (
          <div key={doc.key} style={{ padding: '12px', backgroundColor: '#FAF7F2', borderRadius: '8px', marginBottom: '8px', border: `1px solid ${docs[doc.key] ? '#16A34A' : '#E8E0D5'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A', margin: 0 }}>{doc.label}</p>
                {docs[doc.key] ? (
                  <p style={{ fontSize: '11px', color: '#16A34A', margin: 0 }}>✓ File: {docs[doc.key]}</p>
                ) : (
                  <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0 }}>{lang === 'en' ? 'Required for verification' : 'सत्यापन के लिए आवश्यक'}</p>
                )}
              </div>
              <label style={{ cursor: 'pointer' }}>
                <div style={{ padding: '6px 12px', backgroundColor: docs[doc.key] ? '#DCFCE7' : '#8B5E3C', color: docs[doc.key] ? '#16A34A' : 'white', borderRadius: '6px', fontSize: '11px', fontWeight: '600' }}>
                  {docs[doc.key] ? '✓ Uploaded' : lang === 'en' ? 'Attach File' : 'फ़ाइल संलग्न'}
                </div>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => handleUpload(doc.key, e.target.files[0])} />
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Corporate Registration */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #E8E0D5' }}>
        <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A', marginBottom: '12px' }}>
          {lang === 'en' ? 'Corporate Registration Metrics' : 'कॉर्पोरेट पंजीकरण विवरण'}
        </p>
        {[
          { label: lang === 'en' ? 'Legal Entity' : 'कानूनी इकाई', value: 'EcoFleet Solutions Pvt Ltd' },
          { label: 'CIN ID Token', value: 'U60231MH2024PTC4123' },
          { label: lang === 'en' ? 'Escrow Node' : 'एस्क्रो नोड', value: 'ICICI-MGE-ESC-09' },
          { label: lang === 'en' ? 'Settlement Freq' : 'सेटलमेंट फ्रीक्वेंसी', value: 'Instant Auto (T+0)' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid #F3EDE5' : 'none' }}>
            <p style={{ fontSize: '12px', color: '#6B6B6B', margin: 0 }}>{item.label}</p>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#1A1A1A', margin: 0 }}>{item.value}</p>
          </div>
        ))}
      </div>

    </div>
  );
}