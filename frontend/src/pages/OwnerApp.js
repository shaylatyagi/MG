// frontend/src/pages/OwnerDashboard.js
// Complete with ALL buttons - Notification Bell, Logout, Chat, Search

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, Edit2, Building, MapPin, Mail, Phone, 
  Home, Users, Truck, Wallet, CreditCard, Bell, BellRing,
  LogOut, MessageCircle, X, Send, CheckCircle, Clock,
  AlertCircle, ChevronLeft, Plus, Eye, EyeOff, Search,
  Filter, UserPlus, TruckIcon, TrendingUp, ArrowUpRight,
  ArrowDownRight, Settings, Shield, Star, Menu, Calendar,
  DollarSign, Copy, FileText, Landmark, Fingerprint, FileCheck2
} from 'lucide-react';
import Chatbot from '../components/Chatbot';  // ← "UniversalChatbot" ki jagah "Chatbot"
const API = 'https://mg-qw5s.onrender.com';

export default function OwnerDashboard() {
  const [rentType, setRentType] = useState('DAILY'); // DAILY, WEEKLY, MONTHLY
const rentTypeOptions = [
  { value: 'DAILY', label: 'Daily Rent', multiplier: 1 },
  { value: 'WEEKLY', label: 'Weekly Rent', multiplier: 7 },
  { value: 'MONTHLY', label: 'Monthly Rent', multiplier: 30 }
];
  const [availableDrivers, setAvailableDrivers] = useState([]);
const [selectedDriverId, setSelectedDriverId] = useState('');
const [selectedDriverDetails, setSelectedDriverDetails] = useState(null);
const [showDriverDetailsModal, setShowDriverDetailsModal] = useState(false);
const [assignMode, setAssignMode] = useState('driver'); // 'driver' or 'vehicle'
const [availableVehiclesForDriver, setAvailableVehiclesForDriver] = useState([]);
const [availableDriversForVehicle, setAvailableDriversForVehicle] = useState([]);
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
  // Add these with other useState declarations
const [unassignedDrivers, setUnassignedDrivers] = useState([]);
const [selectedVehicleDetails, setSelectedVehicleDetails] = useState(null);
const [showVehicleDetailModal, setShowVehicleDetailModal] = useState(false);
const [availableUnassignedDrivers, setAvailableUnassignedDrivers] = useState([]);
const [selectedRentType, setSelectedRentType] = useState('DAILY');
const [customRentAmount, setCustomRentAmount] = useState('');
const [unassignedVehicles, setUnassignedVehicles] = useState([]);
const [showAssignModal, setShowAssignModal] = useState(false);
const [selectedDriverForAssign, setSelectedDriverForAssign] = useState(null);
const [selectedVehicleForAssign, setSelectedVehicleForAssign] = useState(null);
const [assigning, setAssigning] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Chat state
  const [showChatbot, setShowChatbot] = useState(false);
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
  const fetchUnassignedDriversList = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API}/api/assignment/unassigned/drivers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) setAvailableUnassignedDrivers(data.data || []);
  } catch (err) {
    console.error('Error fetching unassigned drivers:', err);
  }
};
  // Add this function with other fetch functions
