// frontend/src/pages/OwnerDashboard.js
// Original 650+ lines with only these changes:
// 1. Zoom out fix - added zoom controls
// 2. Logout button in top right
// 3. Chat with driver functionality

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, X, LayoutDashboard, Users, Truck, DollarSign, Settings,
  LogOut, Bell, Search, ChevronDown, Eye, EyeOff, Copy,
  CheckCircle, Clock, AlertCircle, MessageCircle, Send,
  Phone, Mail, MapPin, Calendar, FileText, CreditCard,
  Wallet, TrendingUp, ArrowUpRight, ArrowDownRight,
  Plus, Filter, Download, Printer, ChevronLeft, ChevronRight,
  Star, Trophy, Shield, Fingerprint, Camera, Edit2, Save
} from 'lucide-react';

const API = 'https://mg-qw5s.onrender.com';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100); // NEW: Zoom state
  
  // Owner data
  const [owner, setOwner] = useState(null);
  const [stats, setStats] = useState({
    totalVehicles: 0,
    totalDrivers: 0,
    todayCollection: 0,
    pendingDues: 0,
    monthlyRevenue: 0,
    activeFleet: 0
  });
  
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Chat state - NEW
  const [showChat, setShowChat] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  
  // Modal states
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);
  
  // Form states
  const [newVehicle, setNewVehicle] = useState({ number: '', model: '', rent: 0 });
  const [newDriver, setNewDriver] = useState({ name: '', phone: '', email: '', vehicleId: '' });
  
  // Filter states
  const [dateRange, setDateRange] = useState('week');
  const [searchQuery, setSearchQuery] = useState('');

  const token = () => localStorage.getItem('token');
  const phone = () => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return String(u?.phone_number || u?.mobile_number || u?.phone || '').replace(/\D/g, '').slice(-10);
  };

  // Fetch all data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const H = { Authorization: `Bearer ${token()}` };
      const [ownerRes, statsRes, vehiclesRes, driversRes, txRes, notifRes] = await Promise.all([
        fetch(`${API}/api/owner/profile`, { headers: H }),
        fetch(`${API}/api/owner/stats`, { headers: H }),
        fetch(`${API}/api/owner/vehicles`, { headers: H }),
        fetch(`${API}/api/owner/drivers`, { headers: H }),
        fetch(`${API}/api/owner/transactions?period=${dateRange}`, { headers: H }),
        fetch(`${API}/api/owner/notifications`, { headers: H })
      ]);
      
      if (ownerRes.ok) setOwner(await ownerRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (vehiclesRes.ok) setVehicles(await vehiclesRes.json());
      if (driversRes.ok) setDrivers(await driversRes.json());
      if (txRes.ok) setTransactions(await txRes.json());
      if (notifRes.ok) {
        const notifs = await notifRes.json();
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const markNotificationRead = async (id) => {
    try {
      await fetch(`${API}/api/owner/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  // CHAT FUNCTIONS - NEW
  const openChatWithDriver = async (driver) => {
    setSelectedDriver(driver);
    setShowChat(true);
    try {
      const response = await fetch(`${API}/api/owner/chat/history/${driver.id}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await response.json();
      setChatHistory(data.messages || []);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      setChatHistory([]);
    }
  };

  const sendMessageToDriver = async () => {
    if (!chatInput.trim() || !selectedDriver) return;
    
    const newMessage = { 
      from: 'owner', 
      text: chatInput, 
      time: new Date().toLocaleTimeString(),
      timestamp: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, newMessage]);
    
    try {
      await fetch(`${API}/api/owner/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ driverId: selectedDriver.id, message: chatInput })
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
    setChatInput('');
  };

  // ZOOM CONTROLS - NEW
  const zoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
  const zoomOut = () => setZoom(prev => Math.max(prev - 10, 70));
  const resetZoom = () => setZoom(100);

  const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }) => (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? <ArrowUpRight size={12} className="text-emerald-500" /> : <ArrowDownRight size={12} className="text-red-500" />}
              <span className={`text-[10px] font-black ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </div>
  );

  // Zoom wrapper for entire dashboard
  return (
    <div className="min-h-screen bg-slate-100" style={{ zoom: `${zoom}%` }}>
      {/* ZOOM CONTROLS - NEW (Fixed at top right) */}
      <div className="fixed top-4 right-20 z-50 bg-white rounded-full shadow-lg flex gap-1 p-1 border border-slate-200">
        <button onClick={zoomOut} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold text-lg transition">−</button>
        <button onClick={resetZoom} className="px-3 h-8 rounded-full bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition">{zoom}%</button>
        <button onClick={zoomIn} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold text-lg transition">+</button>
      </div>

      {/* LOGOUT BUTTON - NEW (Top right) */}
      <div className="fixed top-4 right-4 z-50">
        <button onClick={logout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg transition text-sm font-black">
          <LogOut size={16} /> Logout
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-slate-900 text-white transition-all duration-300 z-40 shadow-2xl ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          {sidebarOpen ? (
            <span className="text-lg font-black tracking-tight">MOBILITY<span className="text-blue-400">GRID</span></span>
          ) : (
            <span className="text-xl font-black">MG</span>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700">
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
        
        <nav className="p-3 space-y-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'vehicles', icon: Truck, label: 'Vehicles' },
            { id: 'drivers', icon: Users, label: 'Drivers' },
            { id: 'payments', icon: CreditCard, label: 'Payments' },
            { id: 'reports', icon: TrendingUp, label: 'Reports' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-black ${
                activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Header */}
        <header className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black text-slate-800">
              {activeTab === 'dashboard' && 'Fleet Command Center'}
              {activeTab === 'vehicles' && 'Vehicle Registry'}
              {activeTab === 'drivers' && 'Driver Management'}
              {activeTab === 'payments' && 'Payment Ledger'}
              {activeTab === 'reports' && 'Analytics & Reports'}
              {activeTab === 'settings' && 'Business Settings'}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <button onClick={() => setShowNotifPanel(!showNotifPanel)} className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition">
              <Bell size={18} className="text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {/* Owner Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black">
                {owner?.name?.charAt(0) || 'O'}
              </div>
              {sidebarOpen && (
                <div className="hidden md:block">
                  <p className="text-xs font-black text-slate-800">{owner?.name || 'Owner'}</p>
                  <p className="text-[9px] text-slate-400">{owner?.business_name || 'Fleet Operator'}</p>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Notification Panel */}
        {showNotifPanel && (
          <div className="absolute right-6 top-16 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-sm">Notifications</h3>
              <button onClick={() => setShowNotifPanel(false)}><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No new notifications</div>
              ) : (
                notifications.map(notif => (
                  <div key={notif.id} className={`p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${!notif.read ? 'bg-blue-50/30' : ''}`} onClick={() => markNotificationRead(notif.id)}>
                    <p className="text-xs font-semibold text-slate-800">{notif.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{notif.message}</p>
                    <p className="text-[9px] text-slate-400 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="p-6">
          {activeTab === 'dashboard' && (
            <div>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard title="TOTAL FLEET" value={stats.totalVehicles} icon={Truck} color="bg-blue-600" />
                <StatCard title="ACTIVE DRIVERS" value={stats.totalDrivers} icon={Users} color="bg-emerald-600" />
                <StatCard title="TODAY'S COLLECTION" value={stats.todayCollection} icon={Wallet} color="bg-amber-600" trend="up" trendValue="+12.5%" />
                <StatCard title="PENDING DUES" value={stats.pendingDues} icon={AlertCircle} color="bg-red-600" trend="down" trendValue="-8.2%" />
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
                  <h3 className="text-lg font-black">Quick Register Vehicle</h3>
                  <p className="text-blue-200 text-sm mt-1">Add new vehicle to your fleet</p>
                  <button onClick={() => setShowAddVehicle(true)} className="mt-4 bg-white/20 hover:bg-white/30 px-5 py-2.5 rounded-xl text-sm font-black transition">+ Add Vehicle</button>
                </div>
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white">
                  <h3 className="text-lg font-black">Onboard Driver</h3>
                  <p className="text-emerald-200 text-sm mt-1">Assign driver to vehicle</p>
                  <button onClick={() => setShowAddDriver(true)} className="mt-4 bg-white/20 hover:bg-white/30 px-5 py-2.5 rounded-xl text-sm font-black transition">+ Add Driver</button>
                </div>
              </div>

              {/* Recent Drivers with Chat Button - MODIFIED: Added chat button */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-black text-slate-800">Recent Drivers</h3>
                  <button onClick={() => setActiveTab('drivers')} className="text-[10px] text-blue-600 font-black">View All</button>
                </div>
                <div className="divide-y">
                  {drivers.slice(0, 5).map(driver => (
                    <div key={driver.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-600">{driver.name?.charAt(0)}</div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{driver.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{driver.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${driver.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {driver.status || 'Active'}
                        </span>
                        {/* CHAT BUTTON - NEW */}
                        <button 
                          onClick={() => openChatWithDriver(driver)}
                          className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition text-blue-600"
                          title="Chat with driver"
                        >
                          <MessageCircle size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {drivers.length === 0 && <div className="p-8 text-center text-slate-400">No drivers added yet</div>}
                </div>
              </div>
            </div>
          )}

          {/* Vehicles Tab */}
          {activeTab === 'vehicles' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-black text-slate-800">Fleet Vehicles</h3>
                <button onClick={() => setShowAddVehicle(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1"><Plus size={12} /> Add Vehicle</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr><th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase">Vehicle No.</th><th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase">Model</th><th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase">Daily Rent</th><th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase">Assigned Driver</th><th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase">Status</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {vehicles.map(vehicle => (
                      <tr key={vehicle.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-sm font-black font-mono">{vehicle.number}</td>
                        <td className="px-5 py-3 text-sm">{vehicle.model}</td>
                        <td className="px-5 py-3 text-sm font-black">₹{vehicle.daily_rent}</td>
                        <td className="px-5 py-3 text-sm">{vehicle.driver_name || '—'}</td>
                        <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${vehicle.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{vehicle.status || 'Active'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Drivers Tab - MODIFIED: Added chat button */}
          {activeTab === 'drivers' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-black text-slate-800">Driver Registry</h3>
                <button onClick={() => setShowAddDriver(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1"><Plus size={12} /> Add Driver</button>
              </div>
              <div className="divide-y">
                {drivers.map(driver => (
                  <div key={driver.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">{driver.name?.charAt(0)}</div>
                      <div>
                        <p className="font-black text-slate-800">{driver.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1"><Phone size={10} /> {driver.phone}</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1"><Truck size={10} /> {driver.vehicle_number || 'Unassigned'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* CHAT BUTTON - NEW */}
                      <button 
                        onClick={() => openChatWithDriver(driver)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-black flex items-center gap-1 transition"
                      >
                        <MessageCircle size={12} /> Chat
                      </button>
                      <button className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-black">Details</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-slate-800">Payment Summary</h3>
                  <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="border rounded-xl px-3 py-1.5 text-sm">
                    <option value="day">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-emerald-50 rounded-xl"><p className="text-[10px] text-emerald-600 font-black">Total Collected</p><p className="text-xl font-black text-emerald-700">₹{stats.todayCollection?.toLocaleString() || 0}</p></div>
                  <div className="text-center p-3 bg-amber-50 rounded-xl"><p className="text-[10px] text-amber-600 font-black">Pending</p><p className="text-xl font-black text-amber-700">₹{stats.pendingDues?.toLocaleString() || 0}</p></div>
                  <div className="text-center p-3 bg-blue-50 rounded-xl"><p className="text-[10px] text-blue-600 font-black">Monthly</p><p className="text-xl font-black text-blue-700">₹{stats.monthlyRevenue?.toLocaleString() || 0}</p></div>
                  <div className="text-center p-3 bg-purple-50 rounded-xl"><p className="text-[10px] text-purple-600 font-black">Platform Fee</p><p className="text-xl font-black text-purple-700">₹0</p></div>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100" onClick={() => { setSelectedTxn(tx); setShowReceipt(true); }}>
                      <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.status === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>{tx.status === 'success' ? <CheckCircle size={16} className="text-emerald-600" /> : <Clock size={16} className="text-red-600" />}</div><div><p className="font-black text-sm">{tx.driver_name}</p><p className="text-[9px] text-slate-400">{tx.date}</p></div></div>
                      <div className="text-right"><p className="font-black text-lg">₹{tx.amount}</p><p className="text-[9px] font-mono text-slate-400">{tx.ref}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center">
              <FileText size={48} className="text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-black text-slate-800">Analytics Dashboard</h3>
              <p className="text-sm text-slate-400 mt-1">Exportable reports, charts, and performance metrics coming soon.</p>
              <button className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-black">Download Report</button>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-black text-slate-800 mb-4">Business Settings</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4"><div><label className="text-xs text-slate-500 block">Business Name</label><input className="w-full border rounded-xl p-2.5 text-sm" defaultValue={owner?.business_name || ''} /></div><div><label className="text-xs text-slate-500 block">GST Number</label><input className="w-full border rounded-xl p-2.5 text-sm" defaultValue={owner?.gst || ''} /></div></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="text-xs text-slate-500 block">Default Daily Rent</label><input className="w-full border rounded-xl p-2.5 text-sm" type="number" placeholder="850" /></div><div><label className="text-xs text-slate-500 block">Payment Reminder (hrs)</label><input className="w-full border rounded-xl p-2.5 text-sm" type="number" placeholder="2" /></div></div>
                <button className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-black">Save Changes</button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* CHAT MODAL - NEW */}
      {showChat && selectedDriver && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md h-[550px] flex flex-col shadow-2xl">
            <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-3xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-black text-lg">
                  {selectedDriver.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black">{selectedDriver.name}</h3>
                  <p className="text-[10px] text-blue-200 font-mono">{selectedDriver.phone}</p>
                </div>
              </div>
              <button onClick={() => setShowChat(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {chatHistory.length === 0 ? (
                <div className="text-center text-slate-400 py-12">
                  <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs">Start a conversation with {selectedDriver.name}</p>
                </div>
              ) : (
                chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.from === 'owner' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${msg.from === 'owner' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'}`}>
                      {msg.text}
                      <div className={`text-[9px] mt-1 ${msg.from === 'owner' ? 'text-blue-200' : 'text-slate-400'}`}>{msg.time || new Date(msg.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 border-t bg-white flex gap-2 rounded-b-3xl">
              <input 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessageToDriver()}
                placeholder="Type your message..."
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
              />
              <button onClick={sendMessageToDriver} className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition shadow-md">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddVehicle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6"><div className="flex justify-between mb-4"><h3 className="text-lg font-black">Add New Vehicle</h3><button onClick={() => setShowAddVehicle(false)}><X /></button></div>
          <div className="space-y-3"><input placeholder="Vehicle Number (e.g., DL01AB1234)" className="w-full border rounded-xl p-2.5" value={newVehicle.number} onChange={e => setNewVehicle({...newVehicle, number: e.target.value})} />
          <input placeholder="Model (e.g., Tata Ace)" className="w-full border rounded-xl p-2.5" value={newVehicle.model} onChange={e => setNewVehicle({...newVehicle, model: e.target.value})} />
          <input type="number" placeholder="Daily Rent (₹)" className="w-full border rounded-xl p-2.5" value={newVehicle.rent} onChange={e => setNewVehicle({...newVehicle, rent: parseInt(e.target.value)})} />
          <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-black">Register Vehicle</button></div></div></div>
      )}

      {/* Add Driver Modal */}
      {showAddDriver && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6"><div className="flex justify-between mb-4"><h3 className="text-lg font-black">Onboard Driver</h3><button onClick={() => setShowAddDriver(false)}><X /></button></div>
          <div className="space-y-3"><input placeholder="Full Name" className="w-full border rounded-xl p-2.5" value={newDriver.name} onChange={e => setNewDriver({...newDriver, name: e.target.value})} />
          <input placeholder="Phone Number" className="w-full border rounded-xl p-2.5" value={newDriver.phone} onChange={e => setNewDriver({...newDriver, phone: e.target.value})} />
          <input placeholder="Email (optional)" className="w-full border rounded-xl p-2.5" value={newDriver.email} onChange={e => setNewDriver({...newDriver, email: e.target.value})} />
          <select className="w-full border rounded-xl p-2.5" value={newDriver.vehicleId} onChange={e => setNewDriver({...newDriver, vehicleId: e.target.value})}><option value="">Assign Vehicle (optional)</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.number} - ₹{v.daily_rent}/day</option>)}</select>
          <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-black">Add Driver</button></div></div></div>
      )}

      {/* Receipt Modal */}
      {showReceipt && selectedTxn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6"><div className="text-center border-b pb-4"><p className="text-3xl font-black">₹{selectedTxn.amount}</p><p className="text-xs text-slate-500">{selectedTxn.type}</p></div>
          <div className="space-y-2 my-4"><div className="flex justify-between"><span className="text-xs">Transaction ID</span><span className="text-xs font-mono">{selectedTxn.id}</span></div><div className="flex justify-between"><span className="text-xs">Date</span><span className="text-xs">{selectedTxn.date}</span></div><div className="flex justify-between"><span className="text-xs">Status</span><span className={`text-xs font-black ${selectedTxn.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{selectedTxn.status}</span></div></div>
          <button onClick={() => setShowReceipt(false)} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-sm">Close</button></div></div>
      )}
    </div>
  );
}