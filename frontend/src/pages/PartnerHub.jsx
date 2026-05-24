import React, { useState } from 'react';

// Partner Database
const partnerVirtualDb = {
  ecofleet: {
    title: "EcoFleet India Logistics Corp",
    subtitle: "Premium sustainable intra-city logistics and supply-chain operations infrastructure network partner.",
    avatarText: "EF",
    avatarGradient: "from-blue-600 to-blue-500",
    metrics: { fleet: "120 Units", drivers: "140 Drivers", sla: "99.8% Score", volume: "₹28.4 Cr" },
    ledger: { cleared: "₹27,90,00,000", pending: "₹50,50,000" },
    cin: "U60231MH2021PTC361092",
    location: "Mumbai Cluster Node",
    inventory: [
      { id: "MH-12-QG-4510", model: "Tata Ace EV Cargo", driver: "Vijay Singh", status: "Active Stream", statusClass: "bg-emerald-50 text-emerald-700" },
      { id: "MH-12-QG-8812", model: "Mahindra Zor Grand", driver: "Rajesh Pilot", status: "Active Stream", statusClass: "bg-emerald-50 text-emerald-700" },
      { id: "MH-02-EE-3341", model: "Eicher Pro 2049 EV", driver: "Amitesh Roy", status: "In Maintenance", statusClass: "bg-amber-50 text-amber-700" }
    ]
  },
  metrofleet: {
    title: "Metro Fleet Rentals Private Ltd",
    subtitle: "Enterprise vehicle distribution networks specializing in high-occupancy corporate employee transit ecosystems.",
    avatarText: "MF",
    avatarGradient: "from-purple-600 to-indigo-600",
    metrics: { fleet: "85 Units", drivers: "110 Drivers", sla: "98.4% Score", volume: "₹17.4 Cr" },
    ledger: { cleared: "₹16,68,84,220", pending: "₹73,55,900" },
    cin: "U63090DL2019PTC345890",
    location: "Delhi NCR Node",
    inventory: [
      { id: "DL-01-CA-9092", model: "Tata Express-T EV", driver: "Sanjay Dutt", status: "Active Stream", statusClass: "bg-emerald-50 text-emerald-700" },
      { id: "DL-03-CC-1120", model: "BYD E6 Premium MPV", driver: "Preeti Sharma", status: "Active Stream", statusClass: "bg-emerald-50 text-emerald-700" },
      { id: "DL-01-CA-8041", model: "Tata Express-T EV", driver: "Karan Johar", status: "Charging Hold", statusClass: "bg-blue-50 text-blue-700" }
    ]
  },
  blazecargo: {
    title: "Blaze Cargo Movers Private Ltd",
    subtitle: "Heavy-duty logistics provider specializing in mid-mile arterial commercial fleet movements across national hubs.",
    avatarText: "BC",
    avatarGradient: "from-amber-600 to-orange-600",
    metrics: { fleet: "42 Units", drivers: "55 Drivers", sla: "97.9% Score", volume: "₹9.1 Cr" },
    ledger: { cleared: "₹8,65,00,000", pending: "₹45,00,000" },
    cin: "U60231MH2022PTC123456",
    location: "Bangalore Hub",
    inventory: [
      { id: "KA-03-MM-7210", model: "Ashok Leyland BADA DOST", driver: "Ramesh Kumar", status: "Active Stream", statusClass: "bg-emerald-50 text-emerald-700" },
      { id: "KA-51-AA-4481", model: "Tata Ultra T.7 Electric", driver: "Anand Shetti", status: "Idle Standby", statusClass: "bg-slate-100 text-slate-700" }
    ]
  }
};