const fetchUnassignedData = async () => {
  try {
    const token = localStorage.getItem('token');
    const [driversRes, vehiclesRes] = await Promise.all([
      fetch(`${API}/api/assignment/unassigned/drivers`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch(`${API}/api/assignment/unassigned/vehicles`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]);
    
    const driversData = await driversRes.json();
    const vehiclesData = await vehiclesRes.json();
    
    if (driversData.success) setUnassignedDrivers(driversData.data || []);
    if (vehiclesData.success) setUnassignedVehicles(vehiclesData.data || []);
  } catch (err) {
    console.error('Error fetching unassigned data:', err);
  }
};
// Add these states at the top with other states
// Fetch available vehicles for selected driver
const fetchAvailableVehicles = async (driverId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API}/api/assignment/available/vehicles?driverId=${driverId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) setAvailableVehiclesForDriver(data.data);
  } catch (err) {
    console.error(err);
  }
};
const DriverDetailsModal = () => {
  if (!selectedDriverDetails) return null;
  
  const driver = selectedDriverDetails;
  const assignedVehicle = vehicles.find(v => v.driver_id === driver.id);
  
  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowDriverDetailsModal(false);
          setSelectedDriverDetails(null);
        }
      }}
    >
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Driver Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white text-center rounded-t-3xl">
          <div className="w-24 h-24 rounded-full bg-white/20 mx-auto flex items-center justify-center text-4xl font-black mb-3">
            {driver.full_name?.charAt(0) || driver.name?.charAt(0)}
          </div>
          <h2 className="text-xl font-black">{driver.full_name || driver.name}</h2>
          <p className="text-sm opacity-90">{driver.driver_code}</p>
          <p className="text-xs opacity-75 mt-1">{driver.phone_number || driver.mobile_number}</p>
        </div>
        
        <div className="p-5">
          {/* Vehicle Assignment Info */}
          <div className="mb-5">
            <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
              <Truck size={18} /> Assigned Vehicle
            </h3>
            {assignedVehicle ? (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-black text-slate-800 text-lg">{assignedVehicle.vehicle_number}</p>
                  <span className="px-2 py-1 rounded-full text-[10px] font-black bg-green-100 text-green-700">
                    ASSIGNED
                  </span>
                </div>
                <p className="text-sm text-slate-600">{assignedVehicle.vehicle_model}</p>
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-green-200">
                  <div>
                    <p className="text-[9px] text-slate-400">Rent Type</p>
                    <p className="text-sm font-black text-emerald-600">{driver.rent_type || assignedVehicle.rent_type || 'DAILY'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400">Rent Amount</p>
                    <p className="text-sm font-black text-emerald-600">
                      ₹{driver.rent_amount || assignedVehicle.rent_amount || assignedVehicle.daily_rent}/{
                        driver.rent_type === 'WEEKLY' ? 'week' : 
                        driver.rent_type === 'MONTHLY' ? 'month' : 'day'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400">Daily Rate</p>
                    <p className="text-sm font-black">₹{assignedVehicle.daily_rent}/day</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400">Status</p>
                    <p className="text-sm font-black text-green-600">ACTIVE</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200">
                <p className="text-amber-600 font-medium">No vehicle assigned yet</p>
                <p className="text-xs text-amber-500 mt-1">Assign a vehicle to see details here</p>
              </div>
            )}
          </div>
          
          {/* Wallet Info */}
          <div className="mb-5">
            <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
              <Wallet size={18} /> Wallet
            </h3>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Current Balance</span>
                <span className="text-xl font-black text-emerald-600">₹{driver.wallet_balance || 0}</span>
              </div>
            </div>
          </div>
          
          {/* Contact Info */}
          <div className="mb-5">
            <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
              <Phone size={18} /> Contact
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Phone</span>
                <span className="text-sm font-mono">{driver.phone_number || driver.mobile_number}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Owner Code</span>
                <span className="text-sm font-mono">{driver.owner_code || 'OWN701951'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500">Joined</span>
                <span className="text-sm">{new Date(driver.created_at).toLocaleDateString() || 'Recently'}</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => {
              setShowDriverDetailsModal(false);
              setSelectedDriverDetails(null);
              openChatWithDriver(driver);
            }}
            className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2"
          >
            <MessageCircle size={16} /> Chat with Driver
          </button>
        </div>
      </div>
    </div>
  );
};
// Fetch available drivers for selected vehicle
const fetchAvailableDrivers = async (vehicleId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API}/api/assignment/available/drivers?vehicleId=${vehicleId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) setAvailableDriversForVehicle(data.data);
  } catch (err) {
    console.error(err);
  }
};

