import React, { useState, useEffect } from 'react';
import { 
  Wifi, Battery, Users, Car, Wallet, Plus, CheckCircle,
  Phone, Home, LogOut, CircleUser, Receipt, ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OwnerPWA() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState('');
  const [currentDay, setCurrentDay] = useState('');
  
  // Data States
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ total_vehicles: 0, total_drivers: 0, total_earnings: 0 });
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Driver States
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_BASE = 'https://mg-qw5s.onrender.com';

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(storedUser);
  }, []);

  const fetchOwnerData = async () => {
    if (!user?.id) return;
    const token = localStorage.getItem('token');
    try {
      const statsRes = await fetch(`${API_BASE}/api/payment/owner/stats?ownerId=${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const statsData = await statsRes.json();
      setStats(statsData);

      const driversRes = await fetch(`${API_BASE}/api/payment/owner/drivers/list?ownerId=${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const driversData = await driversRes.json();
      setDrivers(driversData.drivers || []);
    } catch (err) {
      console.error('Failed to fetch owner data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOwnerData(); }, [user]);

  // Date & Time Updater
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      setCurrentTime(`${hours % 12 || 12}:${minutes} ${ampm}`);
      setCurrentDay(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()]);
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleAddDriver = async () => {
    if (!newDriver.name || newDriver.phone.length !== 10) {
      return alert("Please enter valid Name and 10-digit Phone Number.");
    }
    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE}/api/payment/owner/add-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          full_name: newDriver.name,
          mobile_number: newDriver.phone,
          owner_id: user.id
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to add driver');
      
      alert("✅ Driver Added Successfully!");
      setShowAddDriver(false);
      setNewDriver({ name: '', phone: '' });
      fetchOwnerData(); // Refresh list
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  const DashboardContent = () => (
    <div className="flex flex-col gap-4">
      {/* earnings card */}
      <div className="bg-gradient-to-br from-blue-700 to-indigo-900 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="relative z-10">
          <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Total Fleet Earnings</span>
          <h2 className="text-4xl font-black mt-1 tracking-tight">₹{stats.total_earnings?.toLocaleString() || 0}</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('fleet')}>
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center"><Users size={20} className="text-emerald-600"/></div>
          <div><p className="text-2xl font-black text-slate-800">{stats.total_drivers || 0}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Drivers</p></div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center"><Car size={20} className="text-amber-600"/></div>
          <div><p className="text-2xl font-black text-slate-800">{stats.total_vehicles || 0}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vehicles</p></div>
        </div>
      </div>

      <button onClick={() => setShowAddDriver(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 uppercase text-xs tracking-widest transition-transform active:scale-95">
        <Plus size={18} /> ADD NEW DRIVER
      </button>
    </div>
  );

  const FleetContent = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-end mb-2">
        <h3 className="font-black text-slate-800 uppercase tracking-wide">My Drivers</h3>
        <span className="text-[10px] font-bold text-slate-400">{drivers.length} ACTIVE</span>
      </div>
      
      {drivers.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300">
          <Users size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">No drivers assigned yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drivers.map((drv, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-lg">
                  {drv.full_name?.charAt(0).toUpperCase() || 'D'}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm leading-tight">{drv.full_name}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{drv.phone_number}</p>
                  <div className="inline-block px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded text-[9px] text-emerald-600 font-bold mt-1">
                    {drv.assigned_vehicle || 'No Vehicle'}
                  </div>
                </div>
              </div>
              <button className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center hover:bg-blue-50 transition"><Phone size={14} className="text-blue-600"/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const AccountContent = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white text-center relative shadow-lg">
        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center text-3xl font-black mx-auto shadow-inner">{user?.name?.charAt(0) || 'O'}</div>
        <h2 className="text-2xl font-black mt-3">{user?.name || 'Owner Name'}</h2>
        <p className="text-slate-400 text-xs mt-1 font-mono tracking-widest">{user?.phone}</p>
        <div className="mt-4 inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
          <ShieldCheck size={12} /> VERIFIED OWNER
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-3 border-b"><span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Company ID</span><span className="font-mono text-xs font-black text-slate-800">{user?.id?.substring(0,8) || 'N/A'}</span></div>
        <div className="flex justify-between items-center pb-3 border-b"><span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Status</span><span className="text-xs font-black text-emerald-600">ACTIVE</span></div>
      </div>
      
      <button onClick={handleLogout} className="w-full bg-red-50 text-red-600 font-bold py-4 rounded-2xl text-xs tracking-widest uppercase hover:bg-red-100 transition">Log Out Securely</button>
    </div>
  );

  return (
    // THE ULTIMATE STICKY LAYOUT
    <div className="bg-slate-900 w-full min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-[412px] bg-slate-50 h-[100dvh] flex flex-col relative shadow-2xl overflow-hidden">
        
        {/* FIXED HEADER ZONE */}
        <div className="shrink-0 z-50 bg-white">
          <div className="bg-slate-950 text-white text-[11px] px-4 py-2 flex justify-between">
            <div className="flex gap-2"><span className="text-blue-400 font-bold">OWNER PORTAL</span><span>|</span><span>ENG</span></div>
            <div className="flex gap-2"><span>{currentTime}</span><span>{currentDay}</span></div>
            <div className="flex gap-1"><Wifi size={12} className="text-blue-400" /><Battery size={12} /></div>
          </div>

          <div className="px-5 py-4 border-b shadow-sm flex justify-between items-center">
            {/* DYNAMIC TITLE HERE */}
            <span className="font-black text-xl tracking-wide text-slate-800 uppercase">
              {activeTab === 'dashboard' ? 'DASHBOARD' : activeTab === 'fleet' ? 'MY FLEET' : 'ACCOUNT'}
            </span>
          </div>
        </div>

        {/* SCROLLABLE MAIN CONTENT ZONE */}
        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-24 bg-slate-50 scroll-smooth">
          {loading ? <div className="text-center py-10 font-bold tracking-widest text-slate-400 text-xs animate-pulse">LOADING DASHBOARD...</div> : (activeTab === 'dashboard' ? <DashboardContent /> : activeTab === 'fleet' ? <FleetContent /> : <AccountContent />)}
        </div>

        {/* FIXED BOTTOM NAVIGATION ZONE */}
        <div className="absolute bottom-0 w-full bg-white border-t h-[75px] flex justify-around items-center shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-50 pb-safe">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1.5 transition-all w-20 ${activeTab === 'dashboard' ? 'text-blue-600 -translate-y-1' : 'text-slate-400'}`}><Home size={activeTab==='dashboard'?24:22} /><span className="text-[9px] font-black tracking-widest">HOME</span></button>
          <button onClick={() => setActiveTab('fleet')} className={`flex flex-col items-center gap-1.5 transition-all w-20 ${activeTab === 'fleet' ? 'text-blue-600 -translate-y-1' : 'text-slate-400'}`}><Users size={activeTab==='fleet'?24:22} /><span className="text-[9px] font-black tracking-widest">FLEET</span></button>
          <button onClick={() => setActiveTab('account')} className={`flex flex-col items-center gap-1.5 transition-all w-20 ${activeTab === 'account' ? 'text-blue-600 -translate-y-1' : 'text-slate-400'}`}><CircleUser size={activeTab==='account'?24:22} /><span className="text-[9px] font-black tracking-widest">PROFILE</span></button>
        </div>

        {/* ADD DRIVER MODAL */}
        {showAddDriver && (
          <div className="absolute inset-0 bg-slate-900/40 z-[100] flex items-end justify-center backdrop-blur-sm sm:items-center">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in slide-in-from-bottom-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Add New Driver</h3>
                <button onClick={() => setShowAddDriver(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200"><X size={18}/></button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Full Name (No Numbers)</label>
                  {/* MAGIC FIX: REPLACES ANY NUMBER INSTANTLY AS THEY TYPE */}
                  <input type="text" value={newDriver.name} onChange={(e) => setNewDriver({...newDriver, name: e.target.value.replace(/[^a-zA-Z\s]/g, '')})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition" placeholder="e.g. Ramesh Kumar" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Mobile Number</label>
                  <input type="tel" maxLength="10" value={newDriver.phone} onChange={(e) => setNewDriver({...newDriver, phone: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold font-mono tracking-widest text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition" placeholder="9876543210" />
                </div>
                
                <button onClick={handleAddDriver} disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black tracking-widest py-4 rounded-2xl text-xs uppercase shadow-[0_8px_20px_rgba(37,99,235,0.3)] mt-2 transition-transform active:scale-95 disabled:opacity-70">
                  {isSubmitting ? 'ADDING DRIVER...' : 'CONFIRM & ADD'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}