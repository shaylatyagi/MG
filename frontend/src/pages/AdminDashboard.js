import React, { useState, useEffect } from 'react';

const AdminDashboard = () => {
  const [tenants, setTenants] = useState([]);
  const [companyName, setCompanyName] = useState('');

  // 1. Fetch all companies (Tenants)
  useEffect(() => {
    fetch('/api/admin/tenants')
      .then(res => res.json())
      .then(data => setTenants(data))
      .catch(err => console.error("Error:", err));
  }, []);

  // 2. Register new company
  const handleRegister = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/admin/register-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName, legalName: companyName, gstNumber: 'NA' })
    });
    if(res.ok) alert("Company registered!");
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Platform Admin Console</h2>
      
      {/* Registration Form */}
      <form onSubmit={handleRegister} className="bg-white p-6 rounded-lg shadow mb-8">
        <input 
          className="border p-2 mr-2"
          placeholder="Company Name" 
          onChange={(e) => setCompanyName(e.target.value)} 
        />
        <button type="submit" className="bg-blue-600 text-white p-2 rounded">Register Tenant</button>
      </form>

      {/* List of Tenants */}
      <div className="grid grid-cols-3 gap-4">
        {tenants.map(t => (
          <div key={t.id} className="p-4 border rounded shadow">
            <h3 className="font-bold">{t.company_name}</h3>
            <p className="text-sm text-slate-500">Code: {t.company_code}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;