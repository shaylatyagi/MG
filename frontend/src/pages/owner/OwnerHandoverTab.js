import { useState } from 'react';

export default function OwnerHandoverTab({ lang }) {
  const [vehicleForm, setVehicleForm] = useState({ make: '', plate: '', frequency: 'daily', rent: '', deduction: '' });
  const [driverForm, setDriverForm] = useState({ name: '', mobile: '', license: '', aadhaar: '' });
  const [vehicleImages, setVehicleImages] = useState({ front: null, rear: null, left: null, dashboard: null });
  const [docs, setDocs] = useState({ rc: null, insurance: null });
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [vehicleDone, setVehicleDone] = useState(false);
  const [driverDone, setDriverDone] = useState(false);
  const [dispatchDone, setDispatchDone] = useState(false);

  const handleImageUpload = (angle, file) => {
    if (file) setVehicleImages(prev => ({ ...prev, [angle]: file.name }));
  };

  const handleDocUpload = (docKey, file) => {
    if (file) setDocs(prev => ({ ...prev, [docKey]: file.name }));
  };

  return (
    <div style={{ padding: '16px' }}>

      {/* Register Vehicle */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #E8E0D5' }}>
        <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A', marginBottom: '12px' }}>
          {lang === 'en' ? '🚗 Register Enterprise Rental Vehicle' : '🚗 वाहन पंजीकरण'}
        </p>

        {vehicleDone ? (
          <div style={{ backgroundColor: '#DCFCE7', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <p style={{ color: '#16A34A', fontWeight: '700' }}>✓ {lang === 'en' ? 'Vehicle registered successfully!' : 'वाहन पंजीकृत!'}</p>
          </div>
        ) : (
          <>
            <input placeholder={lang === 'en' ? 'Vehicle Make Model Name' : 'वाहन मेक/मॉडल'} value={vehicleForm.make} onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' }} />
            <input placeholder={lang === 'en' ? 'RTO Registration Number' : 'RTO नंबर'} value={vehicleForm.plate} onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' }} />

            <p style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '6px' }}>{lang === 'en' ? 'Rental Frequency' : 'किराया चक्र'}</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              {['daily', 'weekly', 'monthly'].map(f => (
                <button key={f} onClick={() => setVehicleForm({ ...vehicleForm, frequency: f })} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${vehicleForm.frequency === f ? '#8B5E3C' : '#E8E0D5'}`, backgroundColor: vehicleForm.frequency === f ? '#F3EDE5' : 'white', color: vehicleForm.frequency === f ? '#8B5E3C' : '#6B6B6B', fontSize: '11px', fontWeight: '600', cursor: 'pointer', textTransform: 'capitalize' }}>
                  {lang === 'en' ? f : f === 'daily' ? 'दैनिक' : f === 'weekly' ? 'साप्ताहिक' : 'मासिक'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input placeholder={lang === 'en' ? 'Base Rent (₹)' : 'बेस किराया (₹)'} type="number" value={vehicleForm.rent} onChange={(e) => setVehicleForm({ ...vehicleForm, rent: e.target.value })} style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px' }} />
              <input placeholder={lang === 'en' ? 'Deduction/Day (₹)' : 'कटौती/दिन (₹)'} type="number" value={vehicleForm.deduction} onChange={(e) => setVehicleForm({ ...vehicleForm, deduction: e.target.value })} style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px' }} />
            </div>

            <p style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '8px' }}>{lang === 'en' ? 'Vehicle Inspection Images (All Angles Required)' : 'वाहन निरीक्षण फोटो (सभी कोण)'}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {['front', 'rear', 'left', 'dashboard'].map(angle => (
                <label key={angle} style={{ cursor: 'pointer' }}>
                  <div style={{ backgroundColor: vehicleImages[angle] ? '#DCFCE7' : '#FAF7F2', border: `2px dashed ${vehicleImages[angle] ? '#16A34A' : '#8B5E3C'}`, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '18px', marginBottom: '4px' }}>📷</p>
                    <p style={{ fontSize: '11px', color: vehicleImages[angle] ? '#16A34A' : '#8B5E3C', fontWeight: '600', textTransform: 'capitalize' }}>
                      {vehicleImages[angle] ? '✓ Uploaded' : (lang === 'en' ? angle : angle === 'front' ? 'सामने' : angle === 'rear' ? 'पीछे' : angle === 'left' ? 'बाईं तरफ' : 'डैशबोर्ड')}
                    </p>
                  </div>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(angle, e.target.files[0])} />
                </label>
              ))}
            </div>

            <p style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '8px' }}>{lang === 'en' ? 'Compliance Documents Vault' : 'अनुपालन दस्तावेज़'}</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {[{ key: 'rc', label: lang === 'en' ? 'RTO RC Smart Card' : 'RTO RC कार्ड' }, { key: 'insurance', label: lang === 'en' ? 'Insurance Policy' : 'बीमा पॉलिसी' }].map(doc => (
                <label key={doc.key} style={{ flex: 1, cursor: 'pointer' }}>
                  <div style={{ backgroundColor: docs[doc.key] ? '#DCFCE7' : '#FAF7F2', border: `1px dashed ${docs[doc.key] ? '#16A34A' : '#8B5E3C'}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', color: docs[doc.key] ? '#16A34A' : '#8B5E3C', fontWeight: '600' }}>
                      {docs[doc.key] ? '✓ ' + doc.label : '📎 ' + doc.label}
                    </p>
                  </div>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => handleDocUpload(doc.key, e.target.files[0])} />
                </label>
              ))}
            </div>

            <button onClick={() => setVehicleDone(true)} style={{ width: '100%', padding: '12px', backgroundColor: '#8B5E3C', color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: '700', border: 'none', cursor: 'pointer' }}>
              {lang === 'en' ? 'Instantiate Vehicle & Proceed' : 'वाहन पंजीकृत करें'}
            </button>
          </>
        )}
      </div>

      {/* Onboard Driver */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #E8E0D5' }}>
        <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A', marginBottom: '12px' }}>
          {lang === 'en' ? '👤 Onboard Field Driver Account' : '👤 ड्राइवर ऑनबोर्डिंग'}
        </p>

        {driverDone ? (
          <div style={{ backgroundColor: '#DCFCE7', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <p style={{ color: '#16A34A', fontWeight: '700' }}>✓ {lang === 'en' ? 'Driver onboarded successfully!' : 'ड्राइवर ऑनबोर्ड हो गया!'}</p>
          </div>
        ) : (
          <>
            <input placeholder={lang === 'en' ? 'Driver Legal Full Name' : 'ड्राइवर का पूरा नाम'} value={driverForm.name} onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' }} />
            <input placeholder={lang === 'en' ? 'Mobile Communication Contact' : 'मोबाइल नंबर'} type="tel" value={driverForm.mobile} onChange={(e) => setDriverForm({ ...driverForm, mobile: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' }} />
            <input placeholder={lang === 'en' ? 'Commercial License Number' : 'लाइसेंस नंबर'} value={driverForm.license} onChange={(e) => setDriverForm({ ...driverForm, license: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' }} />

            <p style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '6px' }}>{lang === 'en' ? 'Baseline KYC Identity Verification' : 'बुनियादी KYC सत्यापन'}</p>
            <input placeholder={lang === 'en' ? 'Aadhaar Unique Card Number' : 'आधार नंबर'} value={driverForm.aadhaar} onChange={(e) => setDriverForm({ ...driverForm, aadhaar: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' }} />

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {[{ label: lang === 'en' ? '📎 Aadhaar Front' : '📎 आधार सामने' }, { label: lang === 'en' ? '📎 License Back' : '📎 लाइसेंस पीछे' }].map((d, i) => (
                <label key={i} style={{ flex: 1, cursor: 'pointer' }}>
                  <div style={{ backgroundColor: '#FAF7F2', border: '1px dashed #8B5E3C', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', color: '#8B5E3C', fontWeight: '600' }}>{d.label}</p>
                  </div>
                  <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} />
                </label>
              ))}
            </div>

            <button onClick={() => setDriverDone(true)} style={{ width: '100%', padding: '12px', backgroundColor: '#8B5E3C', color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: '700', border: 'none', cursor: 'pointer' }}>
              {lang === 'en' ? 'Onboard Driver Node Identity' : 'ड्राइवर ऑनबोर्ड करें'}
            </button>
          </>
        )}
      </div>

      {/* Dispatch & Advance */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #E8E0D5' }}>
        <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A', marginBottom: '12px' }}>
          {lang === 'en' ? '🚀 Ecosystem Dispatch & Advance Allocation' : '🚀 डिस्पैच और अग्रिम आवंटन'}
        </p>

        {dispatchDone ? (
          <div style={{ backgroundColor: '#DCFCE7', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <p style={{ color: '#16A34A', fontWeight: '700' }}>✓ {lang === 'en' ? 'Handover executed & capital disbursed!' : 'हैंडओवर और पूंजी वितरित!'}</p>
          </div>
        ) : (
          <>
            <div style={{ backgroundColor: '#FEF3C7', borderRadius: '8px', padding: '10px', marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', color: '#D97706' }}>⚠️ {lang === 'en' ? 'No unassigned vehicles available' : 'कोई अनअसाइन्ड वाहन उपलब्ध नहीं'}</p>
            </div>
            <div style={{ backgroundColor: '#FEF3C7', borderRadius: '8px', padding: '10px', marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', color: '#D97706' }}>⚠️ {lang === 'en' ? 'No active unassigned drivers available' : 'कोई अनअसाइन्ड ड्राइवर उपलब्ध नहीं'}</p>
            </div>

            <p style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '6px' }}>
              {lang === 'en' ? 'Pre-handover Wallet Cash Advance Risk Shield' : 'प्री-हैंडओवर वॉलेट अग्रिम'}
            </p>
            <p style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '10px' }}>
              {lang === 'en' ? 'Allocate immediate float liquid capital to the driver\'s profile wallet for toll gates, fastag recharge, or battery top-ups.' : 'ड्राइवर के वॉलेट में टोल, फास्टैग या बैटरी टॉप-अप के लिए अग्रिम राशि आवंटित करें।'}
            </p>

            <input
              type="number"
              placeholder="₹ Enter advance amount"
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '14px', boxSizing: 'border-box', marginBottom: '12px' }}
            />

            <button onClick={() => setDispatchDone(true)} style={{ width: '100%', padding: '12px', backgroundColor: '#8B5E3C', color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: '700', border: 'none', cursor: 'pointer' }}>
              {lang === 'en' ? 'Execute Handover & Disburse Capital' : 'हैंडओवर करें और पूंजी वितरित करें'}
            </button>
          </>
        )}
      </div>

    </div>
  );
}