import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Building2, UsersRound, Landmark, Fingerprint, ShieldAlert, Plus, Search } from 'lucide-react';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('dash');
    const [tenants, setTenants] = useState([]);

    // Mock Data for Demo (Taaki Papa ko khali na dikhe)
    const stats = {
        totalVolume: "₹45,82,90,120",
        settled: "₹44,58,84,220",
        pending: "₹1,24,05,900",
        activeDrivers: "14,820",
        totalVehicles: "18,500"
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
            {/* SIDEBAR */}
            <aside className="w-64 bg-slate-950 text-slate-400 flex flex-col border-r border-slate-800">
                <div className="p-6 border-b border-slate-900 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl">MG</div>
                    <div>
                        <h1 className="text-white font-bold text-sm">MobilityGrid</h1>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">HQ Governance</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 text-xs font-semibold">
                    <div className="text-[10px] uppercase text-slate-600 px-3 pb-2">Core Operations</div>
                    <button onClick={() => setActiveTab('dash')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'dash' ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-900'}`}>
                        <LayoutDashboard size={16} className={activeTab === 'dash' ? 'text-blue-500' : ''} /> Command Dashboard
                    </button>
                    <button onClick={() => setActiveTab('tenants')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'tenants' ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-900'}`}>
                        <Building2 size={16} /> Client Tenant Companies
                    </button>
                    <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'users' ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-900'}`}>
                        <UsersRound size={16} /> Users & Provisioning
                    </button>

                    <div className="text-[10px] uppercase text-slate-600 px-3 pt-6 pb-2">Financial Rails</div>
                    <button onClick={() => setActiveTab('finance')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'finance' ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-900'}`}>
                        <Landmark size={16} /> Financial Monitoring
                    </button>

                    <div className="text-[10px] uppercase text-slate-600 px-3 pt-6 pb-2">Risk & Security</div>
                    <button onClick={() => setActiveTab('kyc')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'kyc' ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-900'}`}>
                        <Fingerprint size={16} /> KYC Compliance Desk
                    </button>
                </nav>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto">
                <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <span className="text-slate-400">Governance Platform</span>
                        <span>/</span>
                        <span>{activeTab.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs font-black">Shayla Tyagi</p>
                            <p className="text-[10px] text-blue-600 font-bold uppercase">System Admin</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold">SA</div>
                    </div>
                </header>

                <div className="p-8 space-y-8 max-w-[1400px] mx-auto">
                    
                    {/* TAB 1: COMMAND DASHBOARD */}
                    {activeTab === 'dash' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Infrastructure Overwatch</h2>
                                <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-2 animate-pulse">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Live Stream Active
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Gross Pipeline Volume</p>
                                    <h3 className="text-3xl font-black text-slate-950 font-mono">{stats.totalVolume}</h3>
                                    <p className="text-[10px] text-slate-400 mt-2">Aggregated baseline across all nodes</p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Net Settled Volume</p>
                                    <h3 className="text-3xl font-black text-emerald-600 font-mono">{stats.settled}</h3>
                                    <p className="text-[10px] text-emerald-600 font-bold mt-2">✓ Verified Cleared</p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Drivers Tracking</p>
                                    <h3 className="text-3xl font-black text-blue-600 font-mono">{stats.activeDrivers}</h3>
                                    <p className="text-[10px] text-slate-400 mt-2">Active Field Deployments</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs">Ecosystem Global Transactions</div>
                                <div className="p-12 text-center text-slate-400 text-sm">Real-time ledger stream syncing...</div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: TENANTS */}
                    {activeTab === 'tenants' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-black">Enterprise Tenant Profiles</h2>
                                <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 hover:bg-blue-700">
                                    <Plus size={16} /> Register New Tenant
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-2xl border-2 border-blue-50 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-black text-slate-900">EcoFleet India Logistics</h3>
                                        <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-black">OPERATIONAL</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-mono mb-4">CIN: U60231MH2021PTC361092</p>
                                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-[11px] font-bold text-slate-500 uppercase">
                                        <div><span className="block text-[9px] text-slate-300">Fleet Size</span> 120 Units</div>
                                        <div><span className="block text-[9px] text-slate-300">Cycle</span> batched batched T+1</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: USERS */}
                    {activeTab === 'users' && (
                        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                            <UsersRound size={48} className="mx-auto text-slate-200 mb-4" />
                            <h3 className="text-xl font-bold">User Provisioning Module</h3>
                            <p className="text-slate-400 max-w-sm mx-auto mt-2 text-sm">Manage operator credentials and multi-user structural allocation requests here.</p>
                        </div>
                    )}

                    {/* TAB 4: FINANCE */}
                    {activeTab === 'finance' && (
                        <div className="space-y-6">
                             <h2 className="text-2xl font-black">Financial Rails & Float</h2>
                             <div className="bg-slate-950 p-8 rounded-3xl text-white shadow-2xl overflow-hidden relative">
                                <div className="relative z-10">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Total Floating Liquid Cash</p>
                                    <h3 className="text-5xl font-black font-mono tracking-tighter">₹8,92,40,150</h3>
                                    <div className="mt-8 flex gap-4">
                                        <div className="bg-white/10 px-4 py-2 rounded-xl text-xs font-bold">Settlement batched Batch Active</div>
                                        <div className="bg-emerald-500/20 px-4 py-2 rounded-xl text-xs font-bold text-emerald-400">Success Rate 99.94%</div>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 p-12 opacity-10"><Landmark size={120} /></div>
                             </div>
                        </div>
                    )}

                    {/* TAB 5: KYC */}
                    {activeTab === 'kyc' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-black">Compliance Desk</h2>
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <table className="w-full text-left text-xs font-bold">
                                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Case ID</th>
                                            <th className="px-6 py-4">Identity Name</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-slate-500 tracking-tighter text-[11px]">KYC-9082-MGE</td>
                                            <td className="px-6 py-4">Vijay Singh (Driver)</td>
                                            <td className="px-6 py-4 text-orange-600">Pending OCR Pass</td>
                                            <td className="px-6 py-4"><button className="text-blue-600 hover:underline">View Audit</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;