// frontend/src/pages/admin/CompanyDashboard.jsx
// Exact replica of your CompanyDashboard.html

import React, { useState } from 'react';

const mockEcosystemPlatformDb = {
  metadataFilters: {
    overall: {
      today: { total: "₹45,82,90,120", received: "₹44,58,84,220", pending: "₹1,24,05,900", d_add: "140", d_tot: "16,240", d_act: "14,820", d_ina: "1,240", d_sus: "180", v_add: "85", v_tot: "18,500", v_act: "16,900", v_ina: "1,420", v_sus: "180" },
      yesterday: { total: "₹42,10,00,000", received: "₹41,90,00,000", pending: "₹20,00,000", d_add: "110", d_tot: "16,100", d_act: "14,710", d_ina: "1,210", d_sus: "180", v_add: "62", v_tot: "18,415", v_act: "16,815", v_ina: "1,420", v_sus: "180" },
      week: { total: "₹3,10,44,50,000", received: "₹2,99,50,00,000", pending: "₹10,94,50,000", d_add: "740", d_tot: "16,240", d_act: "14,820", d_ina: "1,240", d_sus: "180", v_add: "410", v_tot: "18,500", v_act: "16,900", v_ina: "1,420", v_sus: "180" },
      this_month: { total: "₹12,85,40,90,000", received: "₹12,50,00,00,000", pending: "₹35,40,90,000", d_add: "2,450", d_tot: "16,240", d_act: "14,820", d_ina: "1,240", d_sus: "180", v_add: "1,890", v_tot: "18,500", v_act: "16,900", v_ina: "1,420", v_sus: "180" },
      last_month: { total: "₹14,92,40,00,000", received: "₹14,92,40,00,000", pending: "₹0", d_add: "3,100", d_tot: "13,790", d_act: "12,600", d_ina: "1,010", d_sus: "180", v_add: "2,400", v_tot: "16,610", v_act: "15,200", v_ina: "1,230", v_sus: "180" },
      custom: { total: "₹2,14,50,880", received: "₹1,94,50,880", pending: "₹20,00,000", d_add: "12", d_tot: "14,900", d_act: "13,500", d_ina: "1,220", d_sus: "180", v_add: "9", v_tot: "15,100", v_act: "14,200", v_ina: "720", v_sus: "180" }
    },
    ecofleet: {
      today: { total: "₹28,40,50,000", received: "₹27,90,00,000", pending: "₹50,50,000", d_add: "90", d_tot: "9,400", d_act: "8,800", d_ina: "510", d_sus: "90", v_add: "50", v_tot: "11,200", v_act: "10,400", v_ina: "710", v_sus: "90" }
    },
    metrofleet: {
      today: { total: "₹17,42,40,120", received: "₹16,68,84,220", pending: "₹73,55,900", d_add: "50", d_tot: "6,840", d_act: "6,020", d_ina: "730", d_sus: "90", v_add: "35", v_tot: "7,300", v_act: "6,500", v_ina: "710", v_sus: "90" }
    }
  },
  tenants: [
    { name: "EcoFleet India Logistics Corp", cin: "U60231MH2021PTC361092", fleet: "120 Units", settlement: "T+1 Batched", status: "Operational" },
    { name: "Metro Fleet Rentals Private Ltd", cin: "U63090DL2019PTC345890", fleet: "85 Units", settlement: "T+2 Batched", status: "Operational" }
  ],
  subUsers: [
    { name: "Amitesh Roy", email: "amitesh@ecofleet.in", company: "EcoFleet India Logistics Corp" },
    { name: "Sanjay Dutt", email: "sanjay@metrofleet.com", company: "Metro Fleet Rentals Private Ltd" },
    { name: "Preeti Sharma", email: "preeti.s@metrofleet.com", company: "Metro Fleet Rentals Private Ltd" }
  ]
};

