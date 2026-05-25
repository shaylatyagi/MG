// frontend/src/pages/PartnerHub.jsx
import React, { useState, useEffect } from 'react';
import { 
  Search, ArrowLeft, ShieldCheck, Building2, MapPin, Truck, 
  UsersRound, Activity, Coins, Briefcase, Eye, Gavel, 
  FileText, Landmark, Ban, RotateCcw, Headset, ChevronRight,
  Info, Clock, Shield, FileCheck2, Scroll, Fingerprint,
  AlertCircle, Check
} from 'lucide-react';

// Partner Database - Exact same as HTML
const partnerVirtualDb = {
  ecofleet: {
    id: "ecofleet",
    title: "EcoFleet India Logistics Corp",
    subtitle: "Premium sustainable intra-city logistics and supply-chain operations infrastructure network partner.",
    classification: "logistics",
    avatarText: "EF",
    avatarGradient: "from-blue-600 to-blue-500",
    cin: "U60231MH2021PTC361092",
    hq: "Mumbai Cluster Node",
    work: "Deploys, coordinates, and manages sustainable middle-mile and last-mile electric cargo distribution networks for tier-1 retail conglomerates and e-commerce clearing hubs across western operational regions.",
    vision: "To completely eliminate carbon dependencies in localized delivery fulfillment pipelines by provisioning scalable, infrastructure-supported commercial EV fleets operating with 100% predictive telemetry guidance by 2028.",
    metrics: { fleet: "120 Units", drivers: "140 Drivers", sla: "99.8% Score", volume: "₹28.4 Cr" },
    ledger: { cleared: "₹27,90,00,000", pending: "₹50,50,000" },
    legalChecksum: "0x8F2B...E9A1",
    legalTabContents: {
      terms: "EcoFleet operational assignments mandate a minimum dispatch runtime of 6 hours per deployment container. Cargo tracking nodes remain continuous, and data leaks or telemetry tampering events trigger full system structural account lockout. Clients are fully responsible for structural asset loading safety standards.",
      settlement: "Financial processing operates strictly on a net T+2 rolling loop calendar window. Invoices generated through the MobilityGrid interface are scanned and processed automatically, dispersing cleared credits directly to designated partner bank vaults upon confirmation of delivery compliance tracking codes.",
      cancellation: "Charter assignments can be completely modified or cancelled up to 12 hours before the scheduled dispatch runtime window without incurring structural fees. Any dispatch cancel request received inside the 12-hour buffer window triggers a standard base operational recovery fee of 15% of the gross contract value.",
      refund: "Disputed route charges or asset performance issues undergo active telemetry review logs. Verified equipment failures, low structural vehicle battery degradation states, or unexpected network downtimes result in direct credit returns issued within 5 processing layout intervals.",
      grievance: "Escalated disputes route to the designated Head of Operations Desk (Email: op-grievance@ecofleet.co.in). The node guarantees a definitive diagnostic breakdown response within 24 working hours, following official corporate SLA protection acts."
    },
    inventory: [
      { id: "MH-12-QG-4510", model: "Tata Ace EV Cargo", driver: "Vijay Singh", status: "Active Stream", statusClass: "bg-emerald-50 text-emerald-700" },
      { id: "MH-12-QG-8812", model: "Mahindra Zor Grand", driver: "Rajesh Pilot", status: "Active Stream", statusClass: "bg-emerald-50 text-emerald-700" },
      { id: "MH-02-EE-3341", model: "Eicher Pro 2049 EV", driver: "Amitesh Roy", status: "In Maintenance", statusClass: "bg-amber-50 text-amber-700" }
    ]
  },
  metrofleet: {
    id: "metrofleet",
    title: "Metro Fleet Rentals Private Ltd",
    subtitle: "Enterprise vehicle distribution networks specializing in high-occupancy corporate employee transit ecosystems.",
    classification: "transit",
    avatarText: "MF",
    avatarGradient: "from-purple-600 to-indigo-600",
    cin: "U63030DL2019PTC344122",
    hq: "Delhi NCR Node",
    work: "Engineers high-capacity asset allocation algorithms and end-to-end personnel transit workflows for technology conglomerates and international operational units, maintaining continuous physical fleet availability indices.",
    vision: "To cultivate intelligent, responsive corporate mobility platforms that harmonize employee transport demands with green vehicular structures, delivering secure and seamless employee transit metrics.",
    metrics: { fleet: "85 Units", drivers: "110 Drivers", sla: "98.4% Score", volume: "₹17.4 Cr" },
    ledger: { cleared: "₹16,68,84,220", pending: "₹73,55,900" },
    legalChecksum: "0x4A1E...B992",
    legalTabContents: {
      terms: "Metro Fleet corporate transport agreements require mandatory biometric route logging for security. Route changes must match authorized enterprise navigation bounds. Passenger density limits match the exact legal structural load ratings of deployed multi-passenger EV modules.",
      settlement: "Settlement processing relies on a monthly structured system billing batch run cycle. Invoice balances are consolidated on the 1st of each calendar month, with electronic transfer settlement paths routing automatically via corporate banking APIs within a strict 7-day payment pipeline block.",
      cancellation: "Enterprise route blocks can be modified or restructured without penalty up to 24 hours prior to shift commencement. Last-minute adjustments or deployment shift cancellations trigger a structural operational charge matching 50% of that shift's baseline budget allocation.",
      refund: "Unfulfilled passenger legs or delayed routing blocks over 45 minutes beyond specified ETA goals trigger automated micro-credit distributions. These are applied instantly to the client organization's open billing account ledger history.",
      grievance: "Grievance and corporate safety review structures mount directly through the Compliance Office Desk (Email: structural-compliance@metrofleet.com). Escalations are addressed using an immutable ticket review procedure within 12 structural hours."
    },
    inventory: [
      { id: "DL-01-CA-9092", model: "Tata Express-T EV", driver: "Sanjay Dutt", status: "Active Stream", statusClass: "bg-emerald-50 text-emerald-700" },
      { id: "DL-03-CC-1120", model: "BYD E6 Premium MPV", driver: "Preeti Sharma", status: "Active Stream", statusClass: "bg-emerald-50 text-emerald-700" },
      { id: "DL-01-CA-8041", model: "Tata Express-T EV", driver: "Karan Johar", status: "Charging Hold", statusClass: "bg-blue-50 text-blue-700" }
    ]
  },
  blazecargo: {
    id: "blazecargo",
    title: "Blaze Cargo Movers Private Ltd",
    subtitle: "Heavy-duty logistics provider specializing in mid-mile arterial commercial fleet movements across national hubs.",
    classification: "midmile",
    avatarText: "BC",
    avatarGradient: "from-amber-600 to-orange-600",
    cin: "U45203KA2020PTC138902",
    hq: "Bengaluru Industrial Node",
    work: "Operates cross-border container lines and multi-ton electrical vehicle units connecting significant distribution centers, supply repositories, and coastal port loading clusters via synchronized tracking architectures.",
    vision: "To establish a highly predictable and hyper-resilient arterial freight corridor matrix fueled by high-voltage sustainable frameworks and immutable telemetry ledgers.",
    metrics: { fleet: "42 Units", drivers: "55 Drivers", sla: "97.9% Score", volume: "₹9.1 Cr" },
    ledger: { cleared: "₹8,65,00,000", pending: "₹45,00,000" },
    legalChecksum: "0x7C91...F331",
    legalTabContents: {
      terms: "Arterial heavy freight deployments strictly mandate legal compliance checks on highway load scales. Deployed heavy cargo trailers require standardized checkpoint validation markers. Breakdowns or road issues require the on-duty driver to signal dispatch systems via secure terminal links within 15 minutes.",
      settlement: "Arterial mid-mile line-haul networks operate on a specialized structural 50% upfront routing allocation protocol. The balance 50% ledger fulfillment payload routes immediately through the platform ledger upon proof-of-delivery clearance.",
      cancellation: "Due to complex inter-state dispatch scheduling dependencies, line-haul cancellations received inside 48 hours of dispatch trigger a mandatory 25% terminal positioning fee. Cancellations executed outside this 48-hour clear window are completely fee-exempt.",
      refund: "Cargo damage incidents, cold-chain temperature boundary violations, or multi-day shipment delays undergo structural audit sweeps via container logs. Claims are processed under standardized national carrier liability limitations.",
      grievance: "Regulatory freight disputes, transport insurance alignment reviews, and carrier claims route directly to the Nodal Grievance Officer (Email: legal-desk@blazecargo.in; Phone: +91-80-5557-9012)."
    },
    inventory: [
      { id: "KA-03-MM-7210", model: "Ashok Leyland BADA DOST", driver: "Ramesh Kumar", status: "Active Stream", statusClass: "bg-emerald-50 text-emerald-700" },
      { id: "KA-51-AA-4481", model: "Tata Ultra T.7 Electric", driver: "Anand Shetti", status: "Idle Standby", statusClass: "bg-slate-100 text-slate-700" }
    ]
  }
};

