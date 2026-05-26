// frontend/src/pages/OwnerApp.jsx
import { useState, useEffect } from 'react';
import { 
  Wifi, Battery, Truck, Users, Wallet, LogOut, Plus, 
  Bell, Search, MessageCircle, X, Send, Home, User,
  TrendingUp, Shield, Award, Clock, CheckCircle, 
  UserPlus, FileText, Copy, Activity, Building2, 
  MapPin, Scroll, Fingerprint, FileCheck2, Eye
} from 'lucide-react';

export default function OwnerApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lang, setLang] = useState('en');
  const [currentTime, setCurrentTime] = useState('');
  const [showChatbot, setShowChatbot] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { type: 'bot', message: 'Hello! How can I help you with your fleet today?' }
  ]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  
  // Form states
  const [newVehicle, setNewVehicle] = useState({ model: '', plate: '', rent: '' });
  const [newDriver, setNewDriver] = useState({ name: '', phone: '', license: '' });
  const [selectedDriver, setSelectedDriver] = useState('');
  const [availableDrivers, setAvailableDrivers] = useState([]);
  
  // Data states
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [stats, setStats] = useState({ totalVehicles: 0, totalDrivers: 0, totalEarnings: 0 });
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Driver Incident", message: "Amit Sharma reported battery issue", time: "11:30 AM", read: false }
  ]);

  const user = {
    name: "Amitesh Roy",
    usercode: "OWN_DEMO_001",
    company: "EcoFleet India Logistics Corp",
    phone: "+91 9876542345",
    email: "amitesh@ecofleet.in",
    cin: "U60231MH2021PTC361092",
    location: "Mumbai Cluster Node"
  };

  // Fetch data from backend
  const fetchDashboardData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      // Fetch vehicles
      const vehicleRes = await fetch('https://mg-qw5s.onrender.com/api/owner/vehicles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const vehicleData = await vehicleRes.json();
      if (Array.isArray(vehicleData)) {
        setVehicles(vehicleData.map(v => ({
          id: v.id,
          plate: v.vehicle_number,
          model: v.vehicle_age || 'EV Truck',
          driver: v.driver_name || 'Unassigned',
          rent: v.daily_rent || 0,
          status: v.driver_name ? 'Bound & Active' : 'Awaiting Assignment'
        })));
      }
      
      // Fetch drivers
      const driverRes = await fetch('https://mg-qw5s.onrender.com/api/owner/drivers/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const driverData = await driverRes.json();
      if (driverData.drivers) {
        setDrivers(driverData.drivers.map(d => ({
          id: d.driver_code,
          name: d.full_name,
          phone: d.phone_number || 'N/A',
          license: 'DL-XXXXXX',
          status: 'Verified & Cleared'
        })));
        setAvailableDrivers(driverData.drivers);
      }
      
      // Fetch stats
      const statsRes = await fetch('https://mg-qw5s.onrender.com/api/owner/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      setStats({
        totalVehicles: statsData.total_vehicles || vehicles.length,
        totalDrivers: statsData.total_drivers || drivers.length,
        totalEarnings: statsData.total_earnings || 1550
      });
    } catch (err) {
      console.error('Fetch error:', err);
      // Demo data if API fails
      setVehicles([
        { id: 1, plate: "MH-12-QX-4019", model: "Tata Ace EV Truck", driver: "Rajesh Kumar", rent: 850, status: "Bound & Active" },
        { id: 2, plate: "MH-14-EU-8821", model: "Mahindra Treo Zor", driver: "Amit Sharma", rent: 700, status: "Bound & Active" }
      ]);
      setDrivers([
        { id: 1, name: "Rajesh Kumar", phone: "9876543210", license: "DL-142021008892", status: "Verified & Cleared" },
        { id: 2, name: "Amit Sharma", phone: "9876543211", license: "DL-142021008893", status: "Verified & Cleared" }
      ]);
      setAvailableDrivers([
        { driver_code: 'DRV_DEMO_001', full_name: 'Rajesh Kumar' },
        { driver_code: 'DRV_DEMO_002', full_name: 'Amit Sharma' }
      ]);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // MODIFICATION: Polling add kiya hai. Har 10 second mein API check karega ki Driver ne payment kar di kya.
  // Isse real-time stats update ho jayenge bina Papa ko page refresh kiye.
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 10000); // 10 seconds polling
    return () => clearInterval(interval);
  }, []);

  // Update time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Add Vehicle with Driver Assignment
  const handleAddVehicle = async () => {
    if (!newVehicle.model || !newVehicle.plate || !newVehicle.rent) {
      alert('Please fill all vehicle details');
      return;
    }
    
    const token = localStorage.getItem('token');
    const selectedDriverObj = availableDrivers.find(d => d.driver_code === selectedDriver);
    
    try {
      const response = await fetch('https://mg-qw5s.onrender.com/api/owner/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vehicle_number: newVehicle.plate.toUpperCase(),
          vehicle_age: 'New',
          condition: 'Good',
          area: 'Mumbai',
          daily_rent: parseInt(newVehicle.rent),
          fine_per_day: 100,
          rental_from: new Date().toISOString(),
          rental_to: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
          payment_deadline: 'End of Day',
          charging_station: 'MG Hub',
          driver_name: selectedDriverObj?.full_name || 'Unassigned',
          driver_phone: selectedDriver ? '9876542345' : null
        })
      });
      
      if (response.ok) {
        setVehicles([...vehicles, { 
          id: vehicles.length + 1, 
          plate: newVehicle.plate.toUpperCase(), 
          model: newVehicle.model, 
          driver: selectedDriverObj?.full_name || 'Unassigned', 
          rent: parseInt(newVehicle.rent), 
          status: selectedDriver ? 'Bound & Active' : 'Awaiting Assignment'
        }]);
        setNewVehicle({ model: '', plate: '', rent: '' });
        setSelectedDriver('');
        setShowAddVehicle(false);
        alert('Vehicle added successfully!');
      } else {
        const err = await response.json();
        alert(err.message || 'Failed to add vehicle');
      }
    } catch (err) {
      console.error('Add vehicle error:', err);
      alert('Failed to add vehicle');
    }
  };

  // Add Driver
  const handleAddDriver = async () => {
    if (!newDriver.name || !newDriver.phone || !newDriver.license) {
      alert('Please fill all driver details');
      return;
    }
    
    if (!/^\d{10}$/.test(newDriver.phone)) {
      setPhoneError('Phone number must be exactly 10 digits');
      return;
    }
    setPhoneError('');
    
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch('https://mg-qw5s.onrender.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: newDriver.phone,
          email: `${newDriver.name.toLowerCase().replace(/\s/g, '')}@driver.com`,
          password: newDriver.phone.slice(-6),
          fullName: newDriver.name,
          userType: 'VEHICLE_DRIVER',
          referralCode: user.usercode
        })
      });
      
      if (response.ok) {
        setDrivers([...drivers, { 
          id: drivers.length + 1, 
          name: newDriver.name, 
          phone: newDriver.phone, 
          license: newDriver.license, 
          status: 'Pending Verification'
        }]);
        setNewDriver({ name: '', phone: '', license: '' });
        setShowAddDriver(false);
        alert('Driver added successfully!');
      } else {
        alert('Failed to add driver');
      }
    } catch (err) {
      console.error('Add driver error:', err);
      alert('Failed to add driver');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim()) return;
    setChatHistory([...chatHistory, { type: 'user', message: chatMessage }]);
    setTimeout(() => {
      setChatHistory(prev => [...prev, { type: 'bot', message: 'Thank you. Our support team will respond shortly.' }]);
    }, 500);
    setChatMessage('');
  };

  const t = {
    en: {
      dashboard: 'Dashboard',
      vehicles: 'My Vehicles',
      drivers: 'Drivers',
      profile: 'Profile',
      addVehicle: 'Add Vehicle',
      addDriver: 'Add Driver',
      fleet: 'Active Running Fleet',
      verified: 'Verified Operator Desk',
      earned: "Today's Earnings",
      referral: 'Referral Code',
      copy: 'Copy',
      company: 'Company Details',
      credentials: 'Credentials Status'
    },
    hi: {
      dashboard: 'डैशबोर्ड',
      vehicles: 'मेरे वाहन',
      drivers: 'ड्राइवर',
      profile: 'प्रोफाइल',
      addVehicle: 'वाहन जोड़ें',
      addDriver: 'ड्राइवर जोड़ें',
      fleet: 'सक्रिय बेड़ा',
      verified: 'सत्यापित ड्राइवर',
      earned: 'आज की कमाई',
      referral: 'रेफरल कोड',
      copy: 'कॉपी',
      company: 'कंपनी विवरण',
      credentials: 'प्रमाण पत्र स्थिति'
    }
  };
  const tx = t[lang];

  const DashboardContent = () => (
    <div className="space-y-4 pb-20">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border p-4 rounded-xl">
          <div className="flex justify-between items-center">
            <div><span className="text-[10px] uppercase font-bold text-slate-400">{tx.fleet}</span><b className="text-2xl font-black block">{vehicles.length} Units</b></div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Truck size={20} className="text-blue-600" /></div>
          </div>
        </div>
        <div className="bg-white border p-4 rounded-xl">
          <div className="flex justify-between items-center">
            <div><span className="text-[10px] uppercase font-bold text-slate-400">{tx.verified}</span><b className="text-2xl font-black block">{drivers.length} Drivers</b></div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><Users size={20} className="text-emerald-600" /></div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-4">
        <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-slate-400 uppercase">{tx.earned}</span><TrendingUp size={16} className="text-green-600" /></div>
        <p className="text-2xl font-bold">₹{stats.totalEarnings}</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center"><h3 className="text-xs font-bold text-slate-400 uppercase">{tx.vehicles}</h3><button onClick={() => setShowAddVehicle(true)} className="text-blue-600 text-xs font-bold flex items-center gap-1"><Plus size={12} /> {tx.addVehicle}</button></div>
        {vehicles.map(vehicle => (
          <div key={vehicle.id} className="bg-white border rounded-xl p-3.5">
            <div className="flex justify-between"><div><h4 className="text-xs font-bold">{vehicle.model}</h4><span className="text-[10px] font-mono text-slate-400">{vehicle.plate}</span></div><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${vehicle.status === 'Bound & Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{vehicle.status}</span></div>
            <div className="border-t mt-2 pt-2 flex justify-between text-[11px]"><span className="text-slate-500">Driver: <b>{vehicle.driver}</b></span><span className="text-slate-700">Rent: ₹{vehicle.rent}/day</span></div>
          </div>
        ))}
      </div>
    </div>
  );

  const VehiclesContent = () => (
    <div className="space-y-4 pb-20">
      <div className="flex justify-between items-center"><h2 className="text-lg font-bold">{tx.vehicles}</h2><button onClick={() => setShowAddVehicle(true)} className="bg-blue-600 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1"><Plus size={14} /> {tx.addVehicle}</button></div>
      {vehicles.map(vehicle => (
        <div key={vehicle.id} className="bg-white border rounded-xl p-4">
          <div className="flex justify-between"><div><h3 className="font-bold">{vehicle.model}</h3><p className="text-xs text-slate-500">{vehicle.plate}</p></div><span className={`px-2 py-1 text-xs rounded-full ${vehicle.status === 'Bound & Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{vehicle.status}</span></div>
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t"><div><p className="text-[10px] text-slate-400">Driver</p><p className="font-medium text-sm">{vehicle.driver}</p></div><div><p className="text-[10px] text-slate-400">Daily Rent</p><p className="font-medium text-sm">₹{vehicle.rent}</p></div></div>
        </div>
      ))}
    </div>
  );

  const DriversContent = () => (
    <div className="space-y-4 pb-20">
      <div className="flex justify-between items-center"><h2 className="text-lg font-bold">{tx.drivers}</h2><button onClick={() => setShowAddDriver(true)} className="bg-blue-600 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1"><UserPlus size={14} /> {tx.addDriver}</button></div>
      {drivers.map(driver => (
        <div key={driver.id} className="bg-white border rounded-xl p-4">
          <div className="flex justify-between"><div><h3 className="font-bold">{driver.name}</h3><p className="text-xs text-slate-500">{driver.phone}</p></div><span className={`px-2 py-1 text-xs rounded-full ${driver.status === 'Verified & Cleared' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{driver.status}</span></div>
          <div className="mt-2 pt-2 border-t"><p className="text-[10px] text-slate-400">License No.</p><p className="font-mono text-xs">{driver.license}</p></div>
        </div>
      ))}
    </div>
  );

  const ProfileContent = () => (
    <div className="space-y-4 pb-20">
      <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white p-5 rounded-2xl">
        <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-lg font-bold">{user.name.charAt(0)}</div><div><h3 className="font-bold">{user.name}</h3><p className="text-xs text-blue-200">{user.usercode}</p></div></div>
        <div className="border-t border-white/10 mt-3 pt-3 flex justify-between text-[10px]"><span>Tier: <b>Premium Enterprise</b></span><span>API: <b className="text-emerald-400">Live</b></span></div>
      </div>
      <div className="bg-white border rounded-2xl p-4"><h3 className="font-bold mb-3 flex items-center gap-2"><Building2 size={14} /> {tx.company}</h3><div className="space-y-2"><div className="flex justify-between"><span className="text-slate-500">Company</span><span className="font-medium">{user.company}</span></div><div className="flex justify-between"><span className="text-slate-500">CIN</span><span className="font-mono text-xs">{user.cin}</span></div><div className="flex justify-between"><span className="text-slate-500">Location</span><span className="font-medium">{user.location}</span></div><div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-medium">{user.phone}</span></div><div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium">{user.email}</span></div></div></div>
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white"><p className="text-xs opacity-80">{tx.referral}</p><p className="text-xl font-bold font-mono">{user.usercode}</p><button onClick={() => navigator.clipboard.writeText(user.usercode)} className="mt-2 bg-white/20 px-3 py-1 rounded-lg text-xs flex items-center gap-1"><Copy size={12} /> {tx.copy}</button><p className="text-[10px] mt-2">🎁 Earn ₹100 for every friend who joins!</p></div>
    </div>
  );

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <DashboardContent />;
      case 'vehicles': return <VehiclesContent />;
      case 'drivers': return <DriversContent />;
      case 'profile': return <ProfileContent />;
      default: return <DashboardContent />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-[412px] mx-auto bg-white min-h-screen shadow-xl relative">
        <div className="bg-slate-950 text-white text-[11px] px-6 py-2 flex items-center justify-between"><span>{currentTime}</span><div className="flex gap-1.5"><Wifi size={14} className="text-emerald-400" /><Battery size={14} /></div></div>
        
        <div className="px-4 py-3 bg-white border-b flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">M</div><div><span className="font-bold text-sm">MobilityGrid</span><span className="text-[9px] text-slate-400 block">Owner Portal</span></div></div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg bg-slate-100"><Search size={14} /></button>
            <div className="relative"><button onClick={() => setShowNotifications(!showNotifications)} className="relative p-1.5 rounded-lg bg-slate-100"><Bell size={14} /></button></div>
            <button onClick={() => setShowChatbot(true)} className="p-1.5 rounded-lg bg-slate-100"><MessageCircle size={14} /></button>
            <div className="flex bg-slate-100 p-0.5 rounded-lg"><button onClick={() => setLang('en')} className={`px-2 py-1 text-[10px] font-bold rounded-md ${lang === 'en' ? 'bg-white text-blue-600' : 'text-slate-400'}`}>EN</button><button onClick={() => setLang('hi')} className={`px-2 py-1 text-[10px] font-bold rounded-md ${lang === 'hi' ? 'bg-white text-blue-600' : 'text-slate-400'}`}>हिं</button></div>
            <button onClick={handleLogout} className="p-1.5 rounded-lg bg-red-50 text-red-600"><LogOut size={14} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4">{renderContent()}</div>

        <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center justify-around">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}><Home size={20} /><span className="text-[10px]">{tx.dashboard}</span></button>
          <button onClick={() => setActiveTab('vehicles')} className={`flex flex-col items-center gap-1 ${activeTab === 'vehicles' ? 'text-blue-600' : 'text-slate-400'}`}><Truck size={20} /><span className="text-[10px]">{tx.vehicles}</span></button>
          <button onClick={() => setActiveTab('drivers')} className={`flex flex-col items-center gap-1 ${activeTab === 'drivers' ? 'text-blue-600' : 'text-slate-400'}`}><Users size={20} /><span className="text-[10px]">{tx.drivers}</span></button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-blue-600' : 'text-slate-400'}`}><User size={20} /><span className="text-[10px]">{tx.profile}</span></button>
        </div>

        {/* Add Vehicle Modal with Driver Dropdown */}
        {showAddVehicle && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-5">
              <div className="flex justify-between mb-4"><h3 className="font-bold text-lg">{tx.addVehicle}</h3><button onClick={() => setShowAddVehicle(false)}><X size={20} /></button></div>
              <input type="text" placeholder="Vehicle Model" value={newVehicle.model} onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})} className="w-full border rounded-xl p-2 mb-3 text-sm" />
              <input type="text" placeholder="Registration Number" value={newVehicle.plate} onChange={(e) => setNewVehicle({...newVehicle, plate: e.target.value.toUpperCase()})} className="w-full border rounded-xl p-2 mb-3 text-sm" />
              <input type="number" placeholder="Daily Rent (₹)" value={newVehicle.rent} onChange={(e) => setNewVehicle({...newVehicle, rent: e.target.value})} className="w-full border rounded-xl p-2 mb-3 text-sm" />
              
              {/* Driver Dropdown */}
              <div className="mb-3">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Assign Driver (Optional)</label>
                <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)} className="w-full border rounded-xl p-2 text-sm bg-white">
                  <option value="">-- Select Driver --</option>
                  {availableDrivers.map(driver => (
                    <option key={driver.driver_code} value={driver.driver_code}>{driver.full_name} ({driver.driver_code})</option>
                  ))}
                </select>
              </div>
              
              <button onClick={handleAddVehicle} className="w-full bg-blue-600 text-white py-2 rounded-xl font-semibold">Add Vehicle</button>
            </div>
          </div>
        )}

        {/* Add Driver Modal */}
        {showAddDriver && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-5">
              <div className="flex justify-between mb-4"><h3 className="font-bold text-lg">{tx.addDriver}</h3><button onClick={() => setShowAddDriver(false)}><X size={20} /></button></div>
              <input type="text" placeholder="Driver Name" value={newDriver.name} onChange={(e) => setNewDriver({...newDriver, name: e.target.value})} className="w-full border rounded-xl p-2 mb-3 text-sm" />
              <input type="tel" placeholder="Phone Number (10 digits)" value={newDriver.phone} onChange={(e) => setNewDriver({...newDriver, phone: e.target.value.replace(/\D/g, '').slice(0,10)})} className={`w-full border rounded-xl p-2 mb-3 text-sm ${phoneError ? 'border-red-500' : ''}`} />
              {phoneError && <p className="text-red-500 text-[10px] -mt-2 mb-2">{phoneError}</p>}
              <input type="text" placeholder="License Number" value={newDriver.license} onChange={(e) => setNewDriver({...newDriver, license: e.target.value})} className="w-full border rounded-xl p-2 mb-3 text-sm" />
              <button onClick={handleAddDriver} className="w-full bg-blue-600 text-white py-2 rounded-xl font-semibold">Add Driver</button>
            </div>
          </div>
        )}

        {/* Chatbot Modal */}
        {showChatbot && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
            <div className="bg-white rounded-t-2xl w-full max-w-[412px] h-3/4 flex flex-col">
              <div className="p-4 bg-blue-600 text-white rounded-t-2xl flex justify-between"><h3 className="font-bold">Assistant</h3><button onClick={() => setShowChatbot(false)}><X size={20} /></button></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">{chatHistory.map((msg, idx) => (<div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-3 rounded-xl ${msg.type === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>{msg.message}</div></div>))}</div>
              <div className="p-3 border-t flex gap-2"><input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()} placeholder="Type message..." className="flex-1 border rounded-xl px-3 py-2 text-sm" /><button onClick={sendChatMessage} className="p-2 bg-blue-600 text-white rounded-xl"><Send size={18} /></button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}