export default function CompanyDashboard() {
  const [activePanel, setActivePanel] = useState('admin-dash');
  const [timeHorizon, setTimeHorizon] = useState('today');
  const [tenantFilter, setTenantFilter] = useState('overall');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customDateStart, setCustomDateStart] = useState('2026-05-01');
  const [customDateEnd, setCustomDateEnd] = useState('2026-05-23');
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserCompany, setNewUserCompany] = useState('EcoFleet India Logistics Corp');
  const [tenants, setTenants] = useState(mockEcosystemPlatformDb.tenants);
  const [subUsers, setSubUsers] = useState(mockEcosystemPlatformDb.subUsers);
  const [auditLogs, setAuditLogs] = useState([
    "[2026-05-23T00:01:14Z] SEC-AUTH: System Administrator 'SA-01' successfully authenticated",
    "[2026-05-23T00:05:00Z] CRON-BILLING: Daily rental billing run initialized",
    "[2026-05-23T00:05:44Z] LEDGER-DEBIT: Appended rental ledger charge row"
  ]);
  const [kycResolved, setKycResolved] = useState(false);

  const currentData = mockEcosystemPlatformDb.metadataFilters[tenantFilter][timeHorizon];

  const addAuditLog = (text) => {
    const ts = new Date().toISOString();
    setAuditLogs(prev => [`[${ts}] ${text}`, ...prev]);
  };

  const handleTimeHorizonChange = (value) => {
    setTimeHorizon(value);
    setShowCustomDate(value === 'custom');
  };

  const triggerCustomDateMetricsEngine = () => {
    setTimeHorizon('custom');
    addAuditLog(`Custom range metrics compiled for ${customDateStart} to ${customDateEnd}`);
  };

  const approveUserAllocation = (ticketId, company, name, email) => {
    setSubUsers([...subUsers, { name, email, company }]);
    addAuditLog(`Approved user ${name} for ${company}`);
    alert(`User ${name} provisioned successfully`);
  };

  const denyUserAllocation = (ticketId, company) => {
    addAuditLog(`Rejected user request for ${company}`);
  };

  const purgeCorporateSubUser = (rowId, userName) => {
    if (window.confirm(`Revoke access for ${userName}?`)) {
      setSubUsers(subUsers.filter(u => u.name !== userName));
      addAuditLog(`Revoked access for ${userName}`);
    }
  };

  const handleManualSubUserInstantiation = (e) => {
    e.preventDefault();
    setSubUsers([...subUsers, { name: newUserName, email: newUserEmail, company: newUserCompany }]);
    addAuditLog(`Manually created user ${newUserName}`);
    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserEmail('');
    alert(`User ${newUserName} created`);
  };

  const handleNewTenantSubmit = (e) => {
    e.preventDefault();
    setTenants([...tenants, { name: newTenantName, cin: "Pending", fleet: "0 Units", settlement: "T+1", status: "Initializing" }]);
    addAuditLog(`New tenant registered: ${newTenantName}`);
    setShowAddTenantModal(false);
    setNewTenantName('');
    alert(`Tenant ${newTenantName} created`);
  };

  const processKycAction = (mode) => {
    setKycResolved(true);
    addAuditLog(`KYC case-9082 ${mode}`);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-row bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col text-slate-400 shrink-0 h-full">
        <div className="p-5 border-b border-slate-900 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg">MG</div>
          <div><h1 className="text-white font-bold text-sm">MobilityGrid</h1><span className="text-[10px] text-slate-500 font-semibold uppercase">HQ Governance Center</span></div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-xs font-medium">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-600 px-3 pt-2 pb-1">Core Operations</div>
          <button onClick={() => setActivePanel('admin-dash')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg ${activePanel === 'admin-dash' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><span className="flex items-center gap-2.5">📊 Command Dashboard</span></button>
          <button onClick={() => setActivePanel('admin-tenants')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg ${activePanel === 'admin-tenants' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><span className="flex items-center gap-2.5">🏢 Client Tenant Companies</span><span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{tenants.length}</span></button>
          <button onClick={() => setActivePanel('admin-users')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg ${activePanel === 'admin-users' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><span className="flex items-center gap-2.5">👥 Users & Provisioning</span></button>
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-600 px-3 pt-4 pb-1">Financial Rails</div>
          <button onClick={() => setActivePanel('admin-finance')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg ${activePanel === 'admin-finance' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><span className="flex items-center gap-2.5">🏦 Financial Monitoring</span></button>
          <button onClick={() => setActivePanel('admin-settlements')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg ${activePanel === 'admin-settlements' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><span className="flex items-center gap-2.5">🔄 Node Settlements</span></button>
          <button onClick={() => setActivePanel('admin-wallets')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg ${activePanel === 'admin-wallets' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><span className="flex items-center gap-2.5">👛 Wallet Supervision</span></button>
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-600 px-3 pt-4 pb-1">Risk & Security</div>
          <button onClick={() => setActivePanel('admin-kyc')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg ${activePanel === 'admin-kyc' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><span className="flex items-center gap-2.5">🔍 KYC Compliance Desk</span>{!kycResolved && <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded text-[9px] animate-pulse">1 Pending</span>}</button>
          <button onClick={() => setActivePanel('admin-audit')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg ${activePanel === 'admin-audit' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><span className="flex items-center gap-2.5">🛡️ System Audit Logs</span></button>
        </nav>
        <div className="p-4 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Core Node Live</span><span className="font-mono">v2.6.5</span></div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3"><span className="text-xs font-semibold text-slate-400">HQ Governance Platform</span><span>→</span><span className="text-xs font-bold text-slate-700">Command Dashboard</span></div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 p-1 rounded-lg">
              <label className="text-[10px] font-bold text-slate-400 uppercase px-1.5">Tenant Filter:</label>
              <select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)} className="bg-white border border-slate-200 text-xs font-bold px-2 py-1 rounded outline-none">
                <option value="overall">Overall Platform</option>
                <option value="ecofleet">EcoFleet India</option>
                <option value="metrofleet">Metro Fleet</option>
              </select>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200 text-xs font-bold">SA</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-[1400px] w-full mx-auto">
          {activePanel === 'admin-dash' && (
            <div className="space-y-6">
              <div className="bg-white border p-4 rounded-xl flex justify-between items-center"><div><h2 className="text-base font-bold">Platform Infrastructure Overwatch Matrix</h2><p className="text-xs text-slate-400">Real-time macro-level data</p></div><select value={timeHorizon} onChange={(e) => handleTimeHorizonChange(e.target.value)} className="bg-slate-50 border rounded-lg text-xs font-bold p-2"><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="week">Last 7 Days</option><option value="this_month">This Month</option><option value="last_month">Last Month</option><option value="custom">Custom Range</option></select></div>
              {showCustomDate && <div className="flex gap-2 items-center bg-white p-3 rounded-xl"><input type="date" value={customDateStart} onChange={(e) => setCustomDateStart(e.target.value)} className="border rounded p-1"/><span>to</span><input type="date" value={customDateEnd} onChange={(e) => setCustomDateEnd(e.target.value)} className="border rounded p-1"/><button onClick={triggerCustomDateMetricsEngine} className="bg-slate-900 text-white px-3 py-1 rounded">Apply</button></div>}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border"><div className="flex justify-between"><span className="text-[11px] font-bold uppercase">Gross Volume</span><span>📊</span></div><div className="text-xl font-black mt-2">{currentData.total}</div></div>
                <div className="bg-white p-4 rounded-xl border"><div className="flex justify-between"><span className="text-[11px] font-bold uppercase">Net Received</span><span>✅</span></div><div className="text-xl font-black text-green-600 mt-2">{currentData.received}</div></div>
                <div className="bg-white p-4 rounded-xl border"><div className="flex justify-between"><span className="text-[11px] font-bold uppercase">Outstanding</span><span>⏰</span></div><div className="text-xl font-black text-orange-600 mt-2">{currentData.pending}</div></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border"><div className="flex justify-between border-b pb-2"><span className="text-xs font-bold">👥 Operating Drivers</span><span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded">Live Registry</span></div><div className="grid grid-cols-5 gap-2 text-center mt-3"><div className="bg-slate-50 p-2 rounded"><span className="text-[10px] text-slate-400 block">Added</span><b>{currentData.d_add}</b></div><div className="bg-blue-50 p-2 rounded"><span className="text-[10px] text-blue-600 block">Total</span><b className="text-blue-700">{currentData.d_tot}</b></div><div className="bg-emerald-50 p-2 rounded"><span className="text-[10px] text-emerald-600 block">Active</span><b className="text-emerald-700">{currentData.d_act}</b></div><div className="bg-amber-50 p-2 rounded"><span className="text-[10px] text-amber-600 block">Inactive</span><b className="text-amber-700">{currentData.d_ina}</b></div><div className="bg-rose-50 p-2 rounded"><span className="text-[10px] text-rose-600 block">Suspended</span><b className="text-rose-700">{currentData.d_sus}</b></div></div></div>
                <div className="bg-white p-4 rounded-xl border"><div className="flex justify-between border-b pb-2"><span className="text-xs font-bold">🚚 Corporate Vehicles</span><span className="bg-purple-50 text-purple-600 text-[10px] px-2 py-0.5 rounded">Telemetry Active</span></div><div className="grid grid-cols-5 gap-2 text-center mt-3"><div className="bg-slate-50 p-2 rounded"><span className="text-[10px] text-slate-400 block">Added</span><b>{currentData.v_add}</b></div><div className="bg-purple-50 p-2 rounded"><span className="text-[10px] text-purple-600 block">Total</span><b className="text-purple-700">{currentData.v_tot}</b></div><div className="bg-emerald-50 p-2 rounded"><span className="text-[10px] text-emerald-600 block">Active</span><b className="text-emerald-700">{currentData.v_act}</b></div><div className="bg-amber-50 p-2 rounded"><span className="text-[10px] text-amber-600 block">Inactive</span><b className="text-amber-700">{currentData.v_ina}</b></div><div className="bg-rose-50 p-2 rounded"><span className="text-[10px] text-rose-600 block">Suspended</span><b className="text-rose-700">{currentData.v_sus}</b></div></div></div>
              </div>

              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="p-4 border-b bg-slate-50/50 flex justify-between"><h3 className="text-xs font-bold uppercase">Transaction Stream</h3><span className="text-[10px] text-emerald-600 flex items-center gap-1"><span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span> Live</span></div>
                <table className="w-full text-left text-xs"><thead><tr className="bg-slate-50 border-b"><th className="p-3">ID</th><th className="p-3">Time</th><th className="p-3">Tenant</th><th className="p-3 text-right">Volume</th><th className="p-3">Status</th></tr></thead><tbody><tr className="border-b"><td className="p-3 font-mono">TXN-4401</td><td>23-05-2026 12:09</td><td>EcoFleet</td><td className="text-right text-green-600">+₹3,50,000</td><td><span className="px-2 py-0.5 bg-emerald-50 rounded-full">Cleared</span></td></tr><tr><td className="p-3 font-mono">TXN-4402</td><td>23-05-2026 12:11</td><td>Metro Fleet</td><td className="text-right text-green-600">+₹85,000</td><td><span className="px-2 py-0.5 bg-emerald-50 rounded-full">Cleared</span></td></tr></tbody></table>
              </div>
            </div>
          )}

          {activePanel === 'admin-tenants' && (
            <div><div className="flex justify-between border-b pb-4"><div><h2 className="text-base font-bold">Enterprise Tenants</h2><p className="text-xs text-slate-500">Corporate client entities</p></div><button onClick={() => setShowAddTenantModal(true)} className="bg-blue-600 text-white text-xs px-3 py-2 rounded-lg">➕ Register Tenant</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">{tenants.map((t,i)=>(
              <div key={i} className="bg-white border rounded-xl p-4"><div className="flex justify-between"><div><h3 className="font-bold">{t.name}</h3><span className="text-[10px] text-slate-400">{t.cin}</span></div><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded-full">{t.status}</span></div><div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t"><div><span className="text-slate-400 text-[10px]">Fleet</span><b>{t.fleet}</b></div><div><span className="text-slate-400 text-[10px]">Settlement</span><b>{t.settlement}</b></div></div></div>))}</div></div>
          )}

          {activePanel === 'admin-users' && (
            <div><div className="flex justify-between border-b pb-4"><div><h2 className="text-base font-bold">User Provisioning</h2><p className="text-xs text-slate-500">Manage sub-users</p></div><button onClick={() => setShowAddUserModal(true)} className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg">👤+ Create User</button></div>
            <div className="bg-white border rounded-xl mt-4 overflow-hidden"><table className="w-full text-left text-xs"><thead><tr className="bg-slate-50 border-b"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Company</th><th className="p-3 text-center">Action</th></tr></thead><tbody>{subUsers.map((u,i)=>(
              <tr key={i} className="border-b"><td className="p-3 font-bold">{u.name}</td><td className="p-3 text-slate-500">{u.email}</td><td className="p-3 text-blue-600">{u.company}</td><td className="p-3 text-center"><button onClick={() => purgeCorporateSubUser(`row-${i}`, u.name)} className="text-red-600 text-[11px] font-bold">Revoke</button></td></tr>))}</tbody></table></div></div>
          )}

          {activePanel === 'admin-finance' && (<div><h2 className="text-base font-bold">Financial Summary</h2><div className="grid grid-cols-3 gap-4 mt-4"><div className="bg-white p-4 rounded-xl border"><span className="text-[11px] text-slate-400">Total Float</span><div className="text-xl font-bold">₹8,92,40,150</div></div><div className="bg-white p-4 rounded-xl border"><span className="text-[11px] text-slate-400">Platform Fees</span><div className="text-xl font-bold text-green-600">₹42,10,230</div></div><div className="bg-white p-4 rounded-xl border"><span className="text-[11px] text-slate-400">Success Rate</span><div className="text-xl font-bold">99.94%</div></div></div></div>)}

          {activePanel === 'admin-settlements' && (<div><h2 className="text-base font-bold">Settlements</h2><div className="bg-white border rounded-xl mt-4 overflow-hidden"><table className="w-full text-left text-xs"><thead><tr className="bg-slate-50 border-b"><th className="p-3">Batch</th><th className="p-3">Tenant</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th></tr></thead><tbody><tr><td className="p-3 font-mono">SET-B8921</td><td>EcoFleet</td><td className="text-right">₹14,50,000</td><td><span className="px-2 py-0.5 bg-slate-100 rounded-full">Disbursed</span></td></tr><tr><td className="p-3 font-mono">SET-B8922</td><td>Metro Fleet</td><td className="text-right">₹4,20,500</td><td><span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">Processing</span></td></tr></tbody></table></div></div>)}

          {activePanel === 'admin-wallets' && (<div className="bg-white border rounded-xl p-12 text-center text-slate-400"><span>👛</span> All wallets are healthy. No anomalies reported.</div>)}

          {activePanel === 'admin-kyc' && !kycResolved && (
            <div><div className="border-b pb-3"><h2 className="text-base font-bold">KYC Desk</h2></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4"><div className="lg:col-span-1 bg-white border rounded-xl p-4"><h3 className="text-xs font-bold">Pending Approvals</h3><div className="p-3 border border-orange-200 bg-orange-50/20 rounded-xl mt-3 flex gap-3"><div className="w-2 h-2 rounded-full bg-orange-600 animate-ping mt-1"></div><div><div className="font-bold">Vijay Singh</div><p className="text-[11px] text-slate-500">Case: KYC-9082 • DL Verification</p></div></div></div>
            <div className="lg:col-span-2 bg-white border rounded-xl p-5"><div className="flex justify-between border-b pb-2"><h4 className="font-bold">Case-9082: License Verification</h4><span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded">OCR Flag</span></div><div className="bg-slate-100 rounded-xl min-h-[150px] flex items-center justify-center my-4"><span>📄 License Document Preview</span></div><div className="flex justify-end gap-2"><button onClick={() => processKycAction('Rejected')} className="bg-slate-100 px-4 py-2 rounded-lg">Reject</button><button onClick={() => processKycAction('Approved')} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Approve</button></div></div></div></div>
          )}
          {activePanel === 'admin-kyc' && kycResolved && (<div className="bg-white border rounded-xl p-12 text-center text-slate-400">✅ All KYC cases cleared</div>)}

          {activePanel === 'admin-audit' && (<div><h2 className="text-base font-bold">Audit Logs</h2><div className="bg-slate-950 rounded-xl mt-4 overflow-hidden"><div className="p-3 bg-slate-900 text-white border-b"><span className="font-bold">Live Log Stream</span></div><div className="p-4 space-y-2 text-emerald-400 text-xs font-mono max-h-[400px] overflow-y-auto">{auditLogs.map((log,i)=><div key={i}>{log}</div>)}</div></div></div>)}
        </div>
      </div>

      {/* Modals */}
      {showAddTenantModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center"><div className="bg-white rounded-xl w-full max-w-lg"><div className="p-4 border-b flex justify-between"><h3 className="font-bold">New Tenant</h3><button onClick={() => setShowAddTenantModal(false)}>✕</button></div><form onSubmit={handleNewTenantSubmit} className="p-5"><input type="text" placeholder="Company Name" value={newTenantName} onChange={(e)=>setNewTenantName(e.target.value)} className="w-full border rounded-lg p-2 mb-4" required /><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowAddTenantModal(false)} className="px-4 py-2 bg-slate-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Create</button></div></form></div></div>
      )}

      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center"><div className="bg-white rounded-xl w-full max-w-md"><div className="p-4 border-b flex justify-between"><h3 className="font-bold">New User</h3><button onClick={() => setShowAddUserModal(false)}>✕</button></div><form onSubmit={handleManualSubUserInstantiation} className="p-5 space-y-3"><select value={newUserCompany} onChange={(e)=>setNewUserCompany(e.target.value)} className="w-full border rounded-lg p-2"><option>EcoFleet India Logistics Corp</option><option>Metro Fleet Rentals Private Ltd</option></select><input type="text" placeholder="Full Name" value={newUserName} onChange={(e)=>setNewUserName(e.target.value)} className="w-full border rounded-lg p-2" required /><input type="email" placeholder="Email" value={newUserEmail} onChange={(e)=>setNewUserEmail(e.target.value)} className="w-full border rounded-lg p-2" required /><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowAddUserModal(false)} className="px-4 py-2 bg-slate-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Create</button></div></form></div></div>
      )}
    </div>
  );
}