export default function PartnerHub() {
  const [view, setView] = useState('directory'); // 'directory' or 'profile'
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeLegalTab, setActiveLegalTab] = useState('terms');

  const legalTabs = [
    { id: 'terms', label: 'Terms & Conditions', icon: <FileText size={16} /> },
    { id: 'settlement', label: 'Settlement Protocols', icon: <Landmark size={16} /> },
    { id: 'cancellation', label: 'Cancellation Framework', icon: <Ban size={16} /> },
    { id: 'refund', label: 'Refund Policy Rules', icon: <RotateCcw size={16} /> },
    { id: 'grievance', label: 'Grievance Redressal', icon: <Headset size={16} /> }
  ];

  const getFilteredPartners = () => {
    let partners = Object.values(partnerVirtualDb);
    if (activeFilter !== 'all') {
      partners = partners.filter(p => p.classification === activeFilter);
    }
    if (searchQuery) {
      partners = partners.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.cin.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return partners;
  };

  const handlePartnerClick = (partner) => {
    setSelectedPartner(partner);
    setView('profile');
    setActiveLegalTab('terms');
  };

  const handleBackToDirectory = () => {
    setView('directory');
    setSelectedPartner(null);
  };

  const viewTelemetryStream = (assetId) => {
    alert(`Routing Protocol: Verifying stream handshake for asset node [${assetId}]...`);
  };

  const triggerCharterInquiry = () => {
    alert(`Governance Pipeline: Logged enterprise execution request for ${selectedPartner?.title}. Ledger locks appended successfully.`);
  };

  const classificationFilters = [
    { id: 'all', label: 'All Sectors' },
    { id: 'logistics', label: 'Intra-City Logistics' },
    { id: 'transit', label: 'Corporate Transit' },
    { id: 'midmile', label: 'Arterial Heavy Duty' }
  ];

  // Directory View
  if (view === 'directory') {
    const filteredPartners = getFilteredPartners();
    
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-white font-extrabold px-2 py-0.5 rounded text-[10px] tracking-wide">MOBILITYGRID CORE</span>
              <span className="hidden sm:inline text-slate-500">• Institutional Governance & Compliance Framework v2.6</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Security Nodes Bound
              </span>
              <span className="font-mono text-[11px] hidden md:inline text-slate-500">Ref: MG-COMP-2026</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Partner Legal & Fleet Registry</h1>
            <p className="text-sm text-slate-500 max-w-2xl">Discover authenticated nodes within the ecosystem. Select any partner below to explore their dedicated single-page profile, fleet matrices, and audited transaction guidelines.</p>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search partner name, CIN, or hub location..." 
                className="w-full bg-slate-50 border border-slate-200 text-xs font-medium pl-10 pr-4 py-3 rounded-xl outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {classificationFilters.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`whitespace-nowrap px-4 py-2 font-bold text-xs rounded-xl transition-all ${
                    activeFilter === filter.id 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Partner Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPartners.map(partner => (
              <div 
                key={partner.id}
                onClick={() => handlePartnerClick(partner)}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-md hover:border-blue-600/30 transition-all cursor-pointer group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${partner.avatarGradient} flex items-center justify-center text-white font-black text-base`}>
                      {partner.avatarText}
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {partner.classification}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{partner.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{partner.subtitle}</p>
                  </div>
                </div>
                <div className="border-t border-slate-100 mt-4 pt-3 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>CIN: {partner.cin.substring(0,10)}...</span>
                  <span className="font-bold text-slate-700">{partner.metrics.fleet} Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-500 border-t border-slate-800 mt-12 py-6 text-xs">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-400">© 2026 MobilityGrid Engine Systems Private Ltd.</p>
              <p className="text-[11px] mt-0.5">Automated cross-tenant profile routing engine. Secure append-only compliance indexing active.</p>
            </div>
            <div className="flex items-center gap-4 text-slate-400 font-semibold font-mono text-[11px]">
              <span>ISO 27001 Certified</span>
              <span>•</span>
              <span>SOC2 Compliant Ledger</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Profile View (Single Partner Detail)
  const data = selectedPartner;
  if (!data) return null;

  const readableTitles = {
    terms: "Terms & Conditions Framework",
    settlement: "Settlement & Payment Rules",
    cancellation: "Cancellation Policy Protocols",
    refund: "Refund Pipeline Regulations",
    grievance: "Grievance Redressal Architecture"
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white pb-12 pt-8 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <button 
            onClick={handleBackToDirectory}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white mb-6 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg border border-white/10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Global Registry
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start md:items-center gap-4 md:gap-5">
              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${data.avatarGradient} flex items-center justify-center text-white text-2xl md:text-3xl font-black shadow-2xl shrink-0 tracking-tighter`}>
                {data.avatarText}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl md:text-3xl font-extrabold text-white tracking-tight">{data.title}</h1>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> MCA Authenticated Node
                  </span>
                </div>
                <p className="text-xs md:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">{data.subtitle}</p>
                <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-400 text-xs font-mono">
                  <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" /> CIN: {data.cin}
                  </span>
                  <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" /> HQ Cluster: {data.hq}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 -mt-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div><span className="text-[10px] uppercase font-bold text-slate-400">Active Running Fleet</span><b className="text-2xl font-mono font-black text-slate-900 block">{data.metrics.fleet}</b><p className="text-[10px] text-slate-400">Telemetry monitored assets</p></div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Truck size={20} /></div>
          </div>
          <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div><span className="text-[10px] uppercase font-bold text-slate-400">Operator Index</span><b className="text-2xl font-mono font-black text-slate-900 block">{data.metrics.drivers}</b><p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5"><Check size={12} /> Biometric KYC Verified</p></div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><UsersRound size={20} /></div>
          </div>
          <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div><span className="text-[10px] uppercase font-bold text-slate-400">Operational SLA Grade</span><b className="text-2xl font-mono font-black text-blue-600 block">{data.metrics.sla}</b><p className="text-[10px] text-slate-400">Compliance performance factor</p></div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Activity size={20} /></div>
          </div>
          <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div><span className="text-[10px] uppercase font-bold text-slate-400">Gross Volume Cleared</span><b className="text-2xl font-mono font-black text-slate-900 block">{data.metrics.volume}</b><p className="text-[10px] text-slate-400">Secured node transactions</p></div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700"><Coins size={20} /></div>
          </div>
        </div>

        {/* Work & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <h3 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5 mb-3"><Briefcase size={16} className="text-blue-600" /> Operations & Work Profile</h3>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">{data.work}</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <h3 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5 mb-3"><Eye size={16} className="text-blue-600" /> Strategic Corporate Vision</h3>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">{data.vision}</p>
          </div>
        </div>

        {/* Legal & Escrow Section */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-4 bg-slate-50 border-r border-slate-200 p-4 space-y-2">
            <div className="pb-3 border-b border-slate-200 mb-2">
              <h4 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5"><Gavel size={16} className="text-slate-500" /> Legal & Escrow Terms</h4>
              <p className="text-[10px] text-slate-400">Node bindings & regulatory response pipelines.</p>
            </div>
            {legalTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveLegalTab(tab.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  activeLegalTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-transparent hover:bg-slate-200/60 text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">{tab.icon} {tab.label}</span>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
          <div className="lg:col-span-8 p-6 bg-white flex flex-col justify-between min-h-[300px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h5 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{readableTitles[activeLegalTab]}</h5>
                <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-bold">STRICTLY BINDING</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">{data.legalTabContents[activeLegalTab]}</p>
            </div>
            <div className="pt-4 border-t border-slate-100 mt-6 flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-400 font-mono">
              <span>Hash ID Checksum: <b className="text-slate-600">{data.legalChecksum}</b></span>
              <span className="flex items-center gap-1 text-emerald-600 font-semibold"><Shield size={14} /> Escrow Protected Agreement</span>
            </div>
          </div>
        </div>

        {/* Inventory Table & Charter */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div><h3 className="text-xs font-bold uppercase text-slate-700">Dynamic Asset Inventory Matrix</h3><p className="text-[11px] text-slate-400">Live vehicle deployments tracking telemetry data feed records.</p></div>
                <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded-md border border-slate-200">Active Tracked Units: <span className="text-blue-600">{data.inventory.length}</span></span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead><tr className="bg-slate-50 text-slate-500 font-bold border-b uppercase tracking-widest text-[9px]"><th className="p-3 pl-5">Asset Identifier</th><th className="p-3">Vehicle Model</th><th className="p-3">Assigned Operator</th><th className="p-3">Status</th><th className="p-3 text-center">Action</th></tr></thead>
                  <tbody>
                    {data.inventory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="p-3 pl-5 font-mono font-bold">{item.id}</td>
                        <td className="p-3">{item.model}</td>
                        <td className="p-3">{item.driver}</td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.statusClass}`}>{item.status}</span></td>
                        <td className="p-3 text-center"><button onClick={() => viewTelemetryStream(item.id)} className="text-blue-600 hover:underline font-bold text-[11px]">Track Live</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 border border-blue-100 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div><h4 className="text-sm font-bold text-blue-900 flex items-center gap-1.5"><Info size={16} className="text-blue-600" /> Route Charter Agreement Through Escrow Nodes?</h4><p className="text-xs text-blue-950/80 max-w-xl">Initiating an alignment will link your organization directly into the settlement matrix, tracking terms and rules mapped above automatically.</p></div>
              <button onClick={triggerCharterInquiry} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md whitespace-nowrap shrink-0">Execute Intent Payload</button>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="border-b pb-2 mb-3 flex justify-between"><div><h3 className="text-xs font-bold uppercase text-slate-700">Owner Secured Ledger</h3><p className="text-[10px] text-slate-400">Escrow processing balances & clearance pipelines.</p></div><Landmark size={16} className="text-slate-400" /></div>
              <div className="space-y-3"><div className="bg-slate-50 p-3 rounded-xl"><span className="text-[10px] font-bold text-slate-400 block">Net Cleared Vault Balance</span><div className="text-xl font-mono font-black text-emerald-600">{data.ledger.cleared}</div><div className="text-[9px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-0.5"><ShieldCheck size={12} /> Vault Settlement Complete</div></div>
              <div className="bg-slate-50 p-3 rounded-xl"><span className="text-[10px] font-bold text-slate-400 block">Clearing Cycle Float Balance</span><div className="text-xl font-mono font-black text-orange-600">{data.ledger.pending}</div><div className="text-[9px] text-orange-600 font-semibold mt-0.5 flex items-center gap-0.5"><Clock size={12} /> T+1 Clearance Window Open</div></div></div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="border-b pb-2 mb-3"><h3 className="text-xs font-bold uppercase text-slate-700">Structural Credentials Status</h3><p className="text-[10px] text-slate-400">Compliance validations cleared at legal entity boundary levels.</p></div>
              <div className="space-y-2">
                <div className="flex justify-between p-2 rounded-lg bg-slate-50"><span className="flex items-center gap-2"><FileCheck2 size={14} className="text-blue-600" /> MCA Corporate Incorporation</span><span className="px-1.5 py-0.5 text-[9px] bg-emerald-50 text-emerald-700 font-bold rounded">ACTIVE</span></div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-50"><span className="flex items-center gap-2"><Scroll size={14} className="text-blue-600" /> Commercial Carrier Permit</span><span className="px-1.5 py-0.5 text-[9px] bg-emerald-50 text-emerald-700 font-bold rounded">VALID</span></div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-50"><span className="flex items-center gap-2"><Fingerprint size={14} className="text-blue-600" /> Global Escrow Node Binding</span><span className="px-1.5 py-0.5 text-[9px] bg-emerald-50 text-emerald-700 font-bold rounded">BOUNDED</span></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-500 border-t border-slate-800 mt-12 py-6 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div><p className="font-semibold text-slate-400">© 2026 MobilityGrid Engine Systems Private Ltd.</p><p className="text-[11px] mt-0.5">Automated cross-tenant profile routing engine. Secure append-only compliance indexing active.</p></div>
          <div className="flex items-center gap-4 text-slate-400 font-semibold font-mono text-[11px]"><span>ISO 27001 Certified</span><span>•</span><span>SOC2 Compliant Ledger</span></div>
        </div>
      </footer>
    </div>
  );
}