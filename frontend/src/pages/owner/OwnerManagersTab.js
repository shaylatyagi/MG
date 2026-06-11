// frontend/src/pages/owner/OwnerManagersTab.js — MGR-01/04/06
// Owner: add managers, set permissions, revoke access
import { useState, useEffect, useCallback } from 'react';
import api from '../../api';

const ALL_PERMS = [
  { key: 'view_drivers',     label: 'View Drivers' },
  { key: 'view_collections', label: 'View Collections' },
  { key: 'record_cash',      label: 'Record Cash' },
  { key: 'assign_vehicle',   label: 'Assign Vehicle' },
  { key: 'chat',             label: 'Chat with Drivers' },
  { key: 'view_documents',   label: 'View Documents' },
  { key: 'sos_alerts',       label: 'SOS Alerts' },
];

const emptyForm = () => ({
  full_name: '', mobile_number: '',
  permissions: { view_drivers: false, view_collections: false, record_cash: false,
                 assign_vehicle: false, chat: false, view_documents: false, sos_alerts: false },
});

export default function OwnerManagersTab({ lang }) {
  const [managers, setManagers]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [revoking, setRevoking]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/manager/');
      const data = res.data?.managers ?? res.data?.data ?? res.data;
      setManagers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addManager = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{10}$/.test(form.mobile_number)) {
      setError('Phone must be 10 digits');
      return;
    }
    const hasAny = Object.values(form.permissions).some(Boolean);
    if (!hasAny) { setError('Select at least one permission'); return; }

    setSaving(true);
    try {
      await api.post('/api/manager/', {
        full_name: form.full_name.trim(),
        mobile_number: form.mobile_number,
        permissions: form.permissions,
      });
      setShowAdd(false);
      setForm(emptyForm());
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to add manager');
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (id) => {
    if (!window.confirm('Revoke this manager\'s access?')) return;
    setRevoking(id);
    try {
      await api.delete(`/api/manager/${id}`);
      setManagers(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to revoke');
    } finally {
      setRevoking(null);
    }
  };

  const togglePerm = (key) => {
    setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }));
  };

  const permCount = (mgr) => {
    try {
      const p = typeof mgr.permissions === 'string' ? JSON.parse(mgr.permissions) : (mgr.permissions || {});
      return Object.values(p).filter(Boolean).length;
    } catch { return 0; }
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>
          👥 {lang === 'en' ? 'Managers' : 'मैनेजर'} ({managers.length})
        </p>
        <button onClick={() => { setShowAdd(true); setError(''); setForm(emptyForm()); }}
          style={{ padding: '8px 16px', backgroundColor: '#8B5E3C', color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
          + {lang === 'en' ? 'Add Manager' : 'मैनेजर जोड़ें'}
        </button>
      </div>

      <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#92400E' }}>
        ₹499/month subscription required. Managers can only see tabs you permit.
      </div>

      {/* Add Form */}
      {showAdd && (
        <form onSubmit={addManager} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #8B5E3C' }}>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', marginBottom: '12px' }}>New Manager</p>
          {error && (
            <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', marginBottom: '10px' }}>{error}</div>
          )}
          <input required placeholder="Full Name *" value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' }} />
          <input required placeholder="Mobile (10 digits) *" type="tel" value={form.mobile_number}
            onChange={e => setForm(f => ({ ...f, mobile_number: e.target.value }))}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', boxSizing: 'border-box', marginBottom: '12px' }} />

          <p style={{ fontSize: '12px', fontWeight: '700', color: '#6B6B6B', marginBottom: '8px' }}>PERMISSIONS</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            {ALL_PERMS.map(p => (
              <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${form.permissions[p.key] ? '#8B5E3C' : '#E8E0D5'}`, backgroundColor: form.permissions[p.key] ? '#FDF6EE' : 'white' }}>
                <input type="checkbox" checked={form.permissions[p.key]} onChange={() => togglePerm(p.key)} style={{ accentColor: '#8B5E3C' }} />
                <span style={{ fontSize: '12px', color: '#1A1A1A' }}>{p.label}</span>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => setShowAdd(false)}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E8E0D5', backgroundColor: 'white', color: '#6B6B6B', fontSize: '13px', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: saving ? '#C49A6C' : '#8B5E3C', color: 'white', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? '…' : 'Add Manager'}
            </button>
          </div>
        </form>
      )}

      {/* Manager List */}
      {loading ? (
        [...Array(3)].map((_, i) => (
          <div key={i} style={{ height: '72px', backgroundColor: '#F3F4F6', borderRadius: '12px', marginBottom: '10px' }} />
        ))
      ) : managers.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', textAlign: 'center', border: '1px solid #E8E0D5' }}>
          <p style={{ fontSize: '28px', marginBottom: '8px' }}>👤</p>
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>No managers yet. Add one to delegate daily operations.</p>
        </div>
      ) : managers.map(m => (
        <div key={m.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px', border: '1px solid #E8E0D5', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#F3EDE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#8B5E3C', flexShrink: 0 }}>
            {(m.full_name || '?').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 2px' }}>{m.full_name}</p>
            <p style={{ fontSize: '11px', color: '#6B6B6B', margin: 0 }}>{m.mobile_number} · {permCount(m)} permission{permCount(m) !== 1 ? 's' : ''}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600',
              backgroundColor: m.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2',
              color: m.status === 'ACTIVE' ? '#16A34A' : '#DC2626' }}>
              {m.status || 'ACTIVE'}
            </span>
            {m.status !== 'REVOKED' && (
              <button onClick={() => revoke(m.id)} disabled={revoking === m.id}
                style={{ padding: '5px 10px', backgroundColor: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: revoking === m.id ? 'not-allowed' : 'pointer' }}>
                {revoking === m.id ? '…' : 'Revoke'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
