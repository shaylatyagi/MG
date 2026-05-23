import React, { useState, useEffect } from 'react';

const AdminDashboard = () => {
  const [tenants, setTenants] = useState([]);
  const [formData, setFormData] = useState({ companyName: '', legalName: '', gstNumber: '' });

  // Load Tenants from Database
  useEffect(() => {
    fetch('/api/admin/tenants')
      .then(res => res.json())
      .then(data => setTenants(data))
      .catch(err => console.error("Error loading tenants:", err));
  }, []);

  // Handle New Registration
  const handleRegister = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/admin/register-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if(res.ok) {
        alert("Company Registered Successfully!");
        window.location.reload(); // Refresh to show new data
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">MobilityGrid Admin Console</h2>
      
      {/* Registration UI - Yahi Papa ko dikhana h */}
      <form onSubmit={handleRegister} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8 grid grid-cols-3 gap-4">
        <input className="border p-2 rounded" placeholder="Company Name" onChange={(e) => setFormData({...formData, companyName: e.target.value})} />
        <input className="border p-2 rounded" placeholder="Legal Name" onChange={(e) => setFormData({...formData, legalName: e.target.value})} />
        <button type="submit" className="bg-blue-600 text-white rounded font-bold">Register Tenant Entity</button>
      </form>

      {/* Tenant List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tenants.map(t => (
          <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900">{t.company_name}</h3>
            <p className="text-[10px] font-mono text-slate-400">Code: {t.company_code}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;