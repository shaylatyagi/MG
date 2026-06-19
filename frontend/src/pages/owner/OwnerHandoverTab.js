import { useState, useEffect, useCallback } from 'react';
import api from '../../api';

export default function OwnerHandoverTab({ lang }) {
  const [step, setStep]         = useState('vehicle'); // vehicle | driver | assign
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const [vForm, setVForm] = useState({ reg_number: '', type: 'EV_AUTO', rent_type: 'DAILY', daily_rent: '', model: '' });
  const [dForm, setDForm] = useState({ name: '', phone_number: '', emergency_contact: '' });
  const [aForm, setAForm] = useState({ driver_id: '', vehicle_id: '', deposit_amount: '0' });
  const [agreementFile, setAgreementFile] = useState(null);

  const loadLists = useCallback(async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        api.get('/api/owner/vehicles'),
        api.get('/api/owner/drivers'),
      ]);
      const vData = vRes.data?.data ?? vRes.data;
      const dData = dRes.data?.data ?? dRes.data;
      setVehicles(Array.isArray(vData) ? vData.filter(v => v.status === 'AVAILABLE') : []);
      setDrivers(Array.isArray(dData) ? dData.filter(d => !d.vehicle_id) : []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { if (step === 'assign') loadLists(); }, [step, loadLists]);

  const submitVehicle = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try {
      await api.post('/api/owner/vehicles', {
        reg_number: vForm.reg_number.toUpperCase(), type: vForm.type,
        rent_type: vForm.rent_type, daily_rent: parseFloat(vForm.daily_rent) || 0,
        model: vForm.model || undefined,
      });
      setSuccess(lang === 'en' ? '✓ Vehicle registered!' : '✓ वाहन पंजीकृत!');
      setVForm({ reg_number: '', type: 'EV_AUTO', rent_type: 'DAILY', daily_rent: '', model: '' });
    } catch (e) { setError(e.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const submitDriver = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    if (!/^\d{10}$/.test(dForm.phone_number)) { setError('Phone must be 10 digits'); setLoading(false); return; }
    try {
      const res = await api.post('/api/owner/drivers', { name: dForm.name.trim(), phone_number: dForm.phone_number, emergency_contact: dForm.emergency_contact || undefined });
      const newDriverId = res.data?.data?.id;
      // Upload agreement if file was selected
      if (agreementFile && newDriverId) {
        const fd = new FormData();
        fd.append('document', agreementFile);
        fd.append('driverId', newDriverId);
        await api.post('/api/uploads/agreement', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => {});
      }
      setSuccess(lang === 'en' ? `✓ Driver onboarded!${agreementFile ? ' Agreement uploaded.' : ''}` : `✓ ड्राइवर ऑनबोर्ड!${agreementFile ? ' समझौता अपलोड किया।' : ''}`);
      setDForm({ name: '', phone_number: '', emergency_contact: '' });
      setAgreementFile(null);
    } catch (e) { setError(e.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const submitAssign = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    if (!aForm.driver_id || !aForm.vehicle_id) { setError('Select both driver and vehicle'); setLoading(false); return; }
    try {
      const v = vehicles.find(x => String(x.id) === String(aForm.vehicle_id));
      await api.post('/api/owner/assign', {
        driver_id: parseInt(aForm.driver_id), vehicle_id: parseInt(aForm.vehicle_id),
        rent_type: v?.rent_type || 'DAILY', rent_amount: v?.daily_rent || 0,
        deposit_amount: parseFloat(aForm.deposit_amount) || 0,
      });
      setSuccess(lang === 'en' ? '✓ Vehicle assigned!' : '✓ वाहन असाइन किया!');
      setAForm({ driver_id: '', vehicle_id: '', deposit_amount: '0' });
      loadLists();
    } catch (e) { setError(e.response?.data?.message || 'Assignment failed'); }
    finally { setLoading(false); }
  };

  const inp = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' };
  const btn = { width: '100%', padding: '12px', backgroundColor: loading ? '#C49A6C' : '#8B5E3C', color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: '700', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '4px' };

  return (
    <div style={{ padding: '16px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', backgroundColor: '#F3EDE5', padding: '4px', borderRadius: '10px' }}>
        {[['vehicle', lang === 'en' ? '🚗 Vehicle' : '🚗 वाहन'], ['driver', lang === 'en' ? '👤 Driver' : '👤 ड्राइवर'], ['assign', lang === 'en' ? '🔗 Assign' : '🔗 असाइन']].map(([s, label]) => (
          <button key={s} onClick={() => { setStep(s); setError(''); setSuccess(''); }}
            style={{ flex: 1, padding: '8px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', backgroundColor: step === s ? '#8B5E3C' : 'transparent', color: step === s ? 'white' : '#8B5E3C' }}>
            {label}
          </button>
        ))}
      </div>

      {error   && <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}
      {success && <div style={{ backgroundColor: '#DCFCE7', color: '#16A34A', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px' }}>{success}</div>}

      {step === 'vehicle' && (
        <form onSubmit={submitVehicle} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #E8E0D5' }}>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', marginBottom: '12px' }}>{lang === 'en' ? 'Register Vehicle' : 'वाहन पंजीकरण'}</p>
          <input required placeholder={lang === 'en' ? 'Reg. Number (MH12AB1234) *' : 'RTO नंबर *'} value={vForm.reg_number} onChange={e => setVForm(f => ({ ...f, reg_number: e.target.value }))} style={inp} />
          <input placeholder={lang === 'en' ? 'Model (optional)' : 'मॉडल'} value={vForm.model} onChange={e => setVForm(f => ({ ...f, model: e.target.value }))} style={inp} />
          <select value={vForm.type} onChange={e => setVForm(f => ({ ...f, type: e.target.value }))} style={{ ...inp, backgroundColor: 'white' }}>
            <option value="EV_AUTO">EV Auto</option>
            <option value="PETROL_AUTO">Petrol Auto</option>
            <option value="TRUCK">Truck</option>
            <option value="CAB">Cab</option>
            <option value="OTHER">Other</option>
          </select>
          <select value={vForm.rent_type} onChange={e => setVForm(f => ({ ...f, rent_type: e.target.value }))} style={{ ...inp, backgroundColor: 'white' }}>
            <option value="DAILY">{lang === 'en' ? 'Daily' : 'दैनिक'}</option>
            <option value="WEEKLY">{lang === 'en' ? 'Weekly' : 'साप्ताहिक'}</option>
            <option value="MONTHLY">{lang === 'en' ? 'Monthly' : 'मासिक'}</option>
          </select>
          <input required type="number" placeholder={lang === 'en' ? 'Daily Rent (₹) *' : 'दैनिक किराया (₹) *'} value={vForm.daily_rent} onChange={e => setVForm(f => ({ ...f, daily_rent: e.target.value }))} style={inp} />
          <button type="submit" disabled={loading} style={btn}>{loading ? '…' : (lang === 'en' ? 'Register Vehicle' : 'वाहन पंजीकृत करें')}</button>
        </form>
      )}

      {step === 'driver' && (
        <form onSubmit={submitDriver} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #E8E0D5' }}>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', marginBottom: '12px' }}>{lang === 'en' ? 'Onboard Driver' : 'ड्राइवर ऑनबोर्ड करें'}</p>
          <input required placeholder={lang === 'en' ? 'Full Name *' : 'पूरा नाम *'} value={dForm.name} onChange={e => setDForm(f => ({ ...f, name: e.target.value }))} style={inp} />
          <input required type="tel" placeholder={lang === 'en' ? 'Mobile (10 digits) *' : 'मोबाइल (10 अंक) *'} value={dForm.phone_number} onChange={e => setDForm(f => ({ ...f, phone_number: e.target.value }))} style={inp} />
          <input type="tel" placeholder={lang === 'en' ? 'Emergency Contact (optional)' : 'आपातकालीन संपर्क'} value={dForm.emergency_contact} onChange={e => setDForm(f => ({ ...f, emergency_contact: e.target.value }))} style={inp} />
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px', fontWeight: '600' }}>{lang === 'en' ? '📎 Agreement Document (optional)' : '📎 समझौता दस्तावेज़ (वैकल्पिक)'}</p>
            <input type="file" accept="image/*,.pdf" onChange={e => setAgreementFile(e.target.files[0] || null)}
              style={{ fontSize: '12px', color: '#6B7280', width: '100%' }} />
            {agreementFile && <p style={{ fontSize: '11px', color: '#16A34A', marginTop: '4px', margin: '4px 0 0' }}>✓ {agreementFile.name}</p>}
          </div>
          <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '12px' }}>{lang === 'en' ? 'Driver logs in via OTP on their phone.' : 'ड्राइवर OTP से लॉगिन करेगा।'}</p>
          <button type="submit" disabled={loading} style={btn}>{loading ? '…' : (lang === 'en' ? 'Onboard Driver' : 'ड्राइवर ऑनबोर्ड करें')}</button>
        </form>
      )}

      {step === 'assign' && (
        <form onSubmit={submitAssign} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #E8E0D5' }}>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', marginBottom: '12px' }}>{lang === 'en' ? 'Assign Vehicle → Driver' : 'वाहन → ड्राइवर असाइन करें'}</p>

          {vehicles.length === 0
            ? <div style={{ backgroundColor: '#FEF3C7', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}><p style={{ fontSize: '12px', color: '#D97706', margin: 0 }}>⚠️ {lang === 'en' ? 'No available vehicles.' : 'कोई वाहन उपलब्ध नहीं।'}</p></div>
            : <select value={aForm.vehicle_id} onChange={e => setAForm(f => ({ ...f, vehicle_id: e.target.value }))} style={{ ...inp, backgroundColor: 'white' }}>
                <option value="">{lang === 'en' ? '— Select Vehicle —' : '— वाहन चुनें —'}</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.reg_number} — ₹{v.daily_rent}/day</option>)}
              </select>
          }

          {drivers.length === 0
            ? <div style={{ backgroundColor: '#FEF3C7', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}><p style={{ fontSize: '12px', color: '#D97706', margin: 0 }}>⚠️ {lang === 'en' ? 'No unassigned drivers.' : 'कोई अनअसाइन्ड ड्राइवर नहीं।'}</p></div>
            : <select value={aForm.driver_id} onChange={e => setAForm(f => ({ ...f, driver_id: e.target.value }))} style={{ ...inp, backgroundColor: 'white' }}>
                <option value="">{lang === 'en' ? '— Select Driver —' : '— ड्राइवर चुनें —'}</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name} — {d.phone_number}</option>)}
              </select>
          }

          <input type="number" placeholder={lang === 'en' ? 'Deposit Amount ₹ (default 0)' : 'जमा राशि ₹'} value={aForm.deposit_amount} onChange={e => setAForm(f => ({ ...f, deposit_amount: e.target.value }))} style={inp} />
          <button type="submit" disabled={loading || !vehicles.length || !drivers.length} style={{ ...btn, opacity: (!vehicles.length || !drivers.length) ? 0.5 : 1 }}>
            {loading ? '…' : (lang === 'en' ? 'Assign Vehicle' : 'वाहन असाइन करें')}
          </button>
        </form>
      )}
    </div>
  );
}
