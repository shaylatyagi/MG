import React, { useState, useEffect } from 'react';

// Mock Data - Exact same as HTML
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
      today: { total: "₹28,40,50,000", received: "₹27,90,00,000", pending: "₹50,50,000", d_add: "90", d_tot: "9,400", d_act: "8,800", d_ina: "510", d_sus: "90", v_add: "50", v_tot: "11,200", v_act: "10,400", v_ina: "710", v_sus: "90" },
      yesterday: { total: "₹26,10,00,000", received: "₹25,80,00,000", pending: "₹30,00,000", d_add: "75", d_tot: "9,310", d_act: "8,710", d_ina: "510", d_sus: "90", v_add: "41", v_tot: "11,150", v_act: "10,350", v_ina: "710", v_sus: "90" },
      week: { total: "₹1,95,10,00,000", received: "₹1,90,20,00,000", pending: "₹4,90,00,000", d_add: "480", d_tot: "9,400", d_act: "8,800", d_ina: "510", d_sus: "90", v_add: "240", v_tot: "11,200", v_act: "10,400", v_ina: "710", v_sus: "90" },
      this_month: { total: "₹7,85,40,00,000", received: "₹7,70,00,00,000", pending: "₹15,40,00,000", d_add: "1,200", d_tot: "9,400", d_act: "8,800", d_ina: "510", d_sus: "90", v_add: "940", v_tot: "11,200", v_act: "10,400", v_ina: "710", v_sus: "90" },
      last_month: { total: "₹9,10,20,00,000", received: "₹9,10,20,00,000", pending: "₹0", d_add: "1,600", d_tot: "8,200", d_act: "7,600", d_ina: "510", d_sus: "90", v_add: "1,200", v_tot: "10,260", v_act: "9,460", v_ina: "710", v_sus: "90" },
      custom: { total: "₹1,12,40,000", received: "₹92,40,000", pending: "₹20,00,000", d_add: "7", d_tot: "7,400", d_act: "6,900", d_ina: "410", d_sus: "90", v_add: "4", v_tot: "8,100", v_act: "7,500", v_ina: "510", v_sus: "90" }
    },
    metrofleet: {
      today: { total: "₹17,42,40,120", received: "₹16,68,84,220", pending: "₹73,55,900", d_add: "50", d_tot: "6,840", d_act: "6,020", d_ina: "730", d_sus: "90", v_add: "35", v_tot: "7,300", v_act: "6,500", v_ina: "710", v_sus: "90" },
      yesterday: { total: "₹16,00,00,000", received: "₹16,10,00,000", pending: "₹-10,00,000", d_add: "35", d_tot: "6,790", d_act: "6,000", d_ina: "700", d_sus: "90", v_add: "21", v_tot: "7,265", v_act: "6,465", v_ina: "710", v_sus: "90" },
      week: { total: "₹1,15,34,50,000", received: "₹1,09,28,00,000", pending: "₹6,06,50,000", d_add: "260", d_tot: "6,840", d_act: "6,020", d_ina: "730", d_sus: "90", v_add: "170", v_tot: "7,300", v_act: "6,500", v_ina: "710", v_sus: "90" },
      this_month: { total: "₹5,00,00,90,000", received: "₹4,80,00,00,000", pending: "₹20,00,90,000", d_add: "1,250", d_tot: "6,840", d_act: "6,020", d_ina: "730", d_sus: "90", v_add: "950", v_tot: "7,300", v_act: "6,500", v_ina: "710", v_sus: "90" },
      last_month: { total: "₹5,82,20,00,000", received: "₹5,82,20,00,000", pending: "₹0", d_add: "1,500", d_tot: "5,590", d_act: "5,000", d_ina: "500", d_sus: "90", v_add: "1,200", v_tot: "6,350", v_act: "5,740", v_ina: "520", v_sus: "90" },
      custom: { total: "₹1,02,10,880", received: "₹1,02,10,880", pending: "₹0", d_add: "5", d_tot: "5,200", d_act: "4,800", d_ina: "310", d_sus: "90", v_add: "5", v_tot: "5,400", v_act: "4,900", v_ina: "410", v_sus: "90" }
    }
  },
  tenants: [
    { name: "EcoFleet India Logistics Corp", cin: "U60231MH2021PTC361092", fleet: "120 Active Units", settlement: "T+1 Batched Cycle", status: "Operational" },
    { name: "Metro Fleet Rentals Private Ltd", cin: "U63090DL2019PTC345890", fleet: "85 Active Units", settlement: "T+2 Batched Cycle", status: "Operational" }
  ],
  subUsers: [
    { name: "Amitesh Roy", email: "amitesh@ecofleet.in", company: "EcoFleet India Logistics Corp" },
    { name: "Sanjay Dutt", email: "sanjay@metrofleet.com", company: "Metro Fleet Rentals Private Ltd" },
    { name: "Preeti Sharma", email: "preeti.s@metrofleet.com", company: "Metro Fleet Rentals Private Ltd" }
  ]
};