// Call this when opening Add Vehicle modal
const openAddVehicleModal = () => {
  setShowAddVehicle(true);
  fetchAvailableDrivers();
  setSelectedDriverId('');
  setNewVehicle({ number: '', model: '', rent: 850 });
};
const assignDriverToVehicleWithRent = async (vehicleId, driverId, rentType, customRent) => {
  setAssigning(true);
  try {
    const token = localStorage.getItem('token');
    
    // Calculate rent based on type
    let dailyRent = 0;
    if (rentType === 'DAILY') dailyRent = customRent;
    else if (rentType === 'WEEKLY') dailyRent = customRent / 7;
    else if (rentType === 'MONTHLY') dailyRent = customRent / 30;
    
    const response = await fetch(`${API}/api/assignment/assign-with-rent`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        vehicleId,
        driverId,
        rentType,
        rentAmount: customRent,
        dailyRent: Math.round(dailyRent)
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ Vehicle assigned to ${data.driverName} with ${rentType} rent of ₹${customRent}`);
      setShowVehicleDetailModal(false);
      setSelectedVehicleDetails(null);
      // Refresh all data
      fetchAllData();
      fetchUnassignedData();
      // Send notification to driver (backend will handle)
    } else {
      alert(data.error || 'Assignment failed');
    }
  } catch (err) {
    console.error('Assign error:', err);
    alert('Network error');
  } finally {
    setAssigning(false);
  }
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
// Add this function
const handleAssignVehicle = async () => {
  if (!selectedDriverForAssign || !selectedVehicleForAssign) {
    alert('Please select both driver and vehicle');
    return;
  }
  
  setAssigning(true);
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API}/api/assignment/assign`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        driverId: selectedDriverForAssign.id,
        vehicleId: selectedVehicleForAssign.id
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ Successfully assigned ${selectedDriverForAssign.full_name} to vehicle`);
      setShowAssignModal(false);
      setSelectedDriverForAssign(null);
      setSelectedVehicleForAssign(null);
      // Refresh all data
      fetchAllData();
      fetchUnassignedData();
    } else {
      alert(data.error || 'Assignment failed');
    }
  } catch (err) {
    console.error('Assign error:', err);
    alert('Network error');
  } finally {
    setAssigning(false);
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
  console.log('Vehicles raw:', vehiclesData);
  const vehiclesList = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData.vehicles || vehiclesData.data || []);
  console.log('Vehicles list:', vehiclesList);
  setVehicles(vehiclesList);
}
    
    if (driversRes.ok) {
  const data = await driversRes.json();
  console.log('Drivers raw:', data);
  // Handle both array and object response
  const driversList = Array.isArray(data) ? data : (data.drivers || []);
  console.log('Drivers list:', driversList);
  setDrivers(driversList);
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
  // DRIVERS TAB with SEARCH and Assignment - COMPLETE FIXED VERSION
const DriversTab = () => {
  const [selectedDriverForAssignInTab, setSelectedDriverForAssignInTab] = useState(null);
  const [showDriverAssignModal, setShowDriverAssignModal] = useState(false);
  const [availableVehiclesForDriverTab, setAvailableVehiclesForDriverTab] = useState([]);
  const [driverRentType, setDriverRentType] = useState('DAILY');
  const [driverRentAmount, setDriverRentAmount] = useState('');
  
  const fetchAvailableVehiclesForDriverTab = async (driverId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/assignment/available/vehicles?driverId=${driverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setAvailableVehiclesForDriverTab(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleAssignFromDriversTab = async () => {
    if (!selectedDriverForAssignInTab || !selectedVehicleForAssign) {
      alert('Please select both driver and vehicle');
      return;
    }
    
    setAssigning(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/assignment/assign-with-rent`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          vehicleId: selectedVehicleForAssign.id,
          driverId: selectedDriverForAssignInTab.id,
          rentType: driverRentType,
          rentAmount: parseFloat(driverRentAmount),
          dailyRent: driverRentType === 'DAILY' ? parseFloat(driverRentAmount) : 
                     driverRentType === 'WEEKLY' ? parseFloat(driverRentAmount) / 7 : 
                     parseFloat(driverRentAmount) / 30
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Vehicle assigned to ${selectedDriverForAssignInTab.full_name}`);
        setShowDriverAssignModal(false);
        setSelectedDriverForAssignInTab(null);
        setSelectedVehicleForAssign(null);
        fetchAllData();
        fetchUnassignedData();
      } else {
        alert(data.error || 'Assignment failed');
      }
    } catch (err) {
      console.error('Assign error:', err);
      alert('Network error');
    } finally {
      setAssigning(false);
    }
  };
  
  return (
    <div className="space-y-3 pb-4">
      {/* SEARCH BAR */}
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
            filteredDrivers.map((driver, i) => {
              // Check if driver has assigned vehicle
              const hasVehicle = vehicles.some(v => v.driver_id === driver.id);
              const assignedVehicle = vehicles.find(v => v.driver_id === driver.id);
              
              return (
                <div key={i} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">
                        {driver.full_name?.charAt(0) || driver.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-800">{driver.full_name || driver.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{driver.phone_number || driver.phone}</p>
                        <p className="text-[9px] text-slate-400">
                          Vehicle: {assignedVehicle?.vehicle_number || 'Not Assigned'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-full ${
                        hasVehicle ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {hasVehicle ? 'ASSIGNED' : 'UNASSIGNED'}
                      </span>
                      {!hasVehicle && (
                        <button 
                          onClick={() => {
                            setSelectedDriverForAssignInTab(driver);
                            fetchAvailableVehiclesForDriverTab(driver.id);
                            setDriverRentType('DAILY');
                            setDriverRentAmount('');
                            setShowDriverAssignModal(true);
                          }}
                          className="p-2 rounded-lg bg-blue-50 text-blue-600"
                          title="Assign Vehicle"
                        >
                          <Truck size={14} />
                        </button>
                      )}
                      <button 
                        onClick={() => openChatWithDriver(driver)}
                        className="p-2 rounded-lg bg-blue-50 text-blue-600"
                      >
                        <MessageCircle size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
{showDriverAssignModal && selectedDriverForAssignInTab && (
  <div 
    className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4" 
    onClick={(e) => {
      // Click outside modal to close
      if (e.target === e.currentTarget) {
        setShowDriverAssignModal(false);
        setSelectedDriverForAssignInTab(null);
        setSelectedVehicleForAssign(null);
      }
    }}
  >
    <div className="bg-white rounded-3xl w-full max-w-sm p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <h3 className="text-lg font-black mb-4">
        Assign Vehicle to {selectedDriverForAssignInTab.full_name}
      </h3>
      
      {/* Rent Type Selection */}
      <div className="mb-4">
        <label className="text-xs font-black text-slate-600 block mb-2">Select Rent Plan</label>
        <div className="flex gap-2">
          {['DAILY', 'WEEKLY', 'MONTHLY'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDriverRentType(type);
                setDriverRentAmount('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-black transition ${
                driverRentType === type 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {type === 'DAILY' && '📅 Daily'}
              {type === 'WEEKLY' && '📆 Weekly'}
              {type === 'MONTHLY' && '📅 Monthly'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Rent Amount */}
      <div className="mb-4">
        <label className="text-xs font-black text-slate-600 block mb-2">
          {driverRentType === 'DAILY' && 'Daily Rent (₹)'}
          {driverRentType === 'WEEKLY' && 'Weekly Rent (₹)'}
          {driverRentType === 'MONTHLY' && 'Monthly Rent (₹)'}
        </label>
        <input
          type="number"
          value={driverRentAmount}
          onChange={(e) => setDriverRentAmount(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full border rounded-xl p-3 text-sm"
          placeholder="Enter rent amount"
        />
      </div>
      
      {/* Vehicle Selection */}
      <div className="mb-4">
        <label className="text-xs font-black text-slate-600 block mb-2">Select Vehicle</label>
        <select
          className="w-full border rounded-xl p-3 text-sm bg-white"
          value={selectedVehicleForAssign?.id || ''}
          onChange={(e) => {
            const vehicle = availableVehiclesForDriverTab.find(v => v.id === parseInt(e.target.value));
            setSelectedVehicleForAssign(vehicle);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">-- Choose Vehicle --</option>
          {availableVehiclesForDriverTab.map(vehicle => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.vehicle_number} - {vehicle.vehicle_model} (₹{vehicle.daily_rent}/day)
            </option>
          ))}
        </select>
      </div>
      
      <div className="flex gap-3">
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowDriverAssignModal(false);
            setSelectedDriverForAssignInTab(null);
            setSelectedVehicleForAssign(null);
          }} 
          className="flex-1 py-3 bg-slate-100 rounded-xl text-sm font-black"
        >
          Cancel
        </button>
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAssignFromDriversTab();
          }} 
          disabled={!selectedVehicleForAssign || !driverRentAmount || assigning}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-black disabled:opacity-50"
        >
          {assigning ? 'Assigning...' : '✓ Assign Vehicle'}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};
  const VehicleDetailModal = () => {
  if (!selectedVehicleDetails) return null;
  
  const vehicle = selectedVehicleDetails;
  
  const getVehicleImage = (type, model) => {
    const images = {
      'TRUCK': 'https://cdn-icons-png.flaticon.com/512/3413/3413029.png',
      'CAR': 'https://cdn-icons-png.flaticon.com/512/3413/3413028.png',
      'BUS': 'https://cdn-icons-png.flaticon.com/512/3413/3413030.png',
      'TEMP TRAVELLER': 'https://cdn-icons-png.flaticon.com/512/3413/3413031.png',
      'AUTO': 'https://cdn-icons-png.flaticon.com/512/3413/3413032.png'
    };
    return images[type] || images['TRUCK'];
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowVehicleDetailModal(false);
          setSelectedVehicleDetails(null);
        }
      }}
    >
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Vehicle Image */}
        <div className="relative h-48 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-3xl">
          <img 
            src={getVehicleImage(vehicle.type || 'TRUCK', vehicle.vehicle_model)}
            alt={vehicle.vehicle_model}
            className="w-full h-full object-contain p-4"
          />
          <button 
            onClick={() => {
              setShowVehicleDetailModal(false);
              setSelectedVehicleDetails(null);
            }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Rest of the modal content */}
        <div className="p-5">
          {/* ... existing content ... */}
          
          {/* Rent Type Selection - add stopPropagation */}
          <div className="border-t pt-4">
            <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
              <UserPlus size={16} /> Assign to Driver
            </h3>
            
            <div className="mb-4">
              <label className="text-xs font-black text-slate-600 block mb-2">Select Rent Plan</label>
              <div className="flex gap-2">
                {['DAILY', 'WEEKLY', 'MONTHLY'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedRentType(type);
                      if (type === 'DAILY') setCustomRentAmount(vehicle.daily_rent);
                      else if (type === 'WEEKLY') setCustomRentAmount(vehicle.daily_rent * 7);
                      else setCustomRentAmount(vehicle.daily_rent * 30);
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition ${
                      selectedRentType === type 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {type === 'DAILY' && '📅 Daily'}
                    {type === 'WEEKLY' && '📆 Weekly'}
                    {type === 'MONTHLY' && '📅 Monthly'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="text-xs font-black text-slate-600 block mb-2">
                {selectedRentType === 'DAILY' && 'Daily Rent (₹)'}
                {selectedRentType === 'WEEKLY' && 'Weekly Rent (₹)'}
                {selectedRentType === 'MONTHLY' && 'Monthly Rent (₹)'}
              </label>
              <input
  type="number"
  defaultValue={customRentAmount}
  onBlur={(e) => setCustomRentAmount(e.target.value)}
  className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
  placeholder="Enter rent amount"
/>
            </div>
            
            {/* Driver Selection */}
            <div className="mb-4">
              <label className="text-xs font-black text-slate-600 block mb-2">Select Driver</label>
              <select
                className="w-full border rounded-xl p-3 text-sm bg-white"
                value={selectedDriverForAssign?.id || ''}
                onChange={(e) => {
                  const driver = availableUnassignedDrivers.find(d => d.id === parseInt(e.target.value));
                  setSelectedDriverForAssign(driver);
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">-- Choose Driver --</option>
                {availableUnassignedDrivers.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.full_name} - {driver.driver_code}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!selectedDriverForAssign) {
                  alert('Please select a driver');
                  return;
                }
                if (!customRentAmount || customRentAmount <= 0) {
                  alert('Please enter valid rent amount');
                  return;
                }
                assignDriverToVehicleWithRent(
                  vehicle.id, 
                  selectedDriverForAssign.id, 
                  selectedRentType, 
                  parseFloat(customRentAmount)
                );
              }}
              disabled={!selectedDriverForAssign || assigning}
              className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-black disabled:opacity-50"
            >
              {assigning ? 'Assigning...' : '✓ Assign & Notify Driver'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

  // VEHICLES TAB
  // VEHICLES TAB - FIXED STATUS
const VehiclesTab = () => (
  <div className="space-y-3 pb-4">
    <button 
      onClick={openAddVehicleModal}
      className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2"
    >
      <Plus size={16} /> Add Vehicle
    </button>
    
    <div className="space-y-3">
      {vehicles.map((vehicle, i) => (
        <div 
          key={i} 
          onClick={() => {
            setSelectedVehicleDetails(vehicle);
            fetchUnassignedDriversList();
            setShowVehicleDetailModal(true);
          }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition"
        >
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
            {/* FIXED: Check driver_id instead of status */}
            <span className={`text-[9px] font-black px-2 py-1 rounded-full ${
              vehicle.driver_id 
                ? 'bg-green-100 text-green-700' 
                : 'bg-amber-100 text-amber-700'
            }`}>
              {vehicle.driver_id ? 'ASSIGNED' : 'AVAILABLE'}
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
  // PAYMENTS TAB with transaction history
// PAYMENTS TAB with transaction history - FIXED
const PaymentsTab = () => {
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);
  
  const fetchTransactions = async () => {
    setLoadingTx(true);
    try {
      const res = await fetch(`${API}/api/payment/owner/transactions?ownerId=${ownerId()}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      console.log('Transactions response:', data);
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setTransactions(data);
      } else if (data && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error('Fetch transactions error:', err);
      setTransactions([]);
    } finally {
      setLoadingTx(false);
    }
  };
  
  useEffect(() => {
    fetchTransactions();
  }, []);
  
  return (
    <div className="space-y-4 pb-4">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-5 text-white">
        <p className="text-[10px] font-black opacity-80">Total Collection</p>
        <p className="text-3xl font-black">₹{stats.todayCollection.toLocaleString('en-IN')}</p>
        <p className="text-[10px] opacity-70 mt-1">Last 30 days</p>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="text-[10px] font-black text-slate-400 uppercase">Transaction History</h3>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {loadingTx ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No transactions yet</div>
          ) : (
            transactions.map((tx, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <p className="text-xs font-black text-slate-800">{tx.driver_name || tx.payer_name || 'Driver'}</p>
                  <p className="text-[9px] text-slate-400">{tx.vehicle_number || '—'}</p>
                  <p className="text-[9px] text-slate-400 font-mono">
                    {tx.order_completion_date ? new Date(tx.order_completion_date).toLocaleString() : new Date(tx.order_initiation_date).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-600">₹{parseFloat(tx.order_amount).toLocaleString('en-IN')}</p>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    {tx.transaction_status || 'SUCCESS'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

  // PROFILE TAB
  // PROFILE TAB in OwnerDashboard.js
// PROFILE TAB - Complete
const ProfileTab = () => (
  <div className="space-y-4 pb-4">
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 text-white text-center">
      <div className="w-20 h-20 rounded-full bg-white/20 mx-auto flex items-center justify-center text-3xl font-black mb-3 cursor-pointer hover:bg-white/30 transition">
        <Camera size={24} className="text-white" />
      </div>
      <h2 className="text-lg font-black">{owner?.full_name || owner?.name || 'Rajesh Kumar'}</h2>
      <p className="text-xs text-blue-200">Owner Code: {owner?.owner_code || 'OWN701951'}</p>
      <p className="text-[10px] text-blue-200 mt-1">Member since {new Date().toLocaleDateString()}</p>
    </div>
    
    <div className="bg-white rounded-2xl p-4 space-y-3 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center py-2 border-b border-slate-100">
        <span className="text-xs text-slate-500 flex items-center gap-2"><Phone size={12} /> Phone</span>
        <span className="text-xs font-black font-mono">{owner?.mobile_number || '9876542345'}</span>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-slate-100">
        <span className="text-xs text-slate-500 flex items-center gap-2"><Mail size={12} /> Email</span>
        <span className="text-xs font-black">{owner?.email || 'rajesh@mobilitygrid.com'}</span>
        <button className="text-[9px] text-blue-600">Edit</button>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-slate-100">
        <span className="text-xs text-slate-500 flex items-center gap-2"><Wallet size={12} /> Wallet Balance</span>
        <span className="text-xs font-black text-emerald-600">₹{parseFloat(owner?.wallet_balance || 0).toLocaleString('en-IN')}</span>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-slate-100">
        <span className="text-xs text-slate-500 flex items-center gap-2"><Truck size={12} /> Total Fleet</span>
        <span className="text-xs font-black">{stats.totalVehicles} Vehicles</span>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-slate-100">
        <span className="text-xs text-slate-500 flex items-center gap-2"><Users size={12} /> Total Drivers</span>
        <span className="text-xs font-black">{stats.totalDrivers} Drivers</span>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-slate-100">
        <span className="text-xs text-slate-500 flex items-center gap-2"><Building size={12} /> Business Name</span>
        <span className="text-xs font-black">{owner?.business_name || 'MobilityGrid Fleet Services'}</span>
        <button className="text-[9px] text-blue-600">Edit</button>
      </div>
      <div className="flex justify-between items-center py-2">
        <span className="text-xs text-slate-500 flex items-center gap-2"><MapPin size={12} /> Address</span>
        <span className="text-xs font-black text-right">{owner?.address || 'Mumbai, Maharashtra'}</span>
        <button className="text-[9px] text-blue-600">Edit</button>
      </div>
    </div>
    
    <button className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2">
      <Edit2 size={14} /> Edit Profile
    </button>
    
    <button onClick={logout} className="w-full bg-red-50 text-red-600 py-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 border border-red-100">
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
            <button 
  onClick={() => setShowChatbot(true)} 
  className="p-2 rounded-xl bg-purple-100 hover:bg-purple-200 transition"
  title="AI Assistant"
>
  <span className="text-lg">💬</span>
</button>
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
        {/* Vehicle Detail Modal */}
        {showAssignModal && (
  <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
    <div className="bg-white rounded-3xl w-full max-w-sm p-6">
      <h3 className="text-lg font-black mb-4">Assign Vehicle to Driver</h3>
      
      {/* Mode Selection Tabs */}
      <div className="flex gap-2 mb-4 bg-slate-100 rounded-xl p-1">
        <button
          onClick={() => setAssignMode('driver')}
          className={`flex-1 py-2 rounded-lg text-sm font-black transition ${
            assignMode === 'driver' ? 'bg-blue-600 text-white' : 'text-slate-600'
          }`}
        >
          Driver → Vehicle
        </button>
        <button
          onClick={() => setAssignMode('vehicle')}
          className={`flex-1 py-2 rounded-lg text-sm font-black transition ${
            assignMode === 'vehicle' ? 'bg-blue-600 text-white' : 'text-slate-600'
          }`}
        >
          Vehicle → Driver
        </button>
      </div>
      
      {assignMode === 'driver' ? (
        // Mode 1: Select Driver first, then Vehicle
        <>
          <div className="mb-4">
            <label className="text-xs font-black text-slate-600 block mb-2">Select Driver</label>
            <select 
              className="w-full border rounded-xl p-3 text-sm bg-white"
              value={selectedDriverForAssign?.id || ''}
              onChange={(e) => {
                const driver = unassignedDrivers.find(d => d.id === parseInt(e.target.value));
                setSelectedDriverForAssign(driver);
                if (driver) fetchAvailableVehicles(driver.id);
              }}
            >
              <option value="">-- Choose Driver --</option>
              {unassignedDrivers.map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name} ({driver.driver_code})
                </option>
              ))}
            </select>
          </div>
          
          {selectedDriverForAssign && (
            <div className="mb-4">
              <label className="text-xs font-black text-slate-600 block mb-2">
                Select Vehicle for {selectedDriverForAssign.full_name}
              </label>
              <select 
                className="w-full border rounded-xl p-3 text-sm bg-white"
                value={selectedVehicleForAssign?.id || ''}
                onChange={(e) => {
                  const vehicle = availableVehiclesForDriver.find(v => v.id === parseInt(e.target.value));
                  setSelectedVehicleForAssign(vehicle);
                }}
              >
                <option value="">-- Choose Vehicle --</option>
                {availableVehiclesForDriver.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicle_number} - {vehicle.vehicle_model} (₹{vehicle.daily_rent}/day)
                  </option>
                ))}
              </select>
              {availableVehiclesForDriver.length === 0 && (
                <p className="text-[10px] text-amber-600 mt-1">No available vehicles</p>
              )}
            </div>
          )}
        </>
      ) : (
        // Mode 2: Select Vehicle first, then Driver
        <>
          <div className="mb-4">
            <label className="text-xs font-black text-slate-600 block mb-2">Select Vehicle</label>
            <select 
              className="w-full border rounded-xl p-3 text-sm bg-white"
              value={selectedVehicleForAssign?.id || ''}
              onChange={(e) => {
                const vehicle = unassignedVehicles.find(v => v.id === parseInt(e.target.value));
                setSelectedVehicleForAssign(vehicle);
                if (vehicle) fetchAvailableDrivers(vehicle.id);
              }}
            >
              <option value="">-- Choose Vehicle --</option>
              {unassignedVehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicle_number} - {vehicle.vehicle_model}
                </option>
              ))}
            </select>
          </div>
          
          {selectedVehicleForAssign && (
            <div className="mb-4">
              <label className="text-xs font-black text-slate-600 block mb-2">
                Select Driver for {selectedVehicleForAssign.vehicle_number}
              </label>
              <select 
                className="w-full border rounded-xl p-3 text-sm bg-white"
                value={selectedDriverForAssign?.id || ''}
                onChange={(e) => {
                  const driver = availableDriversForVehicle.find(d => d.id === parseInt(e.target.value));
                  setSelectedDriverForAssign(driver);
                }}
              >
                <option value="">-- Choose Driver --</option>
                {availableDriversForVehicle.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.full_name} ({driver.driver_code})
                  </option>
                ))}
              </select>
              {availableDriversForVehicle.length === 0 && (
                <p className="text-[10px] text-amber-600 mt-1">No available drivers</p>
              )}
            </div>
          )}
        </>
      )}
      
      {selectedDriverForAssign && selectedVehicleForAssign && (
        <div className="p-3 bg-blue-50 rounded-xl mb-4">
          <p className="text-xs text-center text-blue-800">
            Assigning <strong>{selectedDriverForAssign.full_name}</strong> to <strong>{selectedVehicleForAssign.vehicle_number}</strong>
          </p>
        </div>
      )}
      
      <div className="flex gap-3">
        <button 
          onClick={() => {
            setShowAssignModal(false);
            setSelectedDriverForAssign(null);
            setSelectedVehicleForAssign(null);
            setAssignMode('driver');
          }} 
          className="flex-1 py-3 bg-slate-100 rounded-xl text-sm font-black"
        >
          Cancel
        </button>
        <button 
          onClick={handleAssignVehicle} 
          disabled={!selectedDriverForAssign || !selectedVehicleForAssign || assigning}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-black disabled:opacity-50"
        >
          {assigning ? 'Assigning...' : 'Confirm Assignment'}
        </button>
      </div>
    </div>
  </div>
)}
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
        {showChatbot && (
  <Chatbot 
    userRole="OWNER"
    userId={ownerId()}
    userPhone="9876542345"
    token={token()}
    onClose={() => setShowChatbot(false)}
  />
)}
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
      
      {/* Vehicle Type Dropdown */}
      <select 
        className="w-full border rounded-xl p-3 mb-3 text-sm bg-white"
        value={newVehicle.type || 'TRUCK'}
        onChange={e => setNewVehicle({...newVehicle, type: e.target.value})}
      >
        <option value="TRUCK">🚛 Truck</option>
        <option value="CAR">🚗 Car</option>
        <option value="BUS">🚌 Bus</option>
        <option value="TEMP TRAVELLER">🚐 Tempo Traveller</option>
        <option value="AUTO">🛺 Auto Rickshaw</option>
      </select>
      
      {/* Rent Type Dropdown */}
      <div className="mb-3">
        <label className="text-[10px] font-black text-slate-500 block mb-1">Rent Type</label>
        <select 
          value={rentType}
          onChange={(e) => setRentType(e.target.value)}
          className="w-full border rounded-xl p-3 text-sm bg-white"
        >
          <option value="DAILY">📅 Daily Rent</option>
          <option value="WEEKLY">📆 Weekly Rent</option>
          <option value="MONTHLY">📅 Monthly Rent</option>
        </select>
      </div>
      
      {/* Daily/Weekly/Monthly Rent Amount */}
      <div className="mb-3">
        <label className="text-[10px] font-black text-slate-500 block mb-1">
          {rentType === 'DAILY' && 'Daily Rent (₹ per day)'}
          {rentType === 'WEEKLY' && 'Weekly Rent (₹ per week)'}
          {rentType === 'MONTHLY' && 'Monthly Rent (₹ per month)'}
        </label>
        <input 
          type="number" 
          placeholder={rentType === 'DAILY' ? "e.g., 850" : rentType === 'WEEKLY' ? "e.g., 5950" : "e.g., 25500"} 
          className="w-full border rounded-xl p-3 text-sm"
          value={newVehicle.rent} 
          onChange={e => setNewVehicle({...newVehicle, rent: parseInt(e.target.value)})} 
        />
        <p className="text-[9px] text-slate-400 mt-1">
          {rentType === 'DAILY' && 'Driver will pay ₹850 every day'}
          {rentType === 'WEEKLY' && `Driver will pay ₹${newVehicle.rent || 5950} every week`}
          {rentType === 'MONTHLY' && `Driver will pay ₹${newVehicle.rent || 25500} every month`}
        </p>
      </div>
      
      {/* Assign Driver Dropdown */}
      <div className="mb-4">
        <label className="text-[10px] font-black text-slate-500 block mb-1">Assign Driver (Optional)</label>
        <select 
          value={selectedDriverId} 
          onChange={(e) => setSelectedDriverId(e.target.value)}
          className="w-full border rounded-xl p-3 text-sm bg-white"
        >
          <option value="">-- Select Driver --</option>
          {drivers.map(driver => (
            <option key={driver.id} value={driver.id}>
              {driver.full_name} - {driver.mobile_number}
            </option>
          ))}
        </select>
      </div>
      
      {/* Buttons */}
      <div className="flex gap-3">
        <button onClick={() => setShowAddVehicle(false)} className="flex-1 py-3 bg-slate-100 rounded-xl text-sm font-black">Cancel</button>
        <button onClick={addVehicle} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-black">Add Vehicle</button>
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
        {showVehicleDetailModal && <VehicleDetailModal />}
{showDriverDetailsModal && <DriverDetailsModal />}
      </div>
    </div>
  );
}