export default function PartnerHub() {
  const [activePartner, setActivePartner] = useState('ecofleet');
  const data = partnerVirtualDb[activePartner];

  const viewTelemetryStream = (assetId) => {
    alert(`Accessing secure telemetry streaming for tracking id: ${assetId}`);
  };

  const triggerCharterInquiry = () => {
    alert(`Initiating communication payload with ${data.title}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white border-b border-slate-800 shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white font-bold px-2 py-0.5 rounded text-[10px] tracking-wide">POWERED BY MOBILITYGRID</span>
            <span className="hidden sm:inline">Official Verification Tenant Registry Node</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Network Active
            </span>
            <span className="font-mono text-[11px] hidden md:inline">Node Ref: MG-OWN-77X</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 pt-8 pb-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start md:items-center gap-4 md:gap-5">
              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${data.avatarGradient} flex items-center justify-center text-white text-2xl md:text-3xl font-black shadow-xl shrink-0 tracking-tighter`}>
                {data.avatarText}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">{data.title}</h1>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                    Verified Corporate Partner
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-xl">{data.subtitle}</p>
                <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 text-xs font-mono">
                  <span className="flex items-center gap-1">CIN: {data.cin}</span>
                  <span className="flex items-center gap-1">HQ: {data.location}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 self-start lg:self-center">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Switch Partner Profile:</label>
              <select 
                value={activePartner}
                onChange={(e) => setActivePartner(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg outline-none cursor-pointer"
              >
                <option value="ecofleet">EcoFleet India Logistics Corp</option>
                <option value="metrofleet">Metro Fleet Rentals Private Ltd</option>
                <option value="blazecargo">Blaze Cargo Movers Private Ltd</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Active Fleet</span>
                <p className="text-2xl font-black text-slate-900">{data.metrics.fleet}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">🚚</div>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Drivers</span>
                <p className="text-2xl font-black text-slate-900">{data.metrics.drivers}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">👥</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">SLA Grade</span>
                <p className="text-2xl font-black text-blue-600">{data.metrics.sla}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">📊</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Gross Volume</span>
                <p className="text-2xl font-black text-slate-900">{data.metrics.volume}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700">💰</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inventory Table */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-slate-50/50">
                <h3 className="text-xs font-bold uppercase">Dynamic Asset Inventory Matrix</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b">
                      <th className="p-3 pl-5">Asset Identifier</th>
                      <th className="p-3">Vehicle Model</th>
                      <th className="p-3">Assigned Operator</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.inventory.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50/70">
                        <td className="p-3 pl-5 font-mono font-bold">{item.id}</td>
                        <td className="p-3">{item.model}</td>
                        <td className="p-3">{item.driver}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.statusClass}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => viewTelemetryStream(item.id)} 
                            className="text-blue-600 hover:underline text-[11px] font-bold"
                          >
                            Track Live
                          </button>
                        </td>
                       </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charter CTA */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 border border-blue-100 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                  Looking to Charter This Partner's Fleet Assets?
                </h4>
                <p className="text-xs text-blue-950/80 max-w-xl">
                  This portal configuration is an authenticated live node hosted via MobilityGrid Core Governance protocols.
                </p>
              </div>
              <button 
                onClick={triggerCharterInquiry} 
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md whitespace-nowrap shrink-0 transition-all"
              >
                Submit Charter Request
              </button>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Ledger */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="border-b pb-2 mb-3">
                <h3 className="text-xs font-bold uppercase text-slate-700">Owner Secured Ledger</h3>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 block">Net Cleared Vault Balance</span>
                  <div className="text-xl font-mono font-black text-emerald-600">{data.ledger.cleared}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 block">Clearing Cycle Float Balance</span>
                  <div className="text-xl font-mono font-black text-orange-600">{data.ledger.pending}</div>
                </div>
              </div>
            </div>

            {/* Credentials */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="border-b pb-2 mb-3">
                <h3 className="text-xs font-bold uppercase text-slate-700">Structural Credentials Status</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span className="text-slate-700 text-xs">MCA Corporate Incorporation</span>
                  <span className="px-1.5 py-0.5 text-[9px] bg-emerald-50 text-emerald-700 font-bold rounded">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span className="text-slate-700 text-xs">Commercial Carrier Permit</span>
                  <span className="px-1.5 py-0.5 text-[9px] bg-emerald-50 text-emerald-700 font-bold rounded">VALID</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span className="text-slate-700 text-xs">Global Escrow Node Binding</span>
                  <span className="px-1.5 py-0.5 text-[9px] bg-emerald-50 text-emerald-700 font-bold rounded">BOUNDED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-500 border-t border-slate-800 mt-12 py-6 text-xs shrink-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-400">© 2026 MobilityGrid Engine Systems Private Ltd.</p>
            <p className="text-[11px] mt-0.5">Automated cross-tenant virtual profile distribution pipeline deployment.</p>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-semibold font-mono text-[11px]">
            <span>ISO 27001</span>
            <span>•</span>
            <span>SOC2 Compliant Ledger</span>
          </div>
        </div>
      </footer>
    </div>
  );
}