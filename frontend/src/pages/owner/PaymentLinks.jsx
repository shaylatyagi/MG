// frontend/src/pages/owner/PaymentLinks.jsx
// Owner creates + manages payment links
import React, { useState, useEffect } from 'react';

const API = 'https://mg-qw5s.onrender.com';

const fmt = (n) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0
}).format(n);

const STATUS_BADGE = {
  PAID:       'bg-green-100 text-green-700',
  PROCESSING: 'bg-yellow-100 text-yellow-700',
  PENDING:    'bg-gray-100 text-gray-600',
  EXPIRED:    'bg-red-100 text-red-500',
};

export default function PaymentLinks({ token }) {
  const [links, setLinks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [copied, setCopied]         = useState(null);
  const [form, setForm]             = useState({ driver_name: '', driver_phone: '', amount: '', description: '' });
  const [creating, setCreating]     = useState(false);
  const [drivers, setDrivers]       = useState([]);

  const fetchLinks = () => {
    fetch(`${API}/api/payment-links`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setLinks(d.links); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchLinks();
    // fetch driver list for autocomplete
    fetch(`${API}/api/drivers/list`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.drivers) setDrivers(d.drivers); })
      .catch(() => {});
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/payment-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setLinks(prev => [data.link, ...prev]);
        setShowForm(false);
        setForm({ driver_name: '', driver_phone: '', amount: '', description: '' });
        // auto-copy
        navigator.clipboard.writeText(data.link.url).catch(() => {});
        setCopied(data.link.id);
        setTimeout(() => setCopied(null), 3000);
      } else alert(data.message || 'Failed to create link');
    } catch (err) { alert(err.message); }
    finally { setCreating(false); }
  };

  const copyUrl = (link) => {
    navigator.clipboard.writeText(link.url || `https://mg-xi.vercel.app/pay/${link.token}`)
      .then(() => { setCopied(link.id); setTimeout(() => setCopied(null), 2000); })
      .catch(() => alert('Copy failed — URL: ' + link.url));
  };

  const pickDriver = (driver) => {
    setForm(f => ({ ...f, driver_name: driver.full_name, driver_phone: driver.mobile_number }));
  };

  return (
    <div className="p-4 max-w-xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Payment Links</h2>
          <p className="text-xs text-gray-400">Send a payment link to any driver</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-[#0F4C81] text-white text-sm px-4 py-2 rounded-xl font-medium active:scale-95 transition">
          + New Link
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white border border-blue-100 rounded-2xl shadow-sm p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Create Payment Link</h3>
          <form onSubmit={create} className="space-y-3">

            {/* Driver quick-pick */}
            {drivers.length > 0 && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Select Driver (optional)</label>
                <div className="flex gap-2 flex-wrap">
                  {drivers.slice(0, 6).map(d => (
                    <button key={d.id} type="button"
                      onClick={() => pickDriver(d)}
                      className="text-xs bg-slate-100 hover:bg-blue-50 text-slate-700 px-2 py-1 rounded-lg transition">
                      {d.full_name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Driver Name</label>
                <input value={form.driver_name} onChange={e => setForm(f=>({...f,driver_name:e.target.value}))}
                  placeholder="Full Name" required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0F4C81]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone</label>
                <input value={form.driver_phone} onChange={e => setForm(f=>({...f,driver_phone:e.target.value}))}
                  placeholder="10 digits" maxLength={10} type="tel"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0F4C81]" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Amount (₹) *</label>
                <input value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))}
                  type="number" min="1" required placeholder="0"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0F4C81]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
                  placeholder="e.g. Rent June"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0F4C81]" />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={creating}
                className="flex-1 bg-[#0F4C81] text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
                {creating ? 'Creating…' : '🔗 Generate Link'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2.5 border rounded-xl text-sm text-gray-500">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Links List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-[#0F4C81] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🔗</p>
          <p className="text-gray-400 text-sm">No payment links yet. Create one above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map(link => (
            <div key={link.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 text-sm">{link.driver_name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[link.status] || STATUS_BADGE.PENDING}`}>
                      {link.status}
                    </span>
                  </div>
                  <p className="text-[#0F4C81] font-bold text-lg">{fmt(link.amount)}</p>
                  <p className="text-gray-400 text-xs truncate">{link.description}</p>
                  {link.driver_phone && <p className="text-gray-400 text-xs mt-0.5">📞 {link.driver_phone}</p>}
                  {link.paid_at && <p className="text-green-600 text-xs mt-0.5">✅ Paid {new Date(link.paid_at).toLocaleDateString('en-IN')}</p>}
                </div>
                <div className="ml-3 flex flex-col gap-1.5">
                  <button onClick={() => copyUrl(link)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                      copied===link.id ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-[#0F4C81]'
                    }`}>
                    {copied===link.id ? '✅ Copied!' : '📋 Copy Link'}
                  </button>
                  {link.driver_phone && (
                    <a href={`https://wa.me/91${link.driver_phone}?text=Hi! Please pay ₹${Math.round(link.amount)} using this link: ${link.url || `https://mg-xi.vercel.app/pay/${link.token}`}`}
                      target="_blank" rel="noreferrer"
                      className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 font-medium text-center hover:bg-green-100 transition">
                      📲 WhatsApp
                    </a>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-gray-300 mt-2 truncate">
                {link.url || `https://mg-xi.vercel.app/pay/${link.token}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
