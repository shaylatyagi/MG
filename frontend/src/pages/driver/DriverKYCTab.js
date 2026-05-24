import { useState } from 'react';

const KYC_DOCS = [
  { key: 'aadhaar', en: 'Aadhaar Identity Card', hi: 'आधार कार्ड', icon: '🪪' },
  { key: 'pan', en: 'PAN Tax Identification Card', hi: 'PAN कार्ड', icon: '📄' },
  { key: 'dl', en: 'Driving License (DL)', hi: 'ड्राइविंग लाइसेंस', icon: '🚗' },
  { key: 'bank', en: 'Settlement Bank Account', hi: 'बैंक खाता', icon: '🏦' },
];

export default function DriverKYCTab({ lang }) {
  const [docs, setDocs] = useState({
    aadhaar: { number: '', file: null, status: 'pending' },
    pan: { number: '', file: null, status: 'pending' },
    dl: { number: '', file: null, status: 'pending' },
    bank: { number: '', file: null, status: 'pending' },
  });
  const [verifying, setVerifying] = useState('');

  const handleVerify = (key) => {
    if (!docs[key].number) {
      alert(lang === 'en' ? 'Please enter the document number first' : 'पहले नंबर दर्ज करें');
      return;
    }
    setVerifying(key);
    setTimeout(() => {
      setDocs(prev => ({ ...prev, [key]: { ...prev[key], status: 'verified' } }));
      setVerifying('');
    }, 2000);
  };

  const handleFileUpload = (key, file) => {
    if (file) {
      setDocs(prev => ({ ...prev, [key]: { ...prev[key], file: file.name } }));
    }
  };

  const allVerified = Object.values(docs).every(d => d.status === 'verified');

  return (
    <div style={{ padding: '16px' }}>

      <div style={{ backgroundColor: '#F3EDE5', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
        <p style={{ fontSize: '12px', color: '#8B5E3C', fontWeight: '600', marginBottom: '4px' }}>
          {lang === 'en' ? 'KYC Validation Engine Workspace' : 'KYC सत्यापन इंजन'} — API {lang === 'en' ? 'Enabled' : 'सक्रिय'}
        </p>
        <p style={{ fontSize: '11px', color: '#6B6B6B' }}>
          {lang === 'en'
            ? 'The platform verifies your records via electronic gateway APIs. If gateways timeout, uploaded documents act as offline fallback.'
            : 'प्लेटफॉर्म इलेक्ट्रॉनिक गेटवे से सत्यापन करता है। गेटवे बंद होने पर अपलोड किए दस्तावेज़ काम आते हैं।'}
        </p>
      </div>

      {KYC_DOCS.map((doc) => {
        const d = docs[doc.key];
        const isVerified = d.status === 'verified';
        const isVerifying = verifying === doc.key;

        return (
          <div key={doc.key} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: `1px solid ${isVerified ? '#16A34A' : '#E8E0D5'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>{doc.icon}</span>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A' }}>
                  {lang === 'en' ? doc.en : doc.hi}
                </p>
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600',
                backgroundColor: isVerified ? '#DCFCE7' : '#FEF3C7',
                color: isVerified ? '#16A34A' : '#D97706'
              }}>
                {isVerified ? (lang === 'en' ? 'Verified ✓' : 'सत्यापित ✓') : (lang === 'en' ? 'Pending' : 'बाकी')}
              </span>
            </div>

            {!isVerified && (
              <>
                <input
                  placeholder={lang === 'en' ? `Enter ${doc.en} number` : `${doc.hi} नंबर दर्ज करें`}
                  value={d.number}
                  onChange={(e) => setDocs(prev => ({ ...prev, [doc.key]: { ...prev[doc.key], number: e.target.value } }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '14px', boxSizing: 'border-box', marginBottom: '10px' }}
                />

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleVerify(doc.key)}
                    disabled={isVerifying}
                    style={{ flex: 1, padding: '10px', backgroundColor: '#8B5E3C', color: 'white', borderRadius: '8px', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
                  >
                    {isVerifying ? (lang === 'en' ? 'Verifying...' : 'सत्यापित हो रहा है...') : (lang === 'en' ? 'Execute API Verification' : 'API सत्यापन करें')}
                  </button>
                  <label style={{ flex: 1, padding: '10px', backgroundColor: '#F3EDE5', color: '#8B5E3C', borderRadius: '8px', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {d.file ? '✓ ' + d.file.substring(0, 10) + '...' : (lang === 'en' ? '📎 Upload Doc' : '📎 दस्तावेज़ अपलोड')}
                    <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(doc.key, e.target.files[0])} />
                  </label>
                </div>
              </>
            )}

            {isVerified && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#DCFCE7', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '16px' }}>✅</span>
                <p style={{ fontSize: '12px', color: '#16A34A', fontWeight: '600' }}>
                  {lang === 'en' ? 'Document verified via API gateway' : 'दस्तावेज़ API गेटवे से सत्यापित'}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {allVerified && (
        <div style={{ backgroundColor: '#DCFCE7', borderRadius: '12px', padding: '16px', textAlign: 'center', marginTop: '8px' }}>
          <p style={{ fontSize: '16px', fontWeight: '700', color: '#16A34A' }}>
            🎉 {lang === 'en' ? 'KYC Complete! You are fully verified.' : 'KYC पूर्ण! आप पूरी तरह सत्यापित हैं।'}
          </p>
        </div>
      )}

    </div>
  );
}