export default function AdminDashboard() {
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
    "[2026-05-23T00:01:14Z] SEC-AUTH: System Administrator 'SA-01' successfully authenticated from IP footprint 103.44.22.105",
    "[2026-05-23T00:05:00Z] CRON-BILLING: Daily rental billing run initialized successfully across 12 distinct tenant client scopes.",
    "[2026-05-23T00:05:44Z] LEDGER-DEBIT: Appended rental ledger charge row to 14,820 active driver asset account systems.",
    "[2026-05-23T12:33:02Z] RISK-KYC: Standby manual event monitoring queue context loaded. Awaiting administrator evaluation signal."
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
    addAuditLog(`FINOPS: Custom range metrics compiled from calendar indices ${customDateStart} to ${customDateEnd}.`);
  };

  const approveUserAllocation = (ticketId, company, name, email) => {
    setSubUsers([...subUsers, { name, email, company }]);
    addAuditLog(`USER-MGMT: Approved tenant authorization request. Token mapped to '${name}' under '${company}'.`);
    alert(`Provisioning Completed. Multi-user security profile instantiated for ${name}.`);
  };

  const denyUserAllocation = (ticketId, company) => {
    addAuditLog(`USER-MGMT: Rejected sub-user provisioning request token for ${company} operations staff.`);
  };

  const purgeCorporateSubUser = (rowId, userName) => {
    if (window.confirm(`Revoke system authentication access token for user '${userName}' permanently?`)){
      setSubUsers(subUsers.filter(u => u.name !== userName));
      addAuditLog(`USER-MGMT: Revoked credential token context for profile: '${userName}'. Access restricted.`);
    }
  };

  const handleManualSubUserInstantiation = (e) => {
    e.preventDefault();
    setSubUsers([...subUsers, { name: newUserName, email: newUserEmail, company: newUserCompany }]);
    addAuditLog(`USER-MGMT: Manually initialized identity profile token for operator ${newUserName} under scope ${newUserCompany}.`);
    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserEmail('');
    alert(`Sub-user credentials successfully generated inside infrastructure registry.`);
  };

  const handleNewTenantSubmit = (e) => {
    e.preventDefault();
    setTenants([...tenants, { name: newTenantName, cin: "Pending Assignment", fleet: "0 Units", settlement: "T+1 Rolling", status: "Initializing" }]);
    addAuditLog(`TENANT-INIT: Registered new enterprise tenant entity instance '${newTenantName}' successfully.`);
    setShowAddTenantModal(false);
    setNewTenantName('');
    alert(`Corporate Tenant profile initialized inside secure multi-tenant network layer.`);
  };

  const processKycAction = (mode) => {
    setKycResolved(true);
    if (mode === 'Approved') {
      addAuditLog(`RISK-KYC: Manual intervention overrule recorded. Verification approval tokens issued to Case-9082.`);
    } else {
      addAuditLog(`RISK-KYC: Compliance team rejected asset document container Case-9082. Re-verification loop initiated.`);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-row bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col text-slate-400 shrink-0 h-full">
        <div className="p-5 border-b border-slate-900 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg">MG</div>
          <div>
            <h1 className="text-white font-bold text-sm">MobilityGrid</h1>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">HQ Governance Center</span>
          </div>
        </div>
        
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-xs font-medium">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-600 px-3 pt-2 pb-1">Core Operations</div>
          <button onClick={() => setActivePanel('admin-dash')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${activePanel === 'admin-dash' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <span className="flex items-center gap-2.5"><span>📊</span> Command Dashboard</span>
          </button>
          <button onClick={() => setActivePanel('admin-tenants')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${activePanel === 'admin-tenants' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <span className="flex items-center gap-2.5"><span>🏢</span> Client Tenant Companies</span>
            <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">{tenants.length}</span>
          </button>
          <button onClick={() => setActivePanel('admin-users')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${activePanel === 'admin-users' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <span className="flex items-center gap-2.5"><span>👥</span> Users & Provisioning</span>
          </button>

          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-600 px-3 pt-4 pb-1">Financial Rails</div>
          <button onClick={() => setActivePanel('admin-finance')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg ${activePanel === 'admin-finance' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <span className="flex items-center gap-2.5"><span>🏦</span> Financial Monitoring</span>
          </button>
          <button onClick={() => setActivePanel('admin-settlements')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg ${activePanel === 'admin-settlements' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <span className="flex items-center gap-2.5"><span>🔄</span> Node Settlements</span>
          </button>
          <button onClick={() => setActivePanel('admin-wallets')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg ${activePanel === 'admin-wallets' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <span className="flex items-center gap-2.5"><span>👛</span> Wallet Supervision</span>
          </button>

          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-600 px-3 pt-4 pb-1">Risk & Security</div>
          <button onClick={() => setActivePanel('admin-kyc')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg ${activePanel === 'admin-kyc' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <span className="flex items-center gap-2.5"><span>🔍</span> KYC Compliance Desk</span>
            {!kycResolved && <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded text-[9px] animate-pulse">1 Pending</span>}
          </button>
          <button onClick={() => setActivePanel('admin-audit')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg ${activePanel === 'admin-audit' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <span className="flex items-center gap-2.5"><span>🛡️</span> System Audit Logs</span>
          </button>
        </nav>
        <div className="p-4 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Core Node Live</span>
          <span className="font-mono">v2.6.5</span>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">HQ Governance Platform</span>
            <span>→</span>
            <span className="text-xs font-bold text-slate-700">
              {activePanel === 'admin-dash' && 'Command Dashboard Overviews'}
              {activePanel === 'admin-tenants' && 'Client Tenant Companies'}
              {activePanel === 'admin-users' && 'Users & Multi-User Allocation'}
              {activePanel === 'admin-finance' && 'Financial Monitoring Rails'}
              {activePanel === 'admin-settlements' && 'Node Settlements Portal'}
              {activePanel === 'admin-wallets' && 'Wallet Supervision Desk'}
              {activePanel === 'admin-kyc' && 'KYC Compliance Desk'}
              {activePanel === 'admin-audit' && 'System Audit Logs'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 p-1 rounded-lg">
              <label className="text-[10px] font-bold text-slate-400 uppercase px-1.5">Tenant View Filter:</label>
              <select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)} className="bg-white border border-slate-200 text-xs font-bold px-2 py-1 rounded outline-none cursor-pointer">
                <option value="overall">Overall Platform Network Scope</option>
                <option value="ecofleet">EcoFleet India Logistics Corp</option>
                <option value="metrofleet">Metro Fleet Rentals Private Ltd</option>
              </select>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200 text-xs font-bold">SA</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-[1400px] w-full mx-auto">
          
          {/* Dashboard Panel */}
          {activePanel === 'admin-dash' && (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Platform Infrastructure Overwatch Matrix</h2>
                  <p className="text-xs text-slate-400">Real-time macro-level data segmentation across isolated corporate tenant vectors.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={timeHorizon} onChange={(e) => handleTimeHorizonChange(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold p-2 outline-none cursor-pointer">
                    <option value="today">Today (Live Stream)</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="week">Last 7 Calendar Days</option>
                    <option value="this_month">This Month Horizon</option>
                    <option value="last_month">Last Month Horizon</option>
                    <option value="custom">Custom Date Range Selection...</option>
                  </select>
                  {showCustomDate && (
                    <div className="flex items-center gap-1.5">
                      <input type="date" value={customDateStart} onChange={(e) => setCustomDateStart(e.target.value)} className="border border-slate-200 rounded-lg p-1.5 text-xs font-mono bg-slate-50" />
                      <span className="text-slate-400 text-xs">to</span>
                      <input type="date" value={customDateEnd} onChange={(e) => setCustomDateEnd(e.target.value)} className="border border-slate-200 rounded-lg p-1.5 text-xs font-mono bg-slate-50" />
                      <button onClick={triggerCustomDateMetricsEngine} className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg">Apply</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border shadow-sm"><div className="flex justify-between text-slate-400"><span className="text-[11px] font-bold uppercase">Gross Collective Pipeline Volume</span><span>📊</span></div><div className="text-xl font-black text-slate-900 mt-2">{currentData.total}</div></div>
                <div className="bg-white p-4 rounded-xl border shadow-sm"><div className="flex justify-between text-slate-400"><span className="text-[11px] font-bold uppercase">Net Settled Received Volumes</span><span>✅</span></div><div className="text-xl font-black text-green-600 mt-2">{currentData.received}</div></div>
                <div className="bg-white p-4 rounded-xl border shadow-sm"><div className="flex justify-between text-slate-400"><span className="text-[11px] font-bold uppercase">Outstanding Balances</span><span>⏰</span></div><div className="text-xl font-black text-orange-600 mt-2">{currentData.pending}</div></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                  <div className="flex justify-between border-b pb-2"><span className="text-xs font-bold flex items-center gap-1.5"><span>👥</span> Operating Drivers Distribution Stack</span><span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded">Live Node Registry</span></div>
                  <div className="grid grid-cols-5 gap-2 text-center mt-3">
                    <div className="bg-slate-50 p-2 rounded-xl"><span className="text-[10px] text-slate-400 block">Added</span><b className="text-base">{currentData.d_add}</b></div>
                    <div className="bg-blue-50/60 p-2 rounded-xl"><span className="text-[10px] text-blue-600 block">Total</span><b className="text-base text-blue-700">{currentData.d_tot}</b></div>
                    <div className="bg-emerald-50/60 p-2 rounded-xl"><span className="text-[10px] text-emerald-600 block">Active</span><b className="text-base text-emerald-700">{currentData.d_act}</b></div>
                    <div className="bg-amber-50/60 p-2 rounded-xl"><span className="text-[10px] text-amber-600 block">Inactive</span><b className="text-base text-amber-700">{currentData.d_ina}</b></div>
                    <div className="bg-rose-50/60 p-2 rounded-xl"><span className="text-[10px] text-rose-600 block">Suspended</span><b className="text-base text-rose-700">{currentData.d_sus}</b></div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                  <div className="flex justify-between border-b pb-2"><span className="text-xs font-bold flex items-center gap-1.5"><span>🚚</span> Corporate Vehicles Asset Fleet Mapping</span><span className="bg-purple-50 text-purple-600 text-[10px] px-2 py-0.5 rounded">Telemetry Active</span></div>
                  <div className="grid grid-cols-5 gap-2 text-center mt-3">
                    <div className="bg-slate-50 p-2 rounded-xl"><span className="text-[10px] text-slate-400 block">Added</span><b className="text-base">{currentData.v_add}</b></div>
                    <div className="bg-purple-50 p-2 rounded-xl"><span className="text-[10px] text-purple-600 block">Total</span><b className="text-base text-purple-700">{currentData.v_tot}</b></div>
                    <div className="bg-emerald-50/60 p-2 rounded-xl"><span className="text-[10px] text-emerald-600 block">Active</span><b className="text-base text-emerald-700">{currentData.v_act}</b></div>
                    <div className="bg-amber-50/60 p-2 rounded-xl"><span className="text-[10px] text-amber-600 block">Inactive</span><b className="text-base text-amber-700">{currentData.v_ina}</b></div>
                    <div className="bg-rose-50/60 p-2 rounded-xl"><span className="text-[10px] text-rose-600 block">Suspended</span><b className="text-base text-rose-700">{currentData.v_sus}</b></div>
                  </div>
                </div>
              </div>

              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="p-4 border-b bg-slate-50/50 flex justify-between"><h3 className="text-xs font-bold uppercase">Ecosystem Global Transaction Stream</h3><span className="flex items-center gap-1.5 text-[10px] text-emerald-600"><span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span> Real-time Ledgers Loaded</span></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-slate-50 text-slate-500 border-b text-[10px]"><th className="p-3 pl-5">Transaction ID</th><th className="p-3">Timestamp</th><th className="p-3">Tenant</th><th className="p-3 text-right">Volume</th><th className="p-3">Status</th><th className="p-3 text-center">Action</th></tr></thead>
                    <tbody>
                      <tr className="hover:bg-slate-50/70"><td className="p-3 pl-5 font-mono">TXN-4401-2026</td><td className="text-slate-400">23-05-2026 12:09:11</td><td className="font-semibold">EcoFleet India Logistics Corp</td><td className="text-right text-green-600">+₹3,50,000</td><td><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px]">Auto-Cleared</span></td><td className="text-center"><button className="text-blue-600">Audits</button></td></tr>
                      <tr className="hover:bg-slate-50/70"><td className="p-3 pl-5 font-mono">TXN-4402-2026</td><td className="text-slate-400">23-05-2026 12:11:04</td><td className="font-semibold">Metro Fleet Rentals Private Ltd</td><td className="text-right text-green-600">+₹85,000</td><td><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px]">Auto-Cleared</span></td><td className="text-center"><button className="text-blue-600">Audits</button></td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tenants Panel */}
          {activePanel === 'admin-tenants' && (
            <div className="space-y-6">
              <div className="flex justify-between border-b pb-4"><div><h2 className="text-base font-bold">Enterprise Multi-Tenant Profiles</h2><p className="text-xs text-slate-500">Corporate client entities holding isolated fleet networks and escrow routing structures.</p></div><button onClick={() => setShowAddTenantModal(true)} className="bg-blue-600 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"><span>➕</span> Register New Tenant Entity</button></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tenants.map((tenant, idx) => (
                  <div key={idx} className="bg-white border rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between"><div><h3 className="text-sm font-bold">{tenant.name}</h3><span className="text-[10px] font-mono text-slate-400">{tenant.cin}</span></div><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded-full">{tenant.status}</span></div>
                    <div className="grid grid-cols-2 gap-2 border-t pt-2 mt-2 text-[11px]"><div><span className="text-slate-400 block">Fleet Deployment Size</span><b className="font-mono">{tenant.fleet}</b></div><div><span className="text-slate-400 block">Escrow Settlement</span><b className="font-mono">{tenant.settlement}</b></div></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users Panel */}
          {activePanel === 'admin-users' && (
            <div className="space-y-6">
              <div className="flex justify-between border-b pb-4"><div><h2 className="text-base font-bold">Company Multi-User Provisioning & Access Controls</h2><p className="text-xs text-slate-500">Generate multiple user credentials under single company tenants.</p></div><button onClick={() => setShowAddUserModal(true)} className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"><span>👤+</span> Instantiate Sub-Company User Token</button></div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-1 bg-white border rounded-xl p-4">
                  <div className="border-b pb-2"><h3 className="text-xs font-bold uppercase text-slate-400">Tenant Account Request Streams</h3></div>
                  <div className="mt-3 p-3 rounded-xl border border-amber-200 bg-amber-50/60">
                    <div className="flex justify-between font-bold"><span className="text-[11px]">EcoFleet Logistics Pvt Ltd</span><span className="text-[8px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">Pending Lease</span></div>
                    <p className="text-[10px] text-slate-600 mt-1">Requested: 2 Additional Operation Management profiles.</p>
                    <div className="flex justify-end gap-1.5 mt-2"><button onClick={() => denyUserAllocation('req1', 'EcoFleet')} className="bg-white border px-2 py-0.5 rounded text-[10px]">Dismiss</button><button onClick={() => approveUserAllocation('req1', 'EcoFleet India Logistics Corp', 'Karan Johar', 'karan@ecofleet.in')} className="bg-amber-600 text-white px-2.5 py-0.5 rounded text-[10px]">Provision</button></div>
                  </div>
                </div>
                <div className="xl:col-span-2 bg-white border rounded-xl p-4">
                  <div className="flex justify-between border-b pb-2"><h3 className="text-xs font-bold uppercase">Instantiated Corporate Sub-Users Matrix</h3><span className="text-[10px]">Total Active Operators: <b>{subUsers.length}</b></span></div>
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-left text-xs">
                      <thead><tr className="bg-slate-50 border-b text-[9px]"><th className="p-2.5">Operator Name</th><th className="p-2.5">Email</th><th className="p-2.5">Company</th><th className="p-2.5 text-center">Action</th></tr></thead>
                      <tbody>
                        {subUsers.map((user, idx) => (
                          <tr key={idx} className="border-b"><td className="p-2.5 font-bold">{user.name}</td><td className="p-2.5 text-slate-500">{user.email}</td><td className="p-2.5 text-blue-600">{user.company}</td><td className="p-2.5 text-center"><button onClick={() => purgeCorporateSubUser(`row-${idx}`, user.name)} className="text-red-600 text-[11px] font-bold">Revoke Token</button></td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Finance Panel */}
          {activePanel === 'admin-finance' && (
            <div><h2 className="text-base font-bold">System-Wide Balances & Float Infrastructure</h2><p className="text-xs text-slate-500 mb-4">Cross-tenant operational ledger health.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="bg-white p-4 rounded-xl border"><span className="text-[11px] font-bold text-slate-400">Total Pipeline Floating Cash</span><div className="text-xl font-bold">₹8,92,40,150</div></div><div className="bg-white p-4 rounded-xl border"><span className="text-[11px] font-bold text-slate-400">Platform Retained Fees</span><div className="text-xl font-bold text-green-600">₹42,10,230</div></div><div className="bg-white p-4 rounded-xl border"><span className="text-[11px] font-bold text-slate-400">Gross Processing Success Rate</span><div className="text-xl font-bold">99.94%</div></div></div>
            <div className="bg-white border rounded-xl p-5 mt-6"><h3 className="text-xs font-bold uppercase">System Liquid Flow Registers</h3><div className="text-center py-8 text-xs text-slate-400">Reconciliation graph charting framework engine initialized under platform standby status.</div></div></div>
          )}

          {/* Settlements Panel */}
          {activePanel === 'admin-settlements' && (
            <div><h2 className="text-base font-bold">Interbank Escrow Node Settlement Registers</h2><p className="text-xs text-slate-500 mb-4">Review payout pipelines routing corporate funds.</p>
            <div className="bg-white border rounded-xl overflow-hidden"><table className="w-full text-left text-xs"><thead><tr className="bg-slate-50 border-b text-[10px]"><th className="p-3">Batch Reference</th><th className="p-3">Tenant</th><th className="p-3">Bank Account</th><th className="p-3 text-right">Volume</th><th className="p-3">Status</th></tr></thead><tbody><tr><td className="p-3 font-mono">SET-B8921-026</td><td className="font-semibold">EcoFleet India</td><td className="text-slate-500">HDFC ••••9012</td><td className="text-right">₹14,50,000</td><td><span className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px]">Disbursed</span></td></tr><tr><td className="p-3 font-mono">SET-B8922-026</td><td className="font-semibold">Metro Fleet</td><td className="text-slate-500">ICICI ••••4412</td><td className="text-right">₹4,20,500</td><td><span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px]">Processing</span></td></tr></tbody></table></div></div>
          )}

          {/* Wallets Panel */}
          {activePanel === 'admin-wallets' && (
            <div><h2 className="text-base font-bold">Ecosystem Virtual Wallet Health Supervision</h2><div className="bg-white border rounded-xl p-12 text-center text-slate-400 mt-4"><span>👛</span> All driver virtual balance profiles match localized accounting parameters. Zero validation anomalies reported.</div></div>
          )}

          {/* KYC Panel */}
          {activePanel === 'admin-kyc' && !kycResolved && (
            <div><div className="border-b pb-3"><h2 className="text-base font-bold">Centralized KYC Risk Mitigation Desk</h2><p className="text-xs text-slate-500">Review flagged background logs and driving license verification anomalies manually.</p></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4"><div className="lg:col-span-1 bg-white border rounded-xl p-4"><h3 className="text-xs font-bold text-slate-400 border-b pb-2">Pending Approvals Queue</h3><div className="p-3 rounded-xl border border-orange-200 bg-orange-50/20 mt-3 flex gap-3"><div className="w-2 h-2 rounded-full bg-orange-600 animate-ping mt-1.5"></div><div><div className="flex justify-between"><span className="font-bold">Vijay Singh (Driver)</span><span className="text-[10px] text-slate-400">2m ago</span></div><p className="text-[11px] text-slate-500">Case ID: KYC-9082 • DL Photo OCR Verification Hold</p></div></div></div>
            <div className="lg:col-span-2 bg-white border rounded-xl p-5"><div className="flex justify-between border-b pb-2"><div><span className="text-[10px] text-slate-400">Active Workspace</span><h4 className="font-bold">Case-9082: Commercial Driving License Verification</h4></div><span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-[10px] rounded">OCR Discrepancy Flag</span></div>
            <div className="bg-slate-100 rounded-xl min-h-[160px] flex flex-col items-center justify-center my-4 p-6 text-center"><span>📄</span><span className="text-xs font-bold">License Image Proof</span><p className="text-[11px] text-slate-400">OCR verification flagged: 98.4% alignment variance</p></div>
            <div className="flex justify-end gap-2 pt-2"><button onClick={() => processKycAction('Rejected')} className="bg-slate-100 px-4 py-2 rounded-lg">Reject</button><button onClick={() => processKycAction('Approved')} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Approve</button></div></div></div></div>
          )}

          {activePanel === 'admin-kyc' && kycResolved && (
            <div className="bg-white border rounded-xl p-12 text-center text-slate-400"><span>✅</span> All processing rows cleared! Governance verification queue is currently empty.</div>
          )}

          {/* Audit Panel */}
          {activePanel === 'admin-audit' && (
            <div><h2 className="text-base font-bold">Immutable System Architecture Audit Streams</h2><p className="text-xs text-slate-500 mb-4">Append-only log trail mapping system administrative configurations.</p>
            <div className="bg-white border rounded-xl overflow-hidden"><div className="p-3 bg-slate-900 text-white border-b flex justify-between"><span className="font-bold text-xs">Live System Log Stream</span><span className="text-[10px] text-slate-500">2026 UTC Cluster Logs</span></div><div className="p-4 space-y-2 bg-slate-950 text-emerald-400 text-xs font-mono min-h-[240px] overflow-y-auto">{auditLogs.map((log, idx) => <div key={idx}>{log}</div>)}</div></div></div>
          )}
        </div>
      </div>

      {/* Add Tenant Modal */}
      {showAddTenantModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg"><div className="p-4 border-b bg-slate-50 flex justify-between"><h3 className="font-bold">Register New Client Corporate Tenant</h3><button onClick={() => setShowAddTenantModal(false)}>✕</button></div>
          <form onSubmit={handleNewTenantSubmit} className="p-5 space-y-4"><input type="text" placeholder="Corporate Name" value={newTenantName} onChange={(e) => setNewTenantName(e.target.value)} className="w-full border rounded-lg p-2" required /><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowAddTenantModal(false)} className="px-4 py-2 bg-slate-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Create</button></div></form></div></div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md"><div className="p-4 border-b bg-slate-50 flex justify-between"><h3 className="font-bold">Provision Sub-Company Operator Token</h3><button onClick={() => setShowAddUserModal(false)}>✕</button></div>
          <form onSubmit={handleManualSubUserInstantiation} className="p-5 space-y-4"><select value={newUserCompany} onChange={(e) => setNewUserCompany(e.target.value)} className="w-full border rounded-lg p-2"><option>EcoFleet India Logistics Corp</option><option>Metro Fleet Rentals Private Ltd</option></select><input type="text" placeholder="Operator Name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="w-full border rounded-lg p-2" required /><input type="email" placeholder="Email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="w-full border rounded-lg p-2" required /><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowAddUserModal(false)} className="px-4 py-2 bg-slate-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Create</button></div></form></div></div>
      )}
    </div>
  );
}