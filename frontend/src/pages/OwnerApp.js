// frontend/src/pages/OwnerDashboard.js
// Complete with ALL buttons - Notification Bell, Logout, Chat, Search

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, Users, Truck, Wallet, CreditCard, Bell, BellRing,
  LogOut, MessageCircle, X, Send, CheckCircle, Clock,
  AlertCircle, ChevronLeft, Plus, Eye, EyeOff, Search,
  Filter, UserPlus, TruckIcon, TrendingUp, ArrowUpRight,
  ArrowDownRight, Settings, Shield, Star, Menu, Calendar,
  DollarSign, Phone, Mail, MapPin, FileText, Copy
} from 'lucide-react';

const API = 'https://mg-qw5s.onrender.com';

export default function OwnerDashboard() {
  const [availableDrivers, setAvailableDrivers] = useState([]);
const [selectedDriverId, setSelectedDriverId] = useState('');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneNumber] = useState('9876542345'); // SEARCH - ADDED
  
  // Owner data
  const [owner, setOwner] = useState(null);
  const [stats, setStats] = useState({
    totalVehicles: 0,
    totalDrivers: 0,
    todayCollection: 0,
    pendingDues: 0
  });
  
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  
  // Modal states
  const [showNotif, setShowNotif] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);
  
  // Form states
  const [newVehicle, setNewVehicle] = useState({ number: '', model: '', rent: 850 });
  const [newDriver, setNewDriver] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      let h = n.getHours();
      let m = String(n.getMinutes()).padStart(2, '0');
      setTime(`${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const token = () => localStorage.getItem('token');
  const ownerId = () => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u.id || 1;
  };

  // OwnerDashboard.js - Update fetchAllData function
// Add these states at the top with other states

// Add this function to fetch available drivers
const fetchAvailableDrivers = async () => {
  try {
    const response = await fetch(`${API}/api/payment/owner/drivers/list?ownerId=${ownerId()}`, {
      headers: { Authorization: `Bearer ${token()}` }
    });
    const data = await response.json();
    setAvailableDrivers(data.drivers || []);
  } catch (err) {
    console.error('Fetch drivers error:', err);
  }
};

// Call this when opening Add Vehicle modal
const openAddVehicleModal = () => {
  setShowAddVehicle(true);
  fetchAvailableDrivers();
  setSelectedDriverId('');
  setNewVehicle({ number: '', model: '', rent: 850 });
};

// Updated addVehicle function with driver assignment
const addVehicle = async () => {
  if (!newVehicle.number || !newVehicle.model) {
    alert('Please fill vehicle number and model');
    return;
  }
  
  try {
    const response = await fetch(`${API}/api/payment/owner/vehicles`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token()}` 
      },
      body: JSON.stringify({
        owner_id: ownerId(),
        vehicle_number: newVehicle.number.toUpperCase(),
        vehicle_model: newVehicle.model,
        daily_rent: parseFloat(newVehicle.rent),
        driver_id: selectedDriverId || null  // Assign driver if selected
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      alert('✅ Vehicle added successfully!');
      setShowAddVehicle(false);
      setNewVehicle({ number: '', model: '', rent: 850 });
      setSelectedDriverId('');
      fetchAllData(); // Refresh vehicles list
    } else {
      alert(data.message || 'Failed to add vehicle');
    }
  } catch (error) {
    console.error('Add vehicle error:', error);
    alert('Network error: ' + error.message);
  }
};
const fetchAllData = useCallback(async () => {
  setLoading(true);
  try {
    const H = { Authorization: `Bearer ${token()}` };
    
    // DIRECT OWNER ID = 1 (hardcoded for 9876542345)
    const oId = 1;
    
    console.log('Fetching data for owner ID:', oId);
    
    const [vehiclesRes, driversRes, statsRes, notifRes] = await Promise.all([
      fetch(`${API}/api/payment/owner/vehicles?ownerId=${oId}`, { headers: H }),
      fetch(`${API}/api/payment/owner/drivers/list?ownerId=${oId}`, { headers: H }),
      fetch(`${API}/api/payment/owner/stats?ownerId=${oId}`, { headers: H }),
      fetch(`${API}/api/payment/owner/notifications?ownerId=${oId}`, { headers: H })
    ]);
    
    if (vehiclesRes.ok) {
      const vehiclesData = await vehiclesRes.json();
      console.log('Vehicles:', vehiclesData);
      setVehicles(vehiclesData);
    }
    
    if (driversRes.ok) {
      const data = await driversRes.json();
      console.log('Drivers:', data);
      setDrivers(data.drivers || []);
    }
    
    if (statsRes.ok) {
      const data = await statsRes.json();
      setStats({
        totalVehicles: data.total_vehicles || 0,
        totalDrivers: data.total_drivers || 0,
        todayCollection: data.total_earnings || 0,
        pendingDues: 0
      });
    }
    
    if (notifRes.ok) {
      const notifs = await notifRes.json();
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    }
    
    // Set owner data manually
    setOwner({
      id: 1,
      full_name: 'Rajesh Kumar',
      mobile_number: '9876542345',
      owner_code: 'OWN701951',
      wallet_balance: 0,
      status: 'ACTIVE'
    });
    
  } catch (error) {
    console.error('Fetch error:', error);
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // POLLING FOR REAL-TIME NOTIFICATIONS
  useEffect(() => {
    const pollNotifications = async () => {
      const oId = ownerId();
      if (!oId) return;
      try {
        const res = await fetch(`${API}/api/payment/owner/notifications?ownerId=${oId}`, {
          headers: { Authorization: `Bearer ${token()}` }
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data);
          const newUnread = data.filter(n => !n.is_read).length;
          if (newUnread > unreadCount) {
            // New notification arrived
            setUnreadCount(newUnread);
          } else {
            setUnreadCount(newUnread);
          }
        }
      } catch (err) {
        console.log('Polling error:', err);
      }
    };
    
    pollNotifications();
    const interval = setInterval(pollNotifications, 10000);
    return () => clearInterval(interval);
  }, [unreadCount]);

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const markRead = async () => {
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      const userId = ownerId();
      await fetch(`${API}/api/payment/notifications/mark-read?userId=${userId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` }
      });
    } catch (err) {}
  };

  const openChatWithDriver = async (driver) => {
    setSelectedDriver(driver);
    setShowChat(true);
    setChatHistory([
      { from: 'bot', text: `Chat with ${driver.full_name || driver.name} started. How can I help?` }
    ]);
  };

  const sendMessageToDriver = () => {
    if (!chatInput.trim()) return;
    setChatHistory(prev => [...prev, { from: 'owner', text: chatInput, time: new Date().toLocaleTimeString() }]);
    setTimeout(() => {
      setChatHistory(prev => [...prev, { from: 'bot', text: 'Message sent to driver!', time: new Date().toLocaleTimeString() }]);
    }, 500);
    setChatInput('');
  };

  const addDriver = async () => {
    if (!newDriver.name || !newDriver.phone) {
      alert('Please fill name and phone');
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(newDriver.name)) {
      alert('❌ Name cannot contain numbers!');
      return;
    }
    if (!/^\d{10}$/.test(newDriver.phone)) {
      alert('❌ Phone must be 10 digits');
      return;
    }
    try {
      const response = await fetch(`${API}/api/payment/owner/add-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          full_name: newDriver.name,
          mobile_number: newDriver.phone,
          owner_id: ownerId()
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('✅ Driver added successfully!');
        setShowAddDriver(false);
        setNewDriver({ name: '', phone: '', email: '' });
        fetchAllData();
      } else {
        alert(data.message || 'Failed to add driver');
      }
    } catch (error) {
      console.error('Add driver error:', error);
      alert('Network error');
    }
  };

  // Filter drivers based on search
  const filteredDrivers = drivers.filter(driver => 
    (driver.full_name || driver.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (driver.phone_number || driver.phone || '').includes(searchQuery)
  );

  // Dynamic header title
  const getHeaderTitle = () => {
    const titles = {
      'home': 'Fleet Manager',
      'drivers': 'Drivers',
      'vehicles': 'Vehicles',
      'payments': 'Payments',
      'profile': 'Profile'
    };
    return titles[activeTab] || 'MobilityGrid';
  };

  const getHeaderSubtitle = () => {
    const subtitles = {
      'home': 'Command Center',
      'drivers': `${filteredDrivers.length} Active Drivers`,
      'vehicles': `${vehicles.length} Vehicles`,
      'payments': 'Transaction History',
      'profile': owner?.name || 'Owner Profile'
    };
    return subtitles[activeTab] || '';
  };

  const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-xl font-black text-slate-800 mt-1">₹{value.toLocaleString('en-IN')}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-1">
              {trend === 'up' ? <ArrowUpRight size={10} className="text-emerald-500" /> : <ArrowDownRight size={10} className="text-red-500" />}
              <span className={`text-[9px] font-black ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>12.5%</span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  );

  // HOME TAB
  const HomeTab = () => (
    <div className="space-y-4 pb-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="TOTAL FLEET" value={stats.totalVehicles} icon={Truck} color="bg-blue-600" />
        <StatCard title="ACTIVE DRIVERS" value={stats.totalDrivers} icon={Users} color="bg-emerald-600" />
        <StatCard title="TODAY'S COLLECTION" value={stats.todayCollection} icon={Wallet} color="bg-amber-600" trend="up" />
        <StatCard title="PENDING DUES" value={stats.pendingDues} icon={AlertCircle} color="bg-red-600" trend="down" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setShowAddVehicle(true)} className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 text-white text-left">
          <Truck size={20} className="mb-2 opacity-80" />
          <p className="text-xs font-black">Add Vehicle</p>
          <p className="text-[9px] opacity-70">Register new fleet</p>
        </button>
        <button onClick={() => setShowAddDriver(true)} className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 text-white text-left">
          <UserPlus size={20} className="mb-2 opacity-80" />
          <p className="text-xs font-black">Add Driver</p>
          <p className="text-[9px] opacity-70">Onboard new driver</p>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Recent Drivers</h3>
          <button onClick={() => setActiveTab('drivers')} className="text-[10px] text-blue-600 font-black">View All →</button>
        </div>
        <div className="divide-y">
          {drivers.slice(0, 5).map((driver, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-black text-lg">
                  {driver.full_name?.charAt(0) || driver.name?.charAt(0) || 'D'}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">{driver.full_name || driver.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{driver.phone_number || driver.phone}</p>
                </div>
              </div>
              <button 
                onClick={() => openChatWithDriver(driver)}
                className="p-2 rounded-lg bg-blue-50 text-blue-600"
              >
                <MessageCircle size={14} />
              </button>
            </div>
          ))}
          {drivers.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs">No drivers added yet</p>
              <button onClick={() => setShowAddDriver(true)} className="mt-2 text-blue-600 text-xs font-black">+ Add Driver</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // DRIVERS TAB with SEARCH
  const DriversTab = () => (
    <div className="space-y-3 pb-4">
      {/* SEARCH BAR - ADDED */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X size={14} className="text-slate-400" />
          </button>
        )}
      </div>
      
      <button onClick={() => setShowAddDriver(true)} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2">
        <UserPlus size={16} /> Add New Driver
      </button>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="divide-y">
          {filteredDrivers.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {searchQuery ? 'No drivers match your search' : 'No drivers added yet'}
            </div>
          ) : (
            filteredDrivers.map((driver, i) => (
              <div key={i} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">
                      {driver.full_name?.charAt(0) || driver.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-slate-800">{driver.full_name || driver.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{driver.phone_number || driver.phone}</p>
                      <p className="text-[9px] text-slate-400">Vehicle: {driver.assigned_vehicle || 'Not Assigned'}</p>
                    </div>
                  </div>
                  <button onClick={() => openChatWithDriver(driver)} className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <MessageCircle size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // VEHICLES TAB
  const VehiclesTab = () => (
  <div className="space-y-3 pb-4">
    <button 
      onClick={openAddVehicleModal}  // Use updated function
      className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2"
    >
      <Plus size={16} /> Add Vehicle
    </button>
    
    <div className="space-y-3">
      {vehicles.map((vehicle, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Truck size={16} className="text-amber-600" />
              </div>
              <div>
                <p className="font-black text-slate-800">{vehicle.vehicle_number}</p>
                <p className="text-[10px] text-slate-400">{vehicle.vehicle_model}</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700">
              ₹{vehicle.daily_rent}/day
            </span>
          </div>
          
          {/* Assigned Driver Info */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <div>
              <p className="text-[10px] text-slate-400">Assigned Driver</p>
              <p className="text-xs font-black text-slate-800">
                {vehicle.driver_name || 'Not Assigned'}
              </p>
              {vehicle.driver_phone && (
                <p className="text-[9px] text-slate-400 font-mono">{vehicle.driver_phone}</p>
              )}
            </div>
            <span className={`text-[9px] font-black px-2 py-1 rounded-full ${
              vehicle.status === 'ASSIGNED' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-amber-100 text-amber-700'
            }`}>
              {vehicle.status === 'ASSIGNED' ? 'ASSIGNED' : 'AVAILABLE'}
            </span>
          </div>
        </div>
      ))}
      
      {vehicles.length === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center text-slate-400">
          <Truck size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No vehicles yet</p>
          <button onClick={openAddVehicleModal} className="mt-2 text-blue-600 text-xs font-black">
            + Add your first vehicle
          </button>
        </div>
      )}
    </div>
  </div>
);

  // PAYMENTS TAB
  const PaymentsTab = () => (
    <div className="space-y-4 pb-4">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-5 text-white">
        <p className="text-[10px] font-black opacity-80">Total Collection</p>
        <p className="text-3xl font-black">₹{stats.todayCollection.toLocaleString('en-IN')}</p>
        <p className="text-[10px] opacity-70 mt-1">Last 30 days</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-[10px] font-black text-slate-400 uppercase">Transaction History</h3>
        </div>
        <div className="divide-y">
          {transactions.map((tx, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-slate-800">{tx.driver_name || 'Driver'}</p>
                <p className="text-[9px] text-slate-400">{new Date(tx.order_completion_date || tx.date).toLocaleDateString()}</p>
              </div>
              <p className="text-sm font-black text-emerald-600">₹{tx.order_amount || tx.amount}</p>
            </div>
          ))}
          {transactions.length === 0 && <div className="p-8 text-center text-slate-400">No transactions</div>}
        </div>
      </div>
    </div>
  );

  // PROFILE TAB
  // PROFILE TAB in OwnerDashboard.js
const ProfileTab = () => (
  <div className="space-y-4 pb-4">
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 text-white text-center">
      <div className="w-20 h-20 rounded-full bg-white/20 mx-auto flex items-center justify-center text-3xl font-black mb-3">
        {owner?.full_name?.charAt(0) || owner?.name?.charAt(0) || 'O'}
      </div>
      <h2 className="text-lg font-black">{owner?.full_name || owner?.name || 'Owner'}</h2>
      <p className="text-xs text-blue-200">Owner Code: {owner?.owner_code || 'OWN001'}</p>
    </div>
    <div className="bg-white rounded-2xl p-4 space-y-3 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center py-2 border-b border-slate-100">
  <span className="text-xs text-slate-500">Phone</span>
  <span className="text-xs font-black font-mono">{owner?.mobile_number || '9876542345'}</span>
</div>
      <div className="flex justify-between items-center py-2 border-b border-slate-100">
        <span className="text-xs text-slate-500">Wallet Balance</span>
        <span className="text-xs font-black text-emerald-600">₹{parseFloat(owner?.wallet_balance || 0).toLocaleString('en-IN')}</span>
      </div>
      <div className="flex justify-between items-center py-2">
        <span className="text-xs text-slate-500">Status</span>
        <span className="text-xs font-black text-emerald-600">{owner?.status || 'ACTIVE'}</span>
      </div>
    </div>
    <button onClick={logout} className="w-full bg-red-50 text-red-600 py-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2">
      <LogOut size={14} /> Logout
    </button>
  </div>
);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="w-full max-w-[412px] mx-auto bg-slate-50 min-h-screen shadow-2xl relative flex flex-col">
        
        {/* Status Bar */}
        <div className="bg-slate-900 text-white text-[11px] px-4 py-2 flex justify-between">
          <span className="text-emerald-400 font-black text-[10px] tracking-widest">OWNER PORTAL</span>
          <span>{time}</span>
        </div>

        {/* Header with ALL BUTTONS - Notification Bell, Logout, Search (in drivers tab only) */}
        <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-lg font-black text-slate-800">{getHeaderTitle()}</h1>
            <p className="text-[10px] text-slate-400 font-black">{getHeaderSubtitle()}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* NOTIFICATION BELL */}
            <button onClick={() => setShowNotif(!showNotif)} className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition">
              {unreadCount > 0 ? <BellRing size={18} className="text-blue-600" /> : <Bell size={18} className="text-slate-600" />}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {/* LOGOUT BUTTON */}
            <button onClick={logout} className="p-2 rounded-xl bg-red-50 hover:bg-red-100 transition">
              <LogOut size={18} className="text-red-600" />
            </button>
          </div>
        </div>

        {/* Notification Panel */}
        {showNotif && (
          <div className="absolute top-[88px] right-3 w-72 bg-white rounded-2xl shadow-2xl border z-50">
            <div className="px-4 py-2 border-b flex justify-between items-center">
              <span className="text-[10px] font-black">Notifications</span>
              <button onClick={() => setShowNotif(false)}><X size={14} /></button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">No notifications</div>
              ) : (
                notifications.map((n, i) => (
                  <div key={i} className={`px-4 py-3 border-b ${!n.is_read ? 'bg-blue-50' : ''}`}>
                    <p className="text-xs font-black">{n.title}</p>
                    <p className="text-[10px] text-slate-500">{n.message}</p>
                    <p className="text-[9px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
          {loading ? (
            <div className="text-center py-16 text-xs font-black text-slate-400 animate-pulse">Loading...</div>
          ) : (
            <>
              {activeTab === 'home' && <HomeTab />}
              {activeTab === 'drivers' && <DriversTab />}
              {activeTab === 'vehicles' && <VehiclesTab />}
              {activeTab === 'payments' && <PaymentsTab />}
              {activeTab === 'profile' && <ProfileTab />}
            </>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 max-w-[412px] mx-auto bg-white border-t border-slate-200 h-16 flex justify-around items-center z-50 shadow-[0_-4px_15px_rgba(0,0,0,0.04)]">
          {[
            { id: 'home', Icon: Home, label: 'Home' },
            { id: 'drivers', Icon: Users, label: 'Drivers' },
            { id: 'vehicles', Icon: Truck, label: 'Fleet' },
            { id: 'payments', Icon: Wallet, label: 'Payments' },
            { id: 'profile', Icon: Settings, label: 'Profile' },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                setSearchQuery(''); // Reset search when changing tabs
              }}
              className={`flex flex-col items-center gap-1 transition-all ${activeTab === id ? 'text-blue-600 -translate-y-0.5' : 'text-slate-400'}`}
            >
              <Icon size={activeTab === id ? 22 : 20} />
              <span className="text-[9px] font-black tracking-wide">{label}</span>
            </button>
          ))}
        </div>

        {/* Chat Modal */}
        {showChat && selectedDriver && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm h-[500px] flex flex-col">
              <div className="p-4 bg-blue-600 text-white rounded-t-3xl flex justify-between items-center">
                <div>
                  <h3 className="font-black">{selectedDriver.full_name || selectedDriver.name}</h3>
                  <p className="text-[10px] text-blue-200">{selectedDriver.phone_number || selectedDriver.phone}</p>
                </div>
                <button onClick={() => setShowChat(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.from === 'owner' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${msg.from === 'owner' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                      {msg.text}
                      <div className={`text-[9px] mt-1 ${msg.from === 'owner' ? 'text-blue-200' : 'text-slate-400'}`}>{msg.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t flex gap-2">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessageToDriver()}
                  placeholder="Type message..." className="flex-1 border rounded-xl px-3 py-2 text-sm" />
                <button onClick={sendMessageToDriver} className="bg-blue-600 text-white p-2 rounded-xl"><Send size={16} /></button>
              </div>
            </div>
          </div>
        )}

        {/* Add Vehicle Modal with Driver Assignment */}
{showAddVehicle && (
  <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
    <div className="bg-white rounded-3xl w-full max-w-sm p-6">
      <h3 className="text-lg font-black mb-4">Add New Vehicle</h3>
      
      {/* Vehicle Number */}
      <input 
        type="text"
        placeholder="Vehicle Number (e.g., MH01AB1234)" 
        className="w-full border rounded-xl p-3 mb-3 text-sm" 
        value={newVehicle.number} 
        onChange={e => setNewVehicle({...newVehicle, number: e.target.value})} 
      />
      
      {/* Vehicle Model */}
      <input 
        placeholder="Model (e.g., Tata Ace)" 
        className="w-full border rounded-xl p-3 mb-3 text-sm"
        value={newVehicle.model} 
        onChange={e => setNewVehicle({...newVehicle, model: e.target.value})} 
      />
      
      {/* Daily Rent */}
      <input 
        type="number" 
        placeholder="Daily Rent (₹)" 
        className="w-full border rounded-xl p-3 mb-3 text-sm"
        value={newVehicle.rent} 
        onChange={e => setNewVehicle({...newVehicle, rent: parseInt(e.target.value)})} 
      />
      
      {/* Assign Driver - Dropdown */}
      <div className="mb-4">
        <label className="block text-xs font-black text-slate-500 mb-1">Assign Driver (Optional)</label>
        <select 
          value={selectedDriverId} 
          onChange={(e) => setSelectedDriverId(e.target.value)}
          className="w-full border rounded-xl p-3 text-sm bg-white"
        >
          <option value="">-- Select Driver --</option>
          {availableDrivers.map(driver => (
            <option key={driver.id} value={driver.id}>
              {driver.full_name} - {driver.mobile_number}
            </option>
          ))}
        </select>
        {availableDrivers.length === 0 && (
          <p className="text-[10px] text-slate-400 mt-1">No drivers available. Add a driver first.</p>
        )}
      </div>
      
      {/* Buttons */}
      <div className="flex gap-3">
        <button 
          onClick={() => setShowAddVehicle(false)} 
          className="flex-1 py-3 bg-slate-100 rounded-xl text-sm font-black"
        >
          Cancel
        </button>
        <button 
          onClick={addVehicle} 
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-black"
        >
          Add Vehicle
        </button>
      </div>
    </div>
  </div>
)}

        {/* Add Driver Modal */}
        {showAddDriver && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6">
              <h3 className="text-lg font-black mb-4">Add Driver</h3>
              <input placeholder="Full Name (Letters only)" className="w-full border rounded-xl p-3 mb-3 text-sm"
                value={newDriver.name} onChange={e => setNewDriver({...newDriver, name: e.target.value})} />
              <input placeholder="Phone Number (10 digits)" className="w-full border rounded-xl p-3 mb-3 text-sm"
                value={newDriver.phone} onChange={e => setNewDriver({...newDriver, phone: e.target.value.replace(/\D/g, '').slice(0,10)})} />
              <input placeholder="Email (optional)" className="w-full border rounded-xl p-3 mb-4 text-sm"
                value={newDriver.email} onChange={e => setNewDriver({...newDriver, email: e.target.value})} />
              <div className="flex gap-3">
                <button onClick={() => setShowAddDriver(false)} className="flex-1 py-3 bg-slate-100 rounded-xl text-sm font-black">Cancel</button>
                <button onClick={addDriver} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-black">Add</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}