import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api';

const KYC_COLOR = {
  APPROVED: { bg: '#DCFCE7', color: '#16A34A' },
  PENDING:  { bg: '#FEF3C7', color: '#D97706' },
  PARTIAL:  { bg: '#DBEAFE', color: '#2563EB' },
  REJECTED: { bg: '#FEE2E2', color: '#DC2626' },
};

export default function OwnerDriversTab({ lang }) {
  const [drivers, setDrivers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [form, setForm]             = useState({ name: '', phone_number: '', emergency_contact: '' });
  const [importing, setImporting]   = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [profile, setProfile]       = useState({});   // { [driverId]: profileData }
  const [profileLoading, setProfileLoading] = useState({});
  const fileInputRef                = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.q = search.trim();
      if (statusFilter)  params.status = statusFilter;
      const res = await api.get('/api/owner/drivers', { params });
      const data = res.data?.data ?? res.data;
      setDrivers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

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

  const downloadTemplate = () => {
    const csv = 'name,phone_number,emergency_contact\nSuresh Kumar,9876543210,9876543211\nRaj Verma,9876543212,';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'driver_import_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/api/owner/drivers/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const d = res.data?.data || res.data;
      setImportResult(d);
      if (d.created > 0) load();
    } catch (e) {
      setImportResult({ error: e.response?.data?.message || 'Import failed' });
    } finally {
      setImporting(false);
    }
  };

  const loadProfile = async (driverId) => {
    if (profile[driverId]) return; // already loaded
    setProfileLoading(prev => ({ ...prev, [driverId]: true }));
    try {
      const res = await api.get(`/api/owner/drivers/${driverId}/profile`);
      const data = res.data?.data ?? res.data;
      setProfile(prev => ({ ...prev, [driverId]: data }));
    } catch (e) {
      console.error(e);
    } finally {
      setProfileLoading(prev => ({ ...prev, [driverId]: false }));
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
      {/* Hidden CSV file input */}
      <input type="file" accept=".csv,text/csv" style={{ display: 'none' }}
        ref={fileInputRef} onChange={handleImportCSV} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <p style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>
          {lang === 'en' ? 'Driver Management' : 'ड्राइवर प्रबंधन'} ({drivers.length})
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={downloadTemplate}
            style={{ padding: '8px 12px', backgroundColor: 'white', color: '#8B5E3C', borderRadius: '8px', fontSize: '12px', fontWeight: '600', border: '1px solid #8B5E3C', cursor: 'pointer' }}>
            ⬇ Template
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={importing}
            style={{ padding: '8px 12px', backgroundColor: importing ? '#C49A6C' : '#5B4FCF', color: 'white', borderRadius: '8px', fontSize: '12px', fontWeight: '600', border: 'none', cursor: importing ? 'not-allowed' : 'pointer' }}>
            {importing ? '⏳ Importing…' : '📂 Import CSV'}
          </button>
          <button onClick={() => { setShowAdd(true); setError(''); }}
            style={{ padding: '8px 16px', backgroundColor: '#8B5E3C', color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
            + {lang === 'en' ? 'Add Driver' : 'ड्राइवर जोड़ें'}
          </button>
        </div>
      </div>

      {/* DRV-06: Search + Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search name or phone…"
          style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', outline: 'none' }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '9px 10px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', color: '#6B6B6B', background: 'white' }}>
          <option value=''>All Status</option>
          <option value='ACTIVE'>Active</option>
          <option value='INACTIVE'>Inactive</option>
        </select>
      </div>

      {/* Import Result */}
      {importResult && (
        <div style={{ backgroundColor: importResult.error ? '#FEE2E2' : '#F0FDF4', border: `1px solid ${importResult.error ? '#FCA5A5' : '#86EFAC'}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', fontSize: '13px' }}>
          {importResult.error
            ? <p style={{ color: '#DC2626', margin: 0 }}>❌ {importResult.error}</p>
            : <>
                <p style={{ fontWeight: '700', color: '#16A34A', margin: '0 0 4px' }}>✅ Import Complete</p>
                <p style={{ margin: '0 0 2px', color: '#374151' }}>Total rows: {importResult.total} &nbsp;|&nbsp; Created: <strong>{importResult.created}</strong> &nbsp;|&nbsp; Skipped: {importResult.skipped}</p>
                {importResult.errors?.length > 0 && (
                  <details style={{ marginTop: '6px' }}>
                    <summary style={{ cursor: 'pointer', color: '#D97706', fontSize: '12px' }}>{importResult.errors.length} row{importResult.errors.length !== 1 ? 's' : ''} had issues</summary>
                    <ul style={{ margin: '4px 0 0', paddingLeft: '16px', color: '#6B7280', fontSize: '12px' }}>
                      {importResult.errors.map((e, i) => <li key={i}>Row {e.row}: {e.reason}</li>)}
                    </ul>
                  </details>
                )}
              </>
          }
          <button onClick={() => setImportResult(null)} style={{ marginTop: '8px', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '12px' }}>Dismiss</button>
        </div>
      )}

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
          <div key={d.id} onClick={() => { const next = selected === d.id ? null : d.id; setSelected(next); if (next) loadProfile(next); }}
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
                {/* Basic stats */}
                {[
                  [lang === 'en' ? 'This month' : 'इस महीने', fmt(d.paid_month)],
                  [lang === 'en' ? 'Wallet balance' : 'वॉलेट बैलेंस', fmt(d.wallet_balance)],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <p style={{ fontSize: '12px', color: '#6B6B6B', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#8B5E3C', margin: 0 }}>{val}</p>
                  </div>
                ))}

                {/* DRV-05: Profile — last payments + assignment history */}
                {profileLoading[d.id] ? (
                  <p style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'center', margin: '8px 0' }}>Loading profile…</p>
                ) : profile[d.id] && (
                  <>
                    {/* Last payments */}
                    {profile[d.id].payments?.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <p style={{ fontSize: '11px', fontWeight: '700', color: '#6B6B6B', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          Last Payments
                        </p>
                        {profile[d.id].payments.slice(0, 5).map(p => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <p style={{ fontSize: '11px', color: '#6B6B6B', margin: 0 }}>
                              {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              {' · '}{p.payment_mode || 'UPI'}
                            </p>
                            <p style={{ fontSize: '11px', fontWeight: '700', color: '#16A34A', margin: 0 }}>{fmt(p.amount)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Assignment history */}
                    {profile[d.id].assignments?.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <p style={{ fontSize: '11px', fontWeight: '700', color: '#6B6B6B', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          Vehicle History
                        </p>
                        {profile[d.id].assignments.slice(0, 3).map(a => (
                          <div key={a.id} style={{ backgroundColor: '#F9F6F2', borderRadius: '6px', padding: '6px 8px', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <p style={{ fontSize: '11px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>{a.reg_number || '—'}</p>
                              <p style={{ fontSize: '11px', color: '#8B5E3C', fontWeight: '600', margin: 0 }}>{fmt(a.rent_amount)}/day</p>
                            </div>
                            <p style={{ fontSize: '10px', color: '#9CA3AF', margin: '2px 0 0' }}>
                              {new Date(a.assigned_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                              {a.unassigned_at ? ` → ${new Date(a.unassigned_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}` : ' → Active'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
