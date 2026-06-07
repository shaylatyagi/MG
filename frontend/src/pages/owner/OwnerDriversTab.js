import { useState, useEffect, useCallback } from 'react';
import api from '../../api';

const KYC_COLOR = {
  APPROVED: { bg: '#DCFCE7', color: '#16A34A' },
  PENDING:  { bg: '#FEF3C7', color: '#D97706' },
  PARTIAL:  { bg: '#DBEAFE', color: '#2563EB' },
  REJECTED: { bg: '#FEE2E2', color: '#DC2626' },
};

export default function OwnerDriversTab({ lang }) {
  const [drivers, setDrivers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [form, setForm]         = useState({ name: '', phone_number: '', emergency_contact: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/owner/drivers');
      const data = res.data?.data ?? res.data;
      setDrivers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addDriver = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{10}$/.test(form.phone_number)) {
      setError('Phone must be 10 digits');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/owner/drivers', form);
      setShowAdd(false);
      setForm({ name: '', phone_number: '', emergency_contact: '' });
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to add driver');
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;

  if (loading) return (
    <div style={{ padding: '16px' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ height: '80px', backgroundColor: '#F3F4F6', borderRadius: '12px', marginBottom: '10px' }} />
      ))}
    </div>
  );

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>
          {lang === 'en' ? 'Driver Management' : 'ड्राइवर प्रबंधन'} ({drivers.length})
        </p>
        <button
          onClick={() => { setShowAdd(true); setError(''); }}
          style={{ padding: '8px 16px', backgroundColor: '#8B5E3C', color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
        >
          + {lang === 'en' ? 'Add Driver' : 'ड्राइवर जोड़ें'}
        </button>
      </div>

      {/* Add Driver Form */}
      {showAdd && (
        <form onSubmit={addDriver} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #8B5E3C' }}>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', marginBottom: '12px' }}>
            {lang === 'en' ? 'New Driver Details' : 'नया ड्राइवर विवरण'}
          </p>
          {error && (
            <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', marginBottom: '10px' }}>
              {error}
            </div>
          )}
          <input required placeholder={lang === 'en' ? 'Full Name *' : 'पूरा नाम *'} value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' }} />
          <input required placeholder={lang === 'en' ? 'Mobile (10 digits) *' : 'मोबाइल (10 अंक) *'} type="tel"
            value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' }} />
          <input placeholder={lang === 'en' ? 'Emergency Contact (optional)' : 'आपातकालीन संपर्क (वैकल्पिक)'} type="tel"
            value={form.emergency_contact} onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', boxSizing: 'border-box', marginBottom: '12px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => setShowAdd(false)}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E8E0D5', backgroundColor: 'white', color: '#6B6B6B', fontSize: '13px', cursor: 'pointer' }}>
              {lang === 'en' ? 'Cancel' : 'रद्द करें'}
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: saving ? '#C49A6C' : '#8B5E3C', color: 'white', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? '…' : (lang === 'en' ? 'Add Driver' : 'जोड़ें')}
            </button>
          </div>
        </form>
      )}

      {/* Driver List */}
      {drivers.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', textAlign: 'center', border: '1px solid #E8E0D5' }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>👤</p>
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
            {lang === 'en' ? 'No drivers yet. Add your first driver above.' : 'कोई ड्राइवर नहीं। ऊपर पहला ड्राइवर जोड़ें।'}
          </p>
        </div>
      ) : drivers.map((d) => {
        const kycStyle = KYC_COLOR[d.kyc_status] || KYC_COLOR.PENDING;
        const isPaid   = parseFloat(d.paid_today || 0) >= parseFloat(d.daily_rent || 1);
        return (
          <div key={d.id} onClick={() => setSelected(selected === d.id ? null : d.id)}
            style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '10px', border: '1px solid #E8E0D5', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#F3EDE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#8B5E3C', flexShrink: 0 }}>
                  {(d.name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>{d.name}</p>
                  <p style={{ fontSize: '11px', color: '#6B6B6B', margin: 0 }}>
                    {d.phone_number}{d.vehicle_reg ? ` • ${d.vehicle_reg}` : ''}
                  </p>
                </div>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', flexShrink: 0, backgroundColor: isPaid ? '#DCFCE7' : '#FEF3C7', color: isPaid ? '#16A34A' : '#D97706' }}>
                {isPaid ? (lang === 'en' ? 'Paid' : 'पेड') : (lang === 'en' ? 'Pending' : 'बकाया')}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { label: lang === 'en' ? 'Daily Rent' : 'दैनिक किराया', value: fmt(d.daily_rent), color: '#1A1A1A' },
                { label: lang === 'en' ? 'Paid Today' : 'आज भुगतान', value: fmt(d.paid_today), color: isPaid ? '#16A34A' : '#D97706' },
                { label: 'KYC', value: d.kyc_status || 'PENDING', color: kycStyle.color, bg: kycStyle.bg },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, backgroundColor: s.bg || '#FAF7F2', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '10px', color: '#9CA3AF', margin: 0 }}>{s.label}</p>
                  <p style={{ fontSize: '12px', fontWeight: '700', color: s.color, margin: 0 }}>{s.value}</p>
                </div>
              ))}
            </div>

            {selected === d.id && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E8E0D5' }}>
                {[
                  [lang === 'en' ? 'This month' : 'इस महीने', fmt(d.paid_month)],
                  [lang === 'en' ? 'Wallet balance' : 'वॉलेट बैलेंस', fmt(d.wallet_balance)],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <p style={{ fontSize: '12px', color: '#6B6B6B', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#8B5E3C', margin: 0 }}>{val}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
