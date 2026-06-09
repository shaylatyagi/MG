// frontend/src/pages/OwnerDashboard.js
// Complete with ALL buttons - Notification Bell, Logout, Chat, Search

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { 
  Camera, Edit2, Building, MapPin, Mail, Phone, User,
  Home, Users, Truck, Wallet, CreditCard, Bell, BellRing,
  LogOut, MessageCircle, X, Send, CheckCircle, Clock,
  AlertCircle, ChevronLeft, Plus, Eye, EyeOff, Search,
  Filter, UserPlus, TruckIcon, TrendingUp, ArrowUpRight,
  ArrowDownRight, Settings, Shield, Star, Menu, Calendar,
  DollarSign, Copy, FileText, Landmark, Fingerprint, FileCheck2
} from 'lucide-react';
import Chatbot from '../components/Chatbot';  // ← "UniversalChatbot" ki jagah "Chatbot"
import DocumentSection from '../components/DocumentSection';
import PaymentLinks from './owner/PaymentLinks';
import ThemeToggle from '../components/ThemeToggle';
const API ='https://mg-qw5s.onrender.com';
const DriverLedgerSection = ({ ownerIdVal, tokenVal }) => {
  const [ledgerData, setLedgerData] = useState([]);
  const [expandedDriver, setExpandedDriver] = useState(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedDriver, setSelectedEntryDriver] = useState(null);
  const [entryType, setEntryType] = useState('ADVANCE_CREDIT');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryDesc, setEntryDesc] = useState('');
  const downloadCSV = async (driver) => {
    try {
      const res = await fetch(
        `${API}/api/payment/owner/driver-statement?driverId=${driver.id}`,
        { headers: { Authorization: `Bearer ${tokenVal}` } }
      );
      const data = await res.json();
      const rows = [
        ['Date', 'Type', 'Amount (₹)', 'Mode', 'Status', 'Reference'],
        ...data.transactions.map(t => [
          new Date(t.date).toLocaleDateString('en-IN'),
          t.type, t.amount, t.mode, t.status, t.reference
        ]),
        ...data.ledger_entries.map(l => [
          new Date(l.date).toLocaleDateString('en-IN'),
          l.type, l.amount, 'LEDGER', 'RECORDED', l.description
        ])
      ];
      const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.driver_name}_statement.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch(e) { alert('Download failed: ' + e.message); }
  };

  const fetchLedger = () => {
    fetch(`${API}/api/payment/owner/driver-ledger?ownerId=${ownerIdVal}`, {
      headers: { Authorization: `Bearer ${tokenVal}` }
    }).then(r => r.json()).then(setLedgerData).catch(() => {});
  };

  useEffect(() => {
    fetchLedger();
    const interval = setInterval(fetchLedger, 30000);
    return () => clearInterval(interval);
  }, []);

  const addEntry = async () => {
    if (!entryAmount || parseFloat(entryAmount) <= 0) return alert('Amount daalen');
    const res = await fetch(`${API}/api/payment/owner/ledger-entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenVal}` },
      body: JSON.stringify({
        driverId: selectedDriver.id,
        ownerId: ownerIdVal,
        entryType,
        amount: parseFloat(entryAmount),
        description: entryDesc
      })
    });
    const d = await res.json();
    if (d.success) {
      alert('✅ Entry recorded!');
      setShowEntryModal(false);
      setEntryAmount(''); setEntryDesc('');
      fetchLedger();
    } else alert(d.error || 'Failed');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50 flex justify-between items-center">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
          Driver-wise Ledger
        </h3>
        <span className="text-[9px] text-slate-400">{ledgerData.length} drivers</span>
      </div>

      <div className="divide-y">
        {ledgerData.length === 0 && (
          <div className="p-6 text-center text-slate-400 text-xs">No ledger data yet</div>
        )}
        {ledgerData.map((d, i) => (
          <div key={i}>
            {/* ─── COLLAPSED ROW ─── */}
            <div
              className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
              onClick={() => setExpandedDriver(expandedDriver === d.id ? null : d.id)}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm">
                  {d.full_name?.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800">{d.full_name}</p>
                  <p className="text-[9px] text-slate-400">
                    {d.vehicle_number} · ₹{d.daily_rent}/day
                  </p>
                </div>
              </div>

              {/* ✅ RIGHT SIDE — Total collection + badges */}
              <div className="flex items-center gap-2">
                {/* Total collection always visible */}
                <div className="text-right mr-1">
                  <p className="text-[8px] text-slate-400">Collection</p>
                  <p className="text-xs font-black text-emerald-600">
                    ₹{parseFloat(d.total_paid || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                {/* Net position badge */}
{(() => {
  const net = parseFloat(d.pending||0) - parseFloat(d.advance||0);
  if (net > 0) return (
    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700">
      ₹{net.toLocaleString('en-IN')} due
    </span>
  );
  if (net < 0) return (
    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
      ₹{Math.abs(net).toLocaleString('en-IN')} credit
    </span>
  );
  return <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Settled ✅</span>;
})()}
                <span className="text-slate-400 text-xs ml-1">
                  {expandedDriver === d.id ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {/* ─── EXPANDED SECTION ─── */}
            {expandedDriver === d.id && (
              <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">
                {/* 3 col grid */}
                <div className="grid grid-cols-3 gap-2 text-center mt-3 mb-3">
                  <div className="bg-emerald-50 rounded-xl p-2">
                    <p className="text-[8px] text-emerald-600 font-bold uppercase">Paid</p>
                    <p className="text-sm font-black text-emerald-700">
                      ₹{parseFloat(d.total_paid || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className={`rounded-xl p-2 ${parseFloat(d.pending) > 0 ? 'bg-red-50' : 'bg-slate-100'}`}>
                    <p className={`text-[8px] font-bold uppercase ${parseFloat(d.pending) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      Pending
                    </p>
                    <p className={`text-sm font-black ${parseFloat(d.pending) > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                      ₹{parseFloat(d.pending || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className={`rounded-xl p-2 ${parseFloat(d.advance) > 0 ? 'bg-purple-50' : 'bg-slate-100'}`}>
                    <p className={`text-[8px] font-bold uppercase ${parseFloat(d.advance) > 0 ? 'text-purple-600' : 'text-slate-400'}`}>
                      Advance
                    </p>
                    <p className={`text-sm font-black ${parseFloat(d.advance) > 0 ? 'text-purple-700' : 'text-slate-400'}`}>
                      ₹{parseFloat(d.advance || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                {/* NET BALANCE BANNER */}
{(() => {
  const net = parseFloat(d.pending||0) - parseFloat(d.advance||0);
  if (net > 0) return (
    <div className="bg-red-50 border border-red-100 rounded-xl p-2.5 mb-3 flex justify-between items-center">
      <span className="text-xs font-black text-red-700">⚠️ Net Outstanding</span>
      <span className="text-sm font-black text-red-700">₹{net.toLocaleString('en-IN')}</span>
    </div>
  );
  if (net < 0) return (
    <div className="bg-purple-50 border border-purple-100 rounded-xl p-2.5 mb-3 flex justify-between items-center">
      <span className="text-xs font-black text-purple-700">✅ Net Credit</span>
      <span className="text-sm font-black text-purple-700">₹{Math.abs(net).toLocaleString('en-IN')}</span>
    </div>
  );
  return (
    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 mb-3 text-center">
      <span className="text-xs font-black text-emerald-700">✅ Account Settled</span>
    </div>
  );
})()}

                {/* ✅ FIXED: Single button row, correct variable d */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSelectedEntryDriver(d); setShowEntryModal(true); }}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black"
                  >
                    + Add Entry
                  </button>
                  <button
                    onClick={() => downloadCSV(d)}
                    className="py-2 px-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-black flex items-center gap-1"
                  >
                    📥 CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Entry Modal */}
      {showEntryModal && selectedDriver && (
        <div
          className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowEntryModal(false); }}
        >
          <div className="bg-white rounded-3xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-lg mb-1">Add Entry</h3>
            <p className="text-sm text-slate-500 mb-4">{selectedDriver.full_name}</p>
            <label className="text-xs font-black text-slate-600 block mb-2">Entry Type</label>
            <select value={entryType} onChange={e => setEntryType(e.target.value)}
              className="w-full border rounded-xl p-3 mb-3 text-sm bg-white">
              <option value="ADVANCE_CREDIT">💰 Advance Credit (driver overpaid)</option>
              <option value="REPAIR_CREDIT">🔧 Repair Compensation</option>
              <option value="DAMAGE_CHARGE">⚠️ Damage Charge</option>
              <option value="PENALTY">🚫 Penalty</option>
              <option value="REFUND">↩️ Refund to Driver</option>
              <option value="DEPOSIT_CHARGE">🔒 Security Deposit Charge</option>
            </select>
            <input type="number" placeholder="Amount (₹)" value={entryAmount}
              onChange={e => setEntryAmount(e.target.value)}
              className="w-full border rounded-xl p-3 mb-3 text-sm" />
            <input type="text" placeholder="Description (optional)" value={entryDesc}
              onChange={e => setEntryDesc(e.target.value)}
              className="w-full border rounded-xl p-3 mb-4 text-sm" />
            <div className="flex gap-3">
              <button onClick={() => setShowEntryModal(false)}
                className="flex-1 py-3 bg-slate-100 rounded-xl text-sm font-black">Cancel</button>
              <button onClick={addEntry}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black">Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default function OwnerDashboard() {
  const [activeSOS, setActiveSOS] = useState(null); // current SOS alert
const [showSOSAlert, setShowSOSAlert] = useState(false);
const [seenSosIds, setSeenSosIds] = useState(new Set());

// SOS polling
useEffect(() => {
  const pollSOS = async () => {
    try {
      const res = await fetch(
        `${API}/api/payment/owner/sos-alerts?ownerId=${ownerId()}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      const alerts = await res.json();
      if (alerts.length > 0) {
        const latest = alerts[0];
        if (!seenSosIds.has(latest.id)) {
          setActiveSOS(latest);
          setShowSOSAlert(true);
          setSeenSosIds(prev => new Set([...prev, latest.id]));
        }
      }
    } catch(e) {}
  };
  
  const interval = setInterval(pollSOS, 10000);
  pollSOS();
  return () => clearInterval(interval);
}, [seenSosIds]);
  const [chatMessages, setChatMessages] = useState([]);
  const [lang, setLang] = useState('en');
  const T = {
  en: {
    navHome:'Home', navDrivers:'Drivers', navFleet:'Fleet', navPayments:'Payments', navProfile:'Profile',
    portal:'OWNER PORTAL', title:'Fleet Manager', sub:'Command Center',
    ledger:'ECOSYSTEM YIELD LEDGER', received:'RECEIVED', outstanding:'OUTSTANDING',
    escrow:'Virtual Escrow Connected', calcToday:'Calculated for Today',
    fleet:'TOTAL FLEET', drivers:'ACTIVE DRIVERS', collection:'TOTAL COLLECTION', pending:'PENDING DUES',
    addVehicle:'Add Vehicle', addVehicleSub:'Register new fleet',
    addDriver:'Add Driver', addDriverSub:'Onboard new driver',
    recentDrivers:'Recent Drivers', viewAll:'View All →',
    search:'Search by name or phone...', addNewDriver:'Add New Driver',
    assigned:'ASSIGNED', unassigned:'UNASSIGNED', available:'AVAILABLE',
    notAssigned:'Not Assigned', assignedDriver:'Assigned Driver',
    txHistory:'Transaction History', cashPaid:'Cash Payments Recorded',
    noTx:'No transactions yet', totalCol:'Total Collection',
    notifications:'Notifications', noNotif:'No notifications',
    cancel:'Cancel', add:'Add', logout:'Logout',
    phone:'Phone', email:'Email', address:'Address',
    editProfile:'Edit Profile', businessName:'Business Name',
    addNewVehicle:'Add New Vehicle', vehicleNum:'Vehicle Number (e.g. MH01AB1234)',
    model:'Model (e.g. Tata Ace)', dailyRent:'Daily Rent (₹/day)',
    assignDriverOpt:'Assign Driver (Optional)',
    emergency:'Emergency', assignVehicle:'Assign Vehicle',
  },
  hi: {
    navHome:'होम', navDrivers:'ड्राइवर', navFleet:'फ्लीट', navPayments:'भुगतान', navProfile:'प्रोफ़ाइल',
    portal:'मालिक पोर्टल', title:'फ्लीट मैनेजर', sub:'कमांड सेंटर',
    ledger:'इकोसिस्टम यील्ड लेजर', received:'प्राप्त', outstanding:'बकाया',
    escrow:'वर्चुअल एस्क्रो जुड़ा', calcToday:'आज के लिए गणना',
    fleet:'कुल वाहन', drivers:'सक्रिय ड्राइवर', collection:'कुल संग्रह', pending:'लंबित बकाया',
    addVehicle:'वाहन जोड़ें', addVehicleSub:'नया वाहन पंजीकृत करें',
    addDriver:'ड्राइवर जोड़ें', addDriverSub:'नया ड्राइवर जोड़ें',
    recentDrivers:'हाल के ड्राइवर', viewAll:'सभी देखें →',
    search:'नाम या फोन से खोजें...', addNewDriver:'नया ड्राइवर जोड़ें',
    assigned:'असाइन', unassigned:'असाइन नहीं', available:'उपलब्ध',
    notAssigned:'असाइन नहीं', assignedDriver:'ड्राइवर',
    txHistory:'लेनदेन इतिहास', cashPaid:'नकद भुगतान दर्ज',
    noTx:'अभी कोई लेनदेन नहीं', totalCol:'कुल संग्रह',
    notifications:'सूचनाएं', noNotif:'कोई सूचना नहीं',
    cancel:'रद्द करें', add:'जोड़ें', logout:'लॉगआउट',
    phone:'फोन', email:'ईमेल', address:'पता',
    editProfile:'प्रोफ़ाइल संपादित करें', businessName:'व्यापार नाम',
    addNewVehicle:'नया वाहन जोड़ें', vehicleNum:'वाहन नंबर (जैसे MH01AB1234)',
    model:'मॉडल (जैसे Tata Ace)', dailyRent:'दैनिक किराया (₹/दिन)',
    assignDriverOpt:'ड्राइवर असाइन करें (वैकल्पिक)',
    emergency:'आपातकाल', assignVehicle:'वाहन असाइन करें',
  }
};
const t = T[lang];
  const [horizon, setHorizon] = useState('today');
const [ledger, setLedger] = useState({ received: 0, outstanding: 0 });
  const [showCashModal, setShowCashModal] = useState(false);
const [cashDriver, setCashDriver] = useState(null);
const [cashAmount, setCashAmount] = useState('');
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
  const [vehicleSearch, setVehicleSearch] = useState('');
  // Owner data
  const [owner, setOwner] = useState(null);
  const [stats, setStats] = useState({
    totalVehicles: 0,
    totalDrivers: 0,
    todayCollection: 0,
    pendingDues: 0
  });
  const [trendData, setTrendData] = useState([]);
  const [overdueDrivers, setOverdueDrivers] = useState([]);
  const [showOverdue, setShowOverdue] = useState(false);
  const [remindingAll, setRemindingAll] = useState(false);
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
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [incentiveRules, setIncentiveRules] = useState({ is_enabled: false, rules: [] });
  const [ownerPlan, setOwnerPlan] = useState({ plan: 'FREE', is_premium: false });
  const [managers, setManagers] = useState([]);
  const [showAddManager, setShowAddManager] = useState(false);
  const [managerDemoMode, setManagerDemoMode] = useState(false);
  const [newManager, setNewManager] = useState({ name: '', phone: '', permissions: {
    assign_vehicles: true, record_cash: true, view_financials: true,
    chat_drivers: true, add_drivers: false, remove_drivers: false,
    add_vehicles: false, bulk_import: false, upload_documents: false
  }});
const [savingRules, setSavingRules] = useState(false);
  const [bulkTab, setBulkTab] = useState('drivers'); // 'drivers' or 'vehicles'
const [bulkVehicles, setBulkVehicles] = useState([]);
const [bulkDrivers, setBulkDrivers] = useState([]);
const [bulkLoading, setBulkLoading] = useState(false);
const [bulkResult, setBulkResult] = useState(null);
const [bulkFile, setBulkFile] = useState(null);
const [addDriverMode, setAddDriverMode] = useState('single');
const [multipleDrivers, setMultipleDrivers] = useState([{ name:'', phone:'' }]);
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
  const [newVehicle, setNewVehicle] = useState({ 
  number: '', model: '', type: 'EV', rent: 850,
  insuranceExpiry: '', fitnessExpiry: '', chassisNumber: ''
});
  const [newDriver, setNewDriver] = useState({ 
  name: '', phone: '', email: '', 
  vehicleId: '', securityDeposit: 0,
  dob: '', emergencyName: '', emergencyPhone: '',
  licenseNumber: '', licenseExpiry: '',
  address: ''
});
  const [agreementFile, setAgreementFile] = useState(null);

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      let h = n.getHours();
      let m = String(n.getMinutes()).padStart(2, '0');
      setTime(`${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`);
    };
    tick();
    const id = setInterval(tick, 300000);//every 5 minutes
    return () => clearInterval(id);
  }, []);
  const token = () => localStorage.getItem('token');
const getUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } 
  catch { return {}; }
};
const ownerId = () => getUser().id;
const ownerPhone = () => getUser().mobile_number || getUser().phone_number;
const ownerCode = () => getUser().owner_code;
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
  // ✅ Hooks PEHLE — early return se pehle
  const [driverHistory, setDriverHistory] = useState(null);
  useEffect(() => {
    if (!selectedDriverDetails?.id) return;
    fetch(`${API}/api/payment/owner/driver-history/${selectedDriverDetails.id}`, {
      headers: { Authorization: `Bearer ${token()}` }
    }).then(r => r.json()).then(setDriverHistory).catch(() => {});
  }, [selectedDriverDetails?.id]);

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
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white text-center rounded-t-3xl relative">
          {/* Back / Close button */}
          <button
            onClick={() => { setShowDriverDetailsModal(false); setSelectedDriverDetails(null); }}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="w-24 h-24 rounded-full bg-white/20 mx-auto flex items-center justify-center text-4xl font-black mb-3">
            {driver.full_name?.charAt(0) || driver.name?.charAt(0)}
          </div>
          <h2 className="text-xl font-black">{driver.full_name || driver.name}</h2>
          <p className="text-sm opacity-90">{driver.driver_code}</p>
          <p className="text-xs opacity-75 mt-1">{driver.phone_number || driver.mobile_number}</p>
        </div>
        
        <div className="p-5">
          <button
    onClick={() => {
      setShowDriverDetailsModal(false);
      setSelectedDriverDetails(null);
      openChatWithDriver(driver);
    }}
    className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 mb-4"
  >
    <MessageCircle size={16}/> Chat with Driver
  </button>
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
                  <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Rent Breakdown</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {label:'Weekly',    val:(assignedVehicle.daily_rent||0)*7},
                      {label:'Monthly',   val:(assignedVehicle.daily_rent||0)*30},
                      {label:'Quarterly', val:(assignedVehicle.daily_rent||0)*90},
                      {label:'Annual',    val:(assignedVehicle.daily_rent||0)*365},
                    ].map(({label,val})=>(
                      <div key={label} className="bg-white rounded-xl p-2 text-center border border-green-100">
                        <p className="text-[9px] text-slate-400 font-bold">{label}</p>
                        <p className="text-sm font-black text-slate-700">₹{val.toLocaleString('en-IN')}</p>
                      </div>
                    ))}
                  </div>
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
          {/* KYC & Additional Info */}
<div className="mb-5">
  <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
    <FileCheck2 size={18} /> KYC & Details
  </h3>
  <div className="space-y-2">
    {driver.date_of_birth && (
      <div className="flex justify-between items-center py-2 border-b border-slate-100">
        <span className="text-sm text-slate-500">📅 Date of Birth</span>
        <span className="text-sm font-black">
          {new Date(driver.date_of_birth).toLocaleDateString('en-IN')}
        </span>
      </div>
    )}
    {driver.driving_license_number && (
      <div className="flex justify-between items-center py-2 border-b border-slate-100">
        <span className="text-sm text-slate-500">🪪 License No.</span>
        <span className="text-sm font-black font-mono">{driver.driving_license_number}</span>
      </div>
    )}
    {driver.driving_license_expiry && (
      <div className="flex justify-between items-center py-2 border-b border-slate-100">
        <span className="text-sm text-slate-500">📅 License Expiry</span>
        <span className={`text-sm font-black ${
          new Date(driver.driving_license_expiry) < new Date() 
            ? 'text-red-600' : 'text-emerald-600'
        }`}>
          {new Date(driver.driving_license_expiry).toLocaleDateString('en-IN')}
          {new Date(driver.driving_license_expiry) < new Date() && ' ⚠️ EXPIRED'}
        </span>
      </div>
    )}
    {driver.emergency_contact_name && (
      <div className="flex justify-between items-center py-2 border-b border-slate-100">
        <span className="text-sm text-slate-500">🆘 Emergency Contact</span>
        <div className="text-right">
          <p className="text-sm font-black">{driver.emergency_contact_name}</p>
          <p className="text-[10px] text-slate-400 font-mono">{driver.emergency_contact_number}</p>
        </div>
      </div>
    )}
    {driver.security_deposit > 0 && (
      <div className="flex justify-between items-center py-2">
        <span className="text-sm text-slate-500">🔒 Security Deposit</span>
        <span className="text-sm font-black text-amber-600">
          ₹{parseFloat(driver.security_deposit).toLocaleString('en-IN')}
        </span>
      </div>
    )}
    {!driver.date_of_birth && !driver.driving_license_number && !driver.emergency_contact_name && (
      <p className="text-xs text-slate-400 text-center py-2">No additional details added yet</p>
    )}
  </div>
</div>

{/* ─── Agreement Upload ─── */}
<div className="mb-5">
  <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
    <FileCheck2 size={18} /> Agreement Document
  </h3>
  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
    {driver.agreement_uploaded ? (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 text-lg">✅</span>
          <div>
            <p className="text-sm font-black text-slate-800">Agreement uploaded</p>
            <p className="text-[10px] text-slate-400">Replace with new file below</p>
          </div>
        </div>
      </div>
    ) : (
      <p className="text-sm text-amber-600 font-black mb-2">⚠️ No agreement uploaded yet</p>
    )}
    <div className="mt-3 space-y-2">
      <input
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={e => setAgreementFile(e.target.files[0])}
        className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
      />
      {agreementFile && (
        <button
          onClick={async () => {
            const fd = new FormData();
            fd.append('document', agreementFile);
            fd.append('driverId', driver.id);
            try {
              const r = await fetch(`${API}/api/uploads/agreement`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token()}` },
                body: fd
              });
              const data = await r.json();
              if (data.success) {
                alert('✅ Agreement uploaded!');
                setAgreementFile(null);
                fetchAllData();
              } else {
                alert(data.message || 'Upload failed');
              }
            } catch {
              alert('Upload failed — network error');
            }
          }}
          className="w-full bg-indigo-600 text-white text-xs font-black py-2.5 rounded-xl hover:bg-indigo-700 transition"
        >
          📤 Upload: {agreementFile.name.length > 25 ? agreementFile.name.slice(0,25)+'…' : agreementFile.name}
        </button>
      )}
    </div>
  </div>
</div>

{/* ─── Per-Driver Incentive Rule ─── */}
{incentiveRules.is_enabled && incentiveRules.rules.length > 0 && (
  <div className="mb-5">
    <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">🎯 Incentive Rule</h3>
    <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-200">
      <p className="text-[10px] text-slate-500 mb-2">Is driver ke liye applicable rule select karo:</p>
      <select
        defaultValue={driver.incentive_rule_index ?? ''}
        onChange={async (e) => {
          const val = e.target.value;
          await fetch(`${API}/api/payment/owner/driver-incentive-rule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify({ driverId: driver.id, ruleIndex: val === '' ? null : parseInt(val) })
          }).catch(() => {});
        }}
        className="w-full border rounded-xl p-2.5 text-sm bg-white">
        <option value="">⚙️ Use global rules (auto)</option>
        <option value="-1">🚫 No incentive for this driver</option>
        {incentiveRules.rules.map((rule, i) => (
          <option key={i} value={i}>
            {rule.min_hours}h+ → {rule.type === 'FULL_WAIVER' ? 'Rent free' : rule.type === 'PERCENTAGE' ? `${rule.value}% off` : `₹${rule.value} off`}
          </option>
        ))}
      </select>
    </div>
  </div>
)}

{driverHistory && (
  <div className="mb-5">
    <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">📋 Vehicle History</h3>
    {driverHistory.vehicle_history?.length === 0 ? (
      <p className="text-xs text-slate-400 text-center py-2">Koi history nahi</p>
    ) : (
      <div className="space-y-2">
        {driverHistory.vehicle_history?.map((h, i) => (
          <div key={i} className={`rounded-xl p-3 border ${!h.unassigned_at ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-black text-slate-800">{h.vehicle_number} — {h.vehicle_model}</p>
                <p className="text-[10px] text-slate-500">
                  {new Date(h.assigned_at).toLocaleDateString('en-IN')} → {h.unassigned_at ? new Date(h.unassigned_at).toLocaleDateString('en-IN') : 'Present'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {Math.floor((new Date(h.unassigned_at||Date.now()) - new Date(h.assigned_at)) / 86400000)} days · ₹{h.daily_rent}/day
                </p>
              </div>
              {!h.unassigned_at && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Current</span>}
            </div>
          </div>
        ))}
      </div>
    )}
    {driverHistory.daily_log?.length > 0 && (
      <div className="mt-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Last 30 Days Activity</p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {driverHistory.daily_log.map((log, i) => {
            const hrs = Math.floor((log.active_minutes||0)/60);
            const mins = (log.active_minutes||0)%60;
            return (
              <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-xs text-slate-600">
                  {new Date(log.log_date).toLocaleDateString('en-IN', {day:'2-digit',month:'short',weekday:'short'})}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-700">{hrs}h {mins}m</span>
                  {log.incentive_applied && <span className="text-[9px] text-emerald-600 font-black">+₹{parseFloat(log.incentive_amount||0).toFixed(0)}</span>}
                  {log.login_time && (
                    <span className="text-[9px] text-slate-400">
                      {new Date(log.login_time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})}
                      {log.logout_time && ` - ${new Date(log.logout_time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}
  </div>
)}
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
    
    // Ensure IDs are numbers
    const vehicleIdNum = parseInt(vehicleId);
    const driverIdNum = parseInt(driverId);
    const rentAmountNum = parseFloat(customRent);
    
    console.log('Sending assignment:', { vehicleIdNum, driverIdNum, rentType, rentAmountNum });
    
    // Calculate rent based on type
    let dailyRent = 0;
    if (rentType === 'DAILY') dailyRent = rentAmountNum;
    else if (rentType === 'WEEKLY') dailyRent = rentAmountNum / 7;
    else if (rentType === 'MONTHLY') dailyRent = rentAmountNum / 30;
    
    const response = await fetch(`${API}/api/assignment/assign-with-rent`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
  vehicle_number: newVehicle.number,
  vehicle_model: newVehicle.model,
  vehicle_type: newVehicle.type,
  daily_rent: newVehicle.rent,
  rent_type: rentType,
  owner_id: ownerId(),
  insurance_expiry: newVehicle.insuranceExpiry || null,
  fitness_expiry: newVehicle.fitnessExpiry || null,
  chassis_number: newVehicle.chassisNumber || null
})
    });
    
    const data = await response.json();
    console.log('Assignment response:', data);
    
    if (data.success) {
      alert(`✅ Vehicle assigned to ${data.driverName} with ${rentType} rent of ₹${customRent}`);
      setShowVehicleDetailModal(false);
      setSelectedVehicleDetails(null);
      // Refresh all data
      await fetchAllData();
      await fetchUnassignedData();
    } else {
      alert(data.error || 'Assignment failed');
    }
  } catch (err) {
    console.error('Assign error:', err);
    alert('Network error: ' + err.message);
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
  vehicle_number: newVehicle.number,
  vehicle_model: newVehicle.model,
  vehicle_type: newVehicle.type,
  daily_rent: newVehicle.rent,
  rent_type: rentType,
  owner_id: ownerId()   // ← function use karo
})
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      alert('✅ Vehicle added successfully!');
      setShowAddVehicle(false);
      setNewVehicle({ number: '', model: '', type: 'EV', rent: 850 });
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
    const u = getUser();
const oId = u.id;
if (!oId) { navigate('/login'); return; }
    
    console.log('Fetching data for owner ID:', oId);
    
    const [vehiclesRes, driversRes, statsRes, notifRes, ledgerRes] = await Promise.all([
  fetch(`${API}/api/payment/owner/vehicles?ownerId=${oId}`, { headers: H }),
  fetch(`${API}/api/payment/owner/drivers/list?ownerId=${oId}&limit=200`, { headers: H }),
  fetch(`${API}/api/payment/owner/stats?ownerId=${oId}`, { headers: H }),
  fetch(`${API}/api/payment/owner/notifications?ownerId=${oId}`, { headers: H }),
  fetch(`${API}/api/payment/owner/driver-ledger?ownerId=${oId}`, { headers: H })
]);
    // Session expired on another device → redirect to login
    if ([vehiclesRes, driversRes, statsRes, notifRes, ledgerRes].some(r => r.status === 401)) {
      localStorage.clear();
      navigate('/login');
      return;
    }
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
  
  // Pending dues ledger se calculate karo
  let totalPending = 0;
  if (ledgerRes.ok) {
    const ledgerData = await ledgerRes.json();
    totalPending = ledgerData.reduce((sum, d) => 
  sum + (parseFloat(d.pending) || 0), 0
);
  }

  setStats({
    totalVehicles: data.total_vehicles || 0,
    totalDrivers: data.total_drivers || 0,
    todayCollection: data.total_earnings || 0,
    pendingDues: totalPending  // ← real data
  });
}
    
    if (notifRes.ok) {
      const notifs = await notifRes.json();
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    }
setOwner({
  id: u.id,
  full_name: u.full_name || u.name,
  mobile_number: u.mobile_number || u.phone_number,
  owner_code: u.owner_code,
  email: u.email,
  business_name: u.business_name,
  address: u.address,
  status: u.status || 'ACTIVE'
});
    // Fetch real profile from DB (company name, city, email)
    try {
      const meRes = await fetch(`${API}/api/owner/me`, { headers: H });
      const meData = await meRes.json();
      if (meData.success && meData.owner) {
        setOwner(prev => ({ ...prev, ...meData.owner }));
      }
    } catch (e) { console.error('owner/me fetch failed:', e); }

  } catch (error) {
    console.error('Fetch error:', error);
  } finally {
    setLoading(false);
  }
}, []);
useEffect(() => {
  const fetchLedger = async () => {
    try {
      const res = await fetch(`${API}/api/payment/owner/ledger?period=${horizon}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const d = await res.json();
      setLedger(d);
    } catch {}
  };
  fetchLedger();
}, [horizon]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  useEffect(() => {
  if (!ownerId()) return;
  const oId = ownerId();
  fetch(`${API}/api/payment/owner/incentive-rules?ownerId=${oId}`, {
    headers: { Authorization: `Bearer ${token()}` }
  }).then(r => r.json()).then(setIncentiveRules).catch(() => {});

  // Plan status
  fetch(`${API}/api/payment/owner/plan?ownerId=${oId}`, {
    headers: { Authorization: `Bearer ${token()}` }
  }).then(r => r.json()).then(d => setOwnerPlan(d)).catch(() => {});

  // Managers
  fetch(`${API}/api/payment/owner/managers?ownerId=${oId}`, {
    headers: { Authorization: `Bearer ${token()}` }
  }).then(r => r.json()).then(d => { if (d.managers) setManagers(d.managers); }).catch(() => {});

  // 30-day trend
  fetch(`${API}/api/payment/owner/trend?ownerId=${oId}`, {
    headers: { Authorization: `Bearer ${token()}` }
  }).then(r => r.json()).then(d => { if (Array.isArray(d)) setTrendData(d); }).catch(() => {});
}, []);

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
const interval = setInterval(pollNotifications, 60000);//60 seconds
return () => clearInterval(interval);
  }, [unreadCount]);
  useEffect(() => {
  if (!showChat || !selectedDriver) return;
  
  const pollChat = async () => {
    const dPhone = selectedDriver?.phone_number || selectedDriver?.mobile_number || selectedDriver?.phone;
    try {
      const res = await fetch(
        `${API}/api/payment/chat/messages?driverPhone=${dPhone}&ownerId=${ownerId()}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      if (res.ok) {
        const msgs = await res.json();
        setChatHistory(msgs.map(m => ({
          from: m.sender_type === 'OWNER' ? 'owner' : 'driver',
          text: m.message,
          time: formatChatTime(m.created_at)
        })));
      }
    } catch(e) {}
  };

  const interval = setInterval(pollChat, 3000);
  return () => clearInterval(interval);
}, [showChat, selectedDriver]);

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
  
  // Fetch real messages
  const dPhone = driver.phone_number || driver.mobile_number || driver.phone;
  const res = await fetch(
    `${API}/api/payment/chat/messages?driverPhone=${dPhone}&ownerId=${ownerId()}`,
    { headers: { Authorization: `Bearer ${token()}` } }
  );
  if (res.ok) {
    const msgs = await res.json();
    setChatHistory(msgs.map(m => ({
      from: m.sender_type === 'OWNER' ? 'owner' : 'driver',
      text: m.message,
      time: formatChatTime(m.created_at)
    })));
  }
};

  const sendMessageToDriver = async () => {
  if (!chatInput.trim()) return;
  const msg = chatInput.trim();
  setChatInput('');
  
  const dPhone = selectedDriver?.phone_number || selectedDriver?.mobile_number || selectedDriver?.phone;
  
  await fetch(`${API}/api/payment/chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    body: JSON.stringify({
      driverPhone: dPhone,
      message: msg,
      senderType: 'OWNER',
      ownerId: ownerId()
    })
  });
  
  setChatHistory(prev => [...prev, { 
    from: 'owner', 
    text: msg, 
    time: formatChatTime(new Date().toISOString())
  }]);
};
const validateBulkRow = (row) => {
  const errs = [];
  if (!row.full_name?.trim()) errs.push('Name missing');
  else if (/[0-9]/.test(row.full_name)) errs.push('Name mein numbers nahi');
  const ph = String(row.mobile_number||'').replace(/\s/g,'');
  if (!ph) errs.push('Phone missing');
  else if (!/^\d{10}$/.test(ph)) errs.push('Phone 10 digits chahiye');
  return errs;
};
const downloadTemplate = () => {
  const csv = [
    'full_name,mobile_number,date_of_birth,emergency_contact_name,emergency_contact_number,driving_license_number,driving_license_expiry,security_deposit',
    'Abdul Rahman,9876543210,1990-01-15,Mohammed Ali,9876541234,DL-0420100012345,2025-12-31,5000',
    'Ramesh Kumar,9876543211,1985-06-20,Suresh Kumar,9876541235,DL-0520110054321,2026-06-30,3000',
    'Priya Sharma,9876543212,1995-03-10,Meera Sharma,9876541236,,2027-01-15,0'
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'driver_import_template.csv'; a.click();
  URL.revokeObjectURL(url);
};
const downloadVehicleTemplate = () => {
  const csv = [
    'vehicle_number,vehicle_model,vehicle_type,daily_rent,insurance_expiry,fitness_expiry,chassis_number',
    'MH01AB1234,Tata Ace EV,EV,850,2026-12-31,2026-06-30,MA1TB2EL1NM123456',
    'MH02CD5678,Mahindra Treo,EV,750,2027-01-15,2026-09-30,MA3HF2EL1PM654321',
    'MH03EF9012,Bajaj RE,AUTO,600,2026-08-20,2026-04-15,'
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'vehicle_import_template.csv'; a.click();
  URL.revokeObjectURL(url);
};

const handleVehicleBulkFile = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  setBulkFile(file.name);
  const reader = new FileReader();
  reader.onload = (ev) => {
    const lines = ev.target.result.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/ /g,'_'));
    const parsed = lines.slice(1).map((line, i) => {
      const values = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });
      const errs = [];
      if (!obj.vehicle_number) errs.push('Vehicle number missing');
      if (!obj.vehicle_model) errs.push('Model missing');
      if (obj.daily_rent && isNaN(obj.daily_rent)) errs.push('Daily rent must be number');
      obj._errors = errs;
      return obj;
    }).filter(v => v.vehicle_number || v.vehicle_model);
    setBulkVehicles(parsed);
  };
  reader.readAsText(file);
};
const importBulkVehicles = async () => {
  const valid = bulkVehicles.filter(v => v._errors.length === 0);
  if (!valid.length) return alert('Koi valid vehicle nahi');
  setBulkLoading(true);
  try {
    const res = await fetch(`${API}/api/payment/owner/bulk-upload-vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ 
        vehicles: valid, 
        ownerId: ownerId()  // ✅ Already correct tha
      })
    });
    const data = await res.json();
    setBulkResult(data);
    if (data.imported > 0) {
      fetchAllData();
      alert(`✅ ${data.imported} vehicles import ho gaye!`);
    }
  } catch(err) { alert('Network error: ' + err.message); }
  finally { setBulkLoading(false); }
};
const handleBulkFile = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  setBulkFile(file.name); setBulkResult(null);
  const reader = new FileReader();
  reader.onload = (ev) => {
    const lines = ev.target.result.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/ /g,'_'));
    const parsed = lines.slice(1).map((line, i) => {
      const values = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });
      obj._row = i + 2;
      obj._errors = validateBulkRow(obj);
      return obj;
    }).filter(d => d.full_name || d.mobile_number);
    setBulkDrivers(parsed);
  };
  reader.readAsText(file);
};

const updateBulkRow = (index, field, value) => {
  setBulkDrivers(prev => {
    const updated = [...prev];
    updated[index] = { ...updated[index], [field]: value };
    updated[index]._errors = validateBulkRow(updated[index]);
    return updated;
  });
};
const importBulkDrivers = async () => {
  const valid = bulkDrivers.filter(d => d._errors.length === 0);
  if (!valid.length) return alert('Koi valid driver nahi — pehle errors fix karo');
  setBulkLoading(true);
  try {
    const res = await fetch(`${API}/api/payment/owner/bulk-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ 
        drivers: valid, 
        ownerId: ownerId(),      // ✅ ID bhejo
        ownerCode: ownerCode()   // ✅ Code bhi bhejo (fallback)
      })
    });
    const data = await res.json();
    setBulkResult(data);
    if (data.imported > 0) {
      fetchAllData();
      alert(`✅ ${data.imported} drivers import ho gaye!`);
    }
    if (data.failed > 0) {
      console.log('Failed:', data.failures);
    }
  } catch(err) { alert('Network error: ' + err.message); }
  finally { setBulkLoading(false); }
};
const addMultipleDrivers = async () => {
  const toAdd = multipleDrivers.filter(d => d.name && d.phone && !d._saved);
  if (!toAdd.length) return alert('Koi driver fill nahi kiya');
  setBulkLoading(true);
  let added = 0;
  for (let i = 0; i < multipleDrivers.length; i++) {
    const d = multipleDrivers[i];
    if (!d.name || !d.phone || d._saved) continue;
    if (!/^[A-Za-z\s]+$/.test(d.name)) {
      setMultipleDrivers(prev => prev.map((x,idx) => idx===i ? {...x, _error:'Name mein numbers nahi'} : x));
      continue;
    }
    if (!/^\d{10}$/.test(d.phone)) {
      setMultipleDrivers(prev => prev.map((x,idx) => idx===i ? {...x, _error:'10 digits chahiye'} : x));
      continue;
    }
    try {
      const res = await fetch(`${API}/api/payment/owner/add-driver`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token()}` },
        body: JSON.stringify({ full_name: d.name, mobile_number: d.phone, owner_id: ownerId(), driving_license_number: d.license||null, security_deposit: parseFloat(d.deposit)||0 })
      });
      const data = await res.json();
      if (data.success) { setMultipleDrivers(prev => prev.map((x,idx) => idx===i ? {...x, _saved:true, _error:null} : x)); added++; }
      else { setMultipleDrivers(prev => prev.map((x,idx) => idx===i ? {...x, _error: data.message} : x)); }
    } catch(err) { setMultipleDrivers(prev => prev.map((x,idx) => idx===i ? {...x, _error:'Network error'} : x)); }
  }
  setBulkLoading(false);
  if (added > 0) { fetchAllData(); }
};

// ─── INCENTIVE RULES ──────────────────────────────────────────────────────────
const saveRules = async () => {
  setSavingRules(true);
  try {
    await fetch(`${API}/api/payment/owner/incentive-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ ownerId: ownerId(), isEnabled: incentiveRules.is_enabled, rules: incentiveRules.rules })
    });
    alert('✅ Rules saved!');
  } catch { alert('Network error'); }
  setSavingRules(false);
};
const addRule = () => setIncentiveRules(prev => ({
  ...prev, rules: [...prev.rules, { min_hours: 8, type: 'PERCENTAGE', value: 50 }]
}));
const updateRule = (i, field, val) => setIncentiveRules(prev => ({
  ...prev, rules: prev.rules.map((r, idx) => idx === i ? { ...r, [field]: val } : r)
}));
const removeRule = (i) => setIncentiveRules(prev => ({
  ...prev, rules: prev.rules.filter((_, idx) => idx !== i)
}));
// ──────────────────────────────────────────────────────────────────────────────
  const formatChatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now); yesterday.setDate(now.getDate()-1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = d.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit', hour12:true});
    if (isToday) return time;
    if (isYesterday) return `Yesterday ${time}`;
    return `${d.toLocaleDateString('en-IN', {day:'2-digit', month:'short'})} ${time}`;
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
  owner_id: ownerId(),
  date_of_birth: newDriver.dob || null,
  emergency_contact_name: newDriver.emergencyName || null,
  emergency_contact_number: newDriver.emergencyPhone || null,
  driving_license_number: newDriver.licenseNumber || null,
  driving_license_expiry: newDriver.licenseExpiry || null,
  security_deposit: parseFloat(newDriver.securityDeposit) || 0,
  address: newDriver.address || null
})
      });
      const data = await response.json();
      if (data.success) {
        // Upload agreement if file selected
        if (agreementFile && data.driver?.id) {
          const fd = new FormData();
          fd.append('document', agreementFile);
          fd.append('type', 'AGREEMENT');
          fd.append('driverId', data.driver.id);
          fetch(`${API}/api/uploads/agreement`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd }).catch(()=>{});
        }
        alert('✅ Driver added successfully!');
        setShowAddDriver(false);
        setNewDriver({ name: '', phone: '', email: '', vehicleId: '', securityDeposit: 0, dob: '', emergencyName: '', emergencyPhone: '', licenseNumber: '', licenseExpiry: '', address: '' });
        setAgreementFile(null);
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
  const filteredDrivers = drivers
  .filter(driver =>
    (driver.full_name || driver.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (driver.phone_number || driver.phone || '').includes(searchQuery)
  )
  .sort((a, b) => {
    const aHas = vehicles.some(v => v.driver_id === a.id);
    const bHas = vehicles.some(v => v.driver_id === b.id);
    return aHas === bHas ? 0 : aHas ? 1 : -1; // unassigned first
  });

  // Dynamic header title
  const getHeaderTitle = () => ({
  home: t.title, drivers: t.drivers, vehicles: t.fleet,
  payments: t.collection, profile: t.editProfile
})[activeTab] || 'MobilityGrid';

  const getHeaderSubtitle = () => {
  const subtitles = {
    'home': t.sub,
    'drivers': `${stats.totalDrivers || filteredDrivers.length} ${lang === 'hi' ? 'सक्रिय ड्राइवर' : 'Active Drivers'}`,
    'vehicles': `${vehicles.length} ${lang === 'hi' ? 'वाहन' : 'Vehicles'}`,
    'payments': lang === 'hi' ? 'लेनदेन इतिहास' : 'Transaction History',
    'profile': owner?.full_name || 'Owner Profile'
  };
  return subtitles[activeTab] || '';
};
  const StatCard = ({ title, value, icon: Icon, color, trend, isMoney = false }) => (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-indigo-100 transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-xl font-black text-slate-800 mt-1">{isMoney ? `₹${value.toLocaleString('en-IN')}` : value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-1">
              <ArrowDownRight size={10} className="text-slate-400" />
              <span className="text-[9px] text-slate-400">pending</span>
            </div>
          )}
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
    </div>
  );

  // HOME TAB
  const HomeTab = () => (
    <div className="space-y-4 pb-4">
    {/* Yield Ledger — YAHAN ADD KARO */}
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{t.ledger}</span>
        <select value={horizon} onChange={e=>setHorizon(e.target.value)}
          className="bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-[10px] font-black text-slate-600 outline-none">
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">Last 7 Days</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
          <span className="text-[9px] text-indigo-600 font-black uppercase block">{t.received}</span>
          <b className="text-base font-black text-slate-800 block mt-1">₹{ledger.received.toLocaleString('en-IN')}</b>
        </div>
        <button className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left w-full active:bg-slate-100"
          onClick={() => {
            const oId = ownerId();
            if (!oId) return;
            fetch(`${API}/api/payment/owner/overdue-drivers?ownerId=${oId}`, { headers: { Authorization: `Bearer ${token()}` } })
              .then(r => r.json()).then(d => { setOverdueDrivers(Array.isArray(d) ? d : []); setShowOverdue(true); }).catch(() => {});
          }}>
          <span className="text-[9px] text-slate-500 font-black uppercase block">{t.outstanding} ›</span>
          <b className="text-base font-black text-slate-800 block mt-1">₹{ledger.outstanding.toLocaleString('en-IN')}</b>
        </button>
      </div>
      <div className="flex items-center justify-between text-[9px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"/>{t.escrow}</span>
        <span>{t.calcToday}</span>
      </div>
    </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard title={t.fleet} value={stats.totalVehicles} icon={Truck} color="bg-indigo-600" />
        <StatCard title={t.drivers} value={stats.totalDrivers} icon={Users} color="bg-indigo-500" />
        <StatCard title={t.collection} value={stats.todayCollection} icon={Wallet} color="bg-slate-700" isMoney/>
        <StatCard title={t.pending} value={stats.pendingDues} icon={AlertCircle} color="bg-slate-500" trend="down" isMoney/>
      </div>
      {/* 30-day Collection Trend */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3">30-Day Collection Trend</p>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={trendData} barSize={6} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 8, fill: '#94a3b8' }} interval={6} />
              <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip
                formatter={(val, name) => [`₹${val.toLocaleString('en-IN')}`, name === 'online' ? 'UPI' : 'Cash']}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Legend formatter={v => v === 'online' ? 'UPI' : 'Cash'} iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="online" stackId="a" fill="#2563eb" radius={[0,0,0,0]} />
              <Bar dataKey="cash"   stackId="a" fill="#93c5fd" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-32 flex items-center justify-center">
            <p className="text-[10px] text-slate-300">No collection data yet</p>
          </div>
        )}
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setActiveTab('drivers')}
          className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-2 hover:border-indigo-200 hover:bg-indigo-50/30 transition">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
            <UserPlus size={14} className="text-indigo-600"/>
          </div>
          <div className="text-left">
            <p className="text-xs font-black text-slate-800">Drivers</p>
            <p className="text-[9px] text-slate-400">{stats.totalDrivers} active</p>
          </div>
        </button>
        <button onClick={() => setActiveTab('vehicles')}
          className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-2 hover:border-indigo-200 hover:bg-indigo-50/30 transition">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Truck size={14} className="text-indigo-600"/>
          </div>
          <div className="text-left">
            <p className="text-xs font-black text-slate-800">Fleet</p>
            <p className="text-[9px] text-slate-400">{stats.totalVehicles} vehicles</p>
          </div>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t.recentDrivers}</h3>
          <button onClick={() => setActiveTab('drivers')} className="text-[10px] text-indigo-600 font-black">{t.viewAll}</button>
        </div>
        <div className="divide-y">
          {drivers.slice(0, 5).map((driver, i) => {
            const dVehicle = vehicles.find(v => Number(v.driver_id) === Number(driver.id));
            return (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-sm border border-indigo-100">
                    {driver.full_name?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">{driver.full_name || driver.name}</p>
                    <p className="text-[9px] text-slate-400 font-mono">{dVehicle?.vehicle_number || 'Unassigned'}</p>
                  </div>
                </div>
                <button onClick={() => openChatWithDriver(driver)}
                  className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600 transition">
                  <MessageCircle size={13} />
                </button>
              </div>
            );
          })}
          {drivers.length === 0 && (
            <div className="p-6 text-center text-slate-400">
              <p className="text-xs">No drivers yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  const handleUnassign = async (vehicleId) => {
  if (!window.confirm('Remove this driver from the vehicle?')) return;
  try {
    const res = await fetch(`${API}/api/assignment/unassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ vehicleId })
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ Driver removed from vehicle');
      setShowVehicleDetailModal(false);
      setSelectedVehicleDetails(null);
      fetchAllData();
      fetchUnassignedData();
    } else alert(data.error || 'Failed');
  } catch (err) { alert('Network error'); }
};
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
          placeholder={t.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X size={14} className="text-slate-400" />
          </button>
        )}
      </div>
      
      <div className="flex gap-2">
  <button onClick={() => setShowAddDriver(true)}
    className="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2">
    <UserPlus size={16}/> {t.addNewDriver}
  </button>
  <button onClick={() => { setShowBulkModal(true); setBulkDrivers([]); setBulkResult(null); setBulkFile(null); }}
    className="py-3 px-4 bg-emerald-600 text-white rounded-xl text-sm font-black">
    📊 Bulk
  </button>
</div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="divide-y">
          {filteredDrivers.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {searchQuery ? 'No drivers match your search' : 'No drivers added yet'}
            </div>
          ) : (
            filteredDrivers.map((driver, i) => {
              // Check if driver has assigned vehicle
              const hasVehicle = driver.vehicle_id != null;
const assignedVehicle = vehicles.find(v => Number(v.id) === Number(driver.vehicle_id));
              
              return (
                <div key={i} className={`p-4 transition ${hasVehicle ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                  onClick={() => {
                    if (hasVehicle) {
                      setSelectedDriverDetails(driver);
                      setShowDriverDetailsModal(true);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-lg">
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
                        {hasVehicle ? t.assigned : t.unassigned}
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
                          className="p-2 rounded-lg bg-indigo-50 text-indigo-600"
                          title="Assign Vehicle"
                        >
                          <Truck size={14} />
                        </button>
                      )}
                      {hasVehicle && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      setCashDriver(driver);
      setCashAmount('');
      setShowCashModal(true);
    }}
    className="p-2 rounded-lg bg-emerald-50 text-emerald-600"
    title="Record Cash Payment"
  >
    <span className="text-xs font-black">₹</span>
  </button>
)}
                      <button 
                        onClick={() => openChatWithDriver(driver)}
                        className="p-2 rounded-lg bg-indigo-50 text-indigo-600"
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
                  ? 'bg-indigo-600 text-white' 
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
          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black disabled:opacity-50"
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
  const [damages, setDamages] = useState([]);
const [showDamageForm, setShowDamageForm] = useState(false);
const [damageForm, setDamageForm] = useState({ 
  type:'ACCIDENT', amount:'', desc:'', recovery:'LEDGER' 
});

useEffect(() => {
  if (selectedVehicleDetails?.id) {
    fetch(`${API}/api/payment/owner/damage-records/${selectedVehicleDetails.id}`, {
      headers: { Authorization: `Bearer ${token()}` }
    }).then(r=>r.json()).then(setDamages).catch(()=>{});
  }
}, [selectedVehicleDetails?.id]);

const addDamage = async () => {
  if (!damageForm.amount) return alert('Amount required');
  const res = await fetch(`${API}/api/payment/owner/damage-record`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token()}` },
    body: JSON.stringify({
      vehicleId: selectedVehicleDetails.id,
      driverId: selectedVehicleDetails.driver_id || null,
      ownerId: ownerId(),
      damageType: damageForm.type,
      description: damageForm.desc,
      amount: parseFloat(damageForm.amount),
      recoveryMethod: damageForm.recovery
    })
  });
  const d = await res.json();
  if (d.success) {
    alert('✅ Damage recorded!');
    setShowDamageForm(false);
    setDamageForm({ type:'ACCIDENT', amount:'', desc:'', recovery:'LEDGER' });
    // Refresh damages
    fetch(`${API}/api/payment/owner/damage-records/${selectedVehicleDetails.id}`,{
      headers:{Authorization:`Bearer ${token()}`}
    }).then(r=>r.json()).then(setDamages).catch(()=>{});
  }
};
  // ✅ Hooks PEHLE — early return se pehle
  const [vStats, setVStats] = useState(null);

const [vehicleHistory, setVehicleHistory] = useState([]);

  useEffect(() => {
    if (selectedVehicleDetails?.id) {
      fetch(`${API}/api/payment/owner/vehicle-stats/${selectedVehicleDetails.id}`, {
        headers: { Authorization: `Bearer ${token()}` }
      }).then(r => r.json()).then(setVStats).catch(() => {});

      // Vehicle history bhi fetch karo
      fetch(`${API}/api/payment/owner/vehicle-history/${selectedVehicleDetails.id}`, {
        headers: { Authorization: `Bearer ${token()}` }
      }).then(r => r.json()).then(setVehicleHistory).catch(() => {});
    }
  }, [selectedVehicleDetails?.id]);

  // ✅ Early return BAAD MEIN
  if (!selectedVehicleDetails) return null;
  const vehicle = selectedVehicleDetails;

  const getVehicleImage = (type) => {
    const images = {
      'TRUCK': 'https://cdn-icons-png.flaticon.com/512/3413/3413029.png',
      'CAR': 'https://cdn-icons-png.flaticon.com/512/3413/3413028.png',
      'BUS': 'https://cdn-icons-png.flaticon.com/512/3413/3413030.png',
      'AUTO': 'https://cdn-icons-png.flaticon.com/512/3413/3413032.png'
    };
    return images[type] || images['TRUCK'];
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => { if(e.target===e.currentTarget){ setShowVehicleDetailModal(false); setSelectedVehicleDetails(null); } }}>
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        
        {/* Image Header */}
        <div className="relative h-48 bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-t-3xl">
          <img src={getVehicleImage(vehicle.vehicle_type||'TRUCK')} alt={vehicle.vehicle_model}
            className="w-full h-full object-contain p-4" />
          <button onClick={()=>{setShowVehicleDetailModal(false);setSelectedVehicleDetails(null);}}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {/* ✅ Compliance */}
          <div className="mb-5">
            <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
              <Shield size={18}/> Compliance & Docs
            </h3>
            <div className="space-y-2">
              {vehicle.chassis_number && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">🔩 Chassis No.</span>
                  <span className="text-sm font-black font-mono">{vehicle.chassis_number}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">🛡️ Insurance Expiry</span>
                {vehicle.insurance_expiry ? (
                  <span className={`text-sm font-black ${
                    new Date(vehicle.insurance_expiry) < new Date() ? 'text-red-600' :
                    new Date(vehicle.insurance_expiry) < new Date(Date.now()+30*24*60*60*1000) ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {new Date(vehicle.insurance_expiry).toLocaleDateString('en-IN')}
                    {new Date(vehicle.insurance_expiry) < new Date() && ' ⚠️ EXPIRED'}
                  </span>
                ) : <span className="text-sm text-slate-400">Not added</span>}
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500">📋 Fitness Expiry</span>
                {vehicle.fitness_expiry ? (
                  <span className={`text-sm font-black ${new Date(vehicle.fitness_expiry)<new Date()?'text-red-600':'text-emerald-600'}`}>
                    {new Date(vehicle.fitness_expiry).toLocaleDateString('en-IN')}
                    {new Date(vehicle.fitness_expiry)<new Date()&&' ⚠️ EXPIRED'}
                  </span>
                ) : <span className="text-sm text-slate-400">Not added</span>}
              </div>
            </div>
          </div>

          {/* ✅ Financial Intelligence */}
          {vStats && (
            <div className="mb-5">
              <h3 className="font-black text-slate-800 mb-3">📈 Financial Intelligence</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-[9px] text-emerald-600 font-bold uppercase">Total Revenue</p>
                  <p className="text-base font-black text-emerald-700">₹{vStats.total_revenue.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3 text-center">
                  <p className="text-[9px] text-indigo-600 font-bold uppercase">Payments</p>
                  <p className="text-base font-black text-indigo-700">{vStats.payment_count}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-[9px] text-amber-600 font-bold uppercase">Days Assigned</p>
                  <p className="text-base font-black text-amber-700">{vStats.assigned_days}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${vStats.roi_percent>=80?'bg-emerald-50':vStats.roi_percent>=50?'bg-amber-50':'bg-red-50'}`}>
                  <p className={`text-[9px] font-bold uppercase ${vStats.roi_percent>=80?'text-emerald-600':vStats.roi_percent>=50?'text-amber-600':'text-red-600'}`}>Collection Rate</p>
                  <p className={`text-base font-black ${vStats.roi_percent>=80?'text-emerald-700':vStats.roi_percent>=50?'text-amber-700':'text-red-700'}`}>{vStats.roi_percent}%</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                  <span>Collection Efficiency</span><span>{vStats.roi_percent}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${vStats.roi_percent>=80?'bg-emerald-500':vStats.roi_percent>=50?'bg-amber-500':'bg-red-500'}`}
                    style={{width:`${Math.min(vStats.roi_percent,100)}%`}}/>
                </div>
              </div>
            </div>
          )}

          {/* ✅ Operational Status */}
          <div className="mb-4">
            <label className="text-xs font-black text-slate-600 block mb-2">Operational Status</label>
            <select className="w-full border rounded-xl p-3 text-sm bg-white"
              value={vehicle.operational_status||'ACTIVE'}
              onChange={async(e)=>{
                await fetch(`${API}/api/payment/owner/vehicles/${vehicle.id}/status`,{
                  method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`},
                  body:JSON.stringify({status:e.target.value})
                });
                fetchAllData();
              }}>
              <option value="ACTIVE">✅ Active</option>
              <option value="MAINTENANCE">🔧 Under Maintenance</option>
              <option value="ACCIDENT">🚨 Accident Case</option>
              <option value="RECOVERY">💰 Recovery Required</option>
              <option value="INACTIVE">⏸ Inactive</option>
            </select>
          </div>
          {/* DAMAGE RECORDS */}
<div className="mb-5">
  <div className="flex justify-between items-center mb-3">
    <h3 className="font-black text-slate-800">🚨 Damage Records</h3>
    <button onClick={()=>setShowDamageForm(!showDamageForm)}
      className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl">
      + Add
    </button>
  </div>

  {showDamageForm && (
    <div className="bg-red-50 rounded-xl p-3 mb-3 space-y-2">
      <select value={damageForm.type} onChange={e=>setDamageForm({...damageForm,type:e.target.value})}
        className="w-full border rounded-xl p-2 text-sm bg-white">
        <option value="ACCIDENT">🚗 Accident</option>
        <option value="TYRE">🔄 Tyre Damage</option>
        <option value="SCRATCH">🔧 Scratch/Dent</option>
        <option value="ENGINE">⚙️ Engine Issue</option>
        <option value="OTHER">📋 Other</option>
      </select>
      <input type="number" placeholder="Amount (₹)" value={damageForm.amount}
        onChange={e=>setDamageForm({...damageForm,amount:e.target.value})}
        className="w-full border rounded-xl p-2 text-sm"/>
      <input placeholder="Description" value={damageForm.desc}
        onChange={e=>setDamageForm({...damageForm,desc:e.target.value})}
        className="w-full border rounded-xl p-2 text-sm"/>
      <select value={damageForm.recovery} onChange={e=>setDamageForm({...damageForm,recovery:e.target.value})}
        className="w-full border rounded-xl p-2 text-sm bg-white">
        <option value="LEDGER">📋 Add to Driver Ledger</option>
        <option value="DEPOSIT">🔒 Deduct from Deposit</option>
        <option value="DRIVER_PAID">💵 Driver Paid Directly</option>
      </select>
      <div className="flex gap-2">
        <button onClick={()=>setShowDamageForm(false)}
          className="flex-1 py-2 bg-slate-100 rounded-xl text-xs font-black">Cancel</button>
        <button onClick={addDamage}
          className="flex-1 py-2 bg-red-600 text-white rounded-xl text-xs font-black">Record</button>
      </div>
    </div>
  )}

  {damages.length === 0 ? (
    <p className="text-xs text-slate-400 text-center py-2">No damage records</p>
  ) : (
    <div className="space-y-2">
      {damages.map((d,i)=>(
        <div key={i} className={`rounded-xl p-3 border ${d.status==='RESOLVED'?'bg-slate-50 border-slate-200':'bg-red-50 border-red-200'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-black text-slate-800">{d.damage_type} — ₹{parseFloat(d.damage_amount).toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{d.description}</p>
              <p className="text-[9px] text-slate-400">{new Date(d.incident_date).toLocaleDateString('en-IN')} · {d.driver_name||'No driver'}</p>
            </div>
            {d.status==='OPEN' && (
              <button onClick={async()=>{
                await fetch(`${API}/api/payment/owner/damage-record/${d.id}/resolve`,{
                  method:'PUT',headers:{Authorization:`Bearer ${token()}`}
                });
                setDamages(prev=>prev.map((x,j)=>j===i?{...x,status:'RESOLVED'}:x));
              }} className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                ✓ Resolve
              </button>
            )}
            {d.status==='RESOLVED' && <span className="text-[9px] text-emerald-600 font-black">✅ Resolved</span>}
          </div>
        </div>
      ))}
    </div>
  )}
</div>

          {/* ✅ Driver Assignment */}
          <div className="border-t pt-4">
            {vehicle.driver_id ? (
              <div className="space-y-3">
                <h3 className="font-black text-slate-800 flex items-center gap-2"><Users size={16}/> Assigned Driver</h3>
                <button 
      onClick={() => {
        const driver = drivers.find(d => 
          d.id === vehicle.driver_id || 
          d.mobile_number === vehicle.driver_phone ||
          d.phone_number === vehicle.driver_phone
        );
        setShowVehicleDetailModal(false);
        setSelectedVehicleDetails(null);
        if (driver) openChatWithDriver(driver);
      }}
      className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2"
    >
      <MessageCircle size={16}/> Chat with Driver
    </button>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="font-black text-slate-800 text-lg">{vehicle.driver_name}</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">{vehicle.driver_phone}</p>
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-emerald-200">
                    {[{label:'Daily',val:vehicle.daily_rent},{label:'Weekly',val:vehicle.daily_rent*7},{label:'Monthly',val:vehicle.daily_rent*30},{label:'Annual',val:vehicle.daily_rent*365}].map(({label,val})=>(
                      <div key={label} className="bg-white rounded-xl p-2 text-center border border-emerald-100">
                        <p className="text-[9px] text-slate-400 font-bold">{label}</p>
                        <p className="text-sm font-black text-slate-800">₹{(val||0).toLocaleString('en-IN')}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={()=>handleUnassign(vehicle.id)}
                  className="w-full py-3 bg-red-50 text-red-600 rounded-xl text-sm font-black border border-red-200">
                  🔗 Remove Driver Assignment
                </button>
                {/* Driver History */}
                <div className="mt-4 border-t pt-4">
                  <h3 className="font-black text-slate-800 mb-3">📋 Driver History</h3>
                  {vehicleHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">Koi history nahi</p>
                  ) : (
                    <div className="space-y-2">
                      {vehicleHistory.map((h, i) => (
                        <div key={i} className={`rounded-xl p-3 border ${!h.unassigned_at ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-black text-slate-800">{h.driver_name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{h.driver_phone}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(h.assigned_at).toLocaleDateString('en-IN')} → {h.unassigned_at ? new Date(h.unassigned_at).toLocaleDateString('en-IN') : 'Present'}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {Math.floor((new Date(h.unassigned_at||Date.now()) - new Date(h.assigned_at)) / 86400000)} days · ₹{h.daily_rent}/day ({h.rent_type})
                              </p>
                              <p className="text-[10px] font-black text-emerald-600">
                                Total: ₹{(Math.floor((new Date(h.unassigned_at||Date.now()) - new Date(h.assigned_at)) / 86400000) * parseFloat(h.daily_rent||0)).toLocaleString('en-IN')}
                              </p>
                            </div>
                            {!h.unassigned_at && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Current</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2"><UserPlus size={16}/> Assign to Driver</h3>
                <div className="mb-4">
                  <label className="text-xs font-black text-slate-600 block mb-2">Select Rent Plan</label>
                  <div className="flex gap-2">
                    {['DAILY','WEEKLY','MONTHLY'].map(type=>(
                      <button key={type} type="button"
                        onClick={e=>{e.stopPropagation();setSelectedRentType(type);
                          if(type==='DAILY')setCustomRentAmount(vehicle.daily_rent);
                          else if(type==='WEEKLY')setCustomRentAmount(vehicle.daily_rent*7);
                          else setCustomRentAmount(vehicle.daily_rent*30);}}
                        className={`flex-1 py-2 rounded-lg text-xs font-black ${selectedRentType===type?'bg-indigo-600 text-white':'bg-slate-100 text-slate-600'}`}>
                        {type==='DAILY'?'📅 Daily':type==='WEEKLY'?'📆 Weekly':'📅 Monthly'}
                      </button>
                    ))}
                  </div>
                </div>
                <input type="number" defaultValue={customRentAmount} onBlur={e=>setCustomRentAmount(e.target.value)}
                  className="w-full border rounded-xl p-3 text-sm mb-4" placeholder="Enter rent amount"/>
                <select className="w-full border rounded-xl p-3 text-sm bg-white mb-4"
                  value={selectedDriverForAssign?.id||''}
                  onChange={e=>{const d=availableUnassignedDrivers.find(d=>d.id===parseInt(e.target.value));setSelectedDriverForAssign(d);}}>
                  <option value="">-- Choose Driver --</option>
                  {availableUnassignedDrivers.map(d=><option key={d.id} value={d.id}>{d.full_name} - {d.driver_code}</option>)}
                </select>
                <button type="button"
                  onClick={e=>{e.stopPropagation();
                    if(!selectedDriverForAssign)return alert('Select a driver');
                    if(!customRentAmount||customRentAmount<=0)return alert('Enter valid rent');
                    assignDriverToVehicleWithRent(vehicle.id,selectedDriverForAssign.id,selectedRentType,parseFloat(customRentAmount));}}
                  disabled={!selectedDriverForAssign||assigning}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-black disabled:opacity-50">
                  {assigning?'Assigning...':'✓ Assign & Notify Driver'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

  // VEHICLES TAB
  // VEHICLES TAB - FIXED STATUS
const VehiclesTab = () => {
  const getVehicleIcon = (v) => {
  const t = (v.vehicle_type || v.vehicle_model || '').toLowerCase();
  if (t.includes('ev') || t.includes('treo') || t.includes('electric')) 
    return { bg: 'bg-green-100', icon: '⚡' };
  if (t.includes('bike') || t.includes('activa') || t.includes('shine') || t.includes('2w')) 
    return { bg: 'bg-purple-100', icon: '🛵' };
  if (t.includes('auto') || t.includes('3w') || t.includes('bajaj re')) 
    return { bg: 'bg-orange-100', icon: '🛺' };
  if (t.includes('truck') || t.includes('ace') || t.includes('tempo')) 
    return { bg: 'bg-red-100', icon: '🚛' };
  return { bg: 'bg-amber-100', icon: '🚗' };
};
  const sorted = [...vehicles]
    .filter(v =>
      (v.vehicle_number || '').toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      (v.vehicle_model || '').toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      (v.driver_name || '').toLowerCase().includes(vehicleSearch.toLowerCase())
    )
    .sort((a,b) => (a.driver_id ? 1 : -1) - (b.driver_id ? 1 : -1));
  return (
  <div className="space-y-3 pb-4">
    {/* Search Bar */}
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input type="text" placeholder="Search by vehicle no, model or driver..."
        value={vehicleSearch}
        onChange={e => setVehicleSearch(e.target.value)}
        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"/>
      {vehicleSearch && (
        <button onClick={() => setVehicleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
          <X size={14} className="text-slate-400"/>
        </button>
      )}
    </div>
    <div className="flex gap-2">
  <button onClick={openAddVehicleModal}
    className="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2">
    <Plus size={16} /> Add Vehicle
  </button>
  <button onClick={() => { setShowBulkModal(true); setBulkTab('vehicles'); setBulkVehicles([]); setBulkResult(null); setBulkFile(null); }}
    className="py-3 px-4 bg-emerald-600 text-white rounded-xl text-sm font-black">
    📊 Bulk
  </button>
</div>
    
    <div className="space-y-3">
      
      {sorted.map((vehicle, i) => (
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
              <div className={`w-10 h-10 rounded-xl ${getVehicleIcon(vehicle).bg} flex items-center justify-center text-lg`}>
  {getVehicleIcon(vehicle).icon}
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
          {/* Operational Status Badge */}
{vehicle.operational_status && vehicle.operational_status !== 'ACTIVE' && (
  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
    vehicle.operational_status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-700' :
    vehicle.operational_status === 'ACCIDENT'    ? 'bg-red-100 text-red-700' :
    vehicle.operational_status === 'RECOVERY'    ? 'bg-orange-100 text-orange-700' :
    'bg-slate-100 text-slate-500'
  }`}>
    {vehicle.operational_status === 'MAINTENANCE' ? '🔧 Maintenance' :
     vehicle.operational_status === 'ACCIDENT'    ? '🚨 Accident' :
     vehicle.operational_status === 'RECOVERY'    ? '💰 Recovery' : '⏸ Inactive'}
  </span>
)}
          
          {/* Assigned Driver Info */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <div>
              <p className="text-[10px] text-slate-400">{t.assignedDriver}</p>
              <p className="text-xs font-black text-slate-800">
                {vehicle.driver_name || t.notAssigned}
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
              {vehicle.driver_id ? t.assigned : t.available}
            </span>
          </div>
        </div>
      ))}
      {vehicles.length === 0 && (
  <div className="bg-white rounded-2xl p-8 text-center text-slate-400">
    <Truck size={32} className="mx-auto mb-2 opacity-50" />
    <p className="text-sm">No vehicles yet</p>
    <p className="text-xs mt-1">Use buttons above to add vehicles</p>
  </div>
)}
    </div>
  </div>
);}
const PaymentsTab = () => {
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  
  const fetchTransactions = async () => {
    setLoadingTx(true);
    try {
      const res = await fetch(`${API}/api/payment/owner/transactions?ownerId=${ownerId()}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setTransactions(data);
      else if (data?.transactions) setTransactions(data.transactions);
      else setTransactions([]);
    } catch { setTransactions([]); }
    finally { setLoadingTx(false); }
  };
  
  useEffect(() => { fetchTransactions(); }, []);
  
  const liveTx = transactions.filter(tx => tx.payment_mode !== 'CASH');
  const cashTx = transactions.filter(tx => tx.payment_mode === 'CASH');
  const cashTotal = cashTx.reduce((s, tx) => s + parseFloat(tx.order_amount || 0), 0);
  const [showAllTx, setShowAllTx] = useState(false);
  const displayedTx = showAllTx ? liveTx : liveTx.slice(0, 5);

  return (
    <div className="space-y-4 pb-4">

      {/* Pay Links shortcut */}
      <button
        onClick={() => setActiveTab('links')}
        className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-4 flex items-center justify-between text-white shadow-sm"
      >
        <div className="flex items-center gap-3">
          <CreditCard size={20} />
          <div className="text-left">
            <p className="text-[11px] font-black tracking-wide">PAYMENT LINKS</p>
            <p className="text-[9px] opacity-75">Send payment request to driver</p>
          </div>
        </div>
        <span className="text-xs font-black opacity-80">→</span>
      </button>

      {/* Total Banner — clean minimal */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">{t.totalCol}</p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] text-slate-400 mb-0.5">Online + UPI</p>
            <p className="text-2xl font-black text-slate-800">₹{stats.todayCollection.toLocaleString('en-IN')}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-400 mb-0.5">Cash Collected</p>
            <p className="text-2xl font-black text-indigo-600">₹{cashTotal.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
          <p className="text-[9px] text-slate-400">Total (Online + Cash)</p>
          <p className="text-sm font-black text-slate-700">₹{(stats.todayCollection + cashTotal).toLocaleString('en-IN')}</p>
        </div>
        <p className="text-[9px] text-slate-400 mt-1">Last 30 days</p>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="text-[10px] font-black text-slate-400 uppercase">{t.txHistory}</h3>
          <span className="text-[9px] text-slate-400">{liveTx.length} transactions</span>
        </div>
        <div className="divide-y">
          {loadingTx ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading...</div>
          ) : liveTx.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">{t.noTx}</div>
          ) : (
            displayedTx.map((tx, i) => (
              <div key={i} onClick={() => setSelectedTx(tx)} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition cursor-pointer active:bg-slate-100">
                <div>
                  <p className="text-xs font-black text-slate-800">{tx.driver_name || tx.payer_name || 'Driver'}</p>
                  <p className="text-[9px] text-slate-400">{tx.vehicle_number || '—'}</p>
                  <p className="text-[9px] text-slate-400 font-mono">
                    {new Date(tx.order_completion_date || tx.order_initiation_date).toLocaleString('en-IN', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:true})}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-800">₹{parseFloat(tx.order_amount).toLocaleString('en-IN')}</p>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                    tx.transaction_status === 'SUCCESS' ? 'bg-green-50 text-green-600 border-green-100' :
                    tx.transaction_status === 'PENDING' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                    'bg-red-50 text-red-500 border-red-100'
                  }`}>
                    {tx.transaction_status || 'SUCCESS'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        {liveTx.length > 5 && (
          <div className="px-4 py-3 border-t border-slate-100">
            <button onClick={() => setShowAllTx(!showAllTx)}
              className="w-full text-[11px] font-black text-indigo-600 py-2 rounded-xl hover:bg-indigo-50 transition">
              {showAllTx ? `Show Less ↑` : `Load More (${liveTx.length - 5} more) ↓`}
            </button>
          </div>
        )}
      </div>

      {/* Cash Payments — ALAG SECTION NICHE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b bg-emerald-50 flex items-center justify-between">
          <h3 className="text-[10px] font-black text-emerald-700 uppercase">💵 {t.cashPaid}</h3>
          {cashTx.length > 0 && <span className="text-[10px] font-black text-emerald-600">₹{cashTotal.toLocaleString('en-IN')}</span>}
        </div>
        <div className="divide-y max-h-64 overflow-y-auto">
          {cashTx.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-6">No cash payments recorded yet</p>
          ) : cashTx.map((tx, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
              <div>
                <p className="text-xs font-black text-slate-800">{tx.driver_name || tx.payer_name}</p>
                <p className="text-[9px] text-slate-400">{tx.vehicle_number || '—'}</p>
                <p className="text-[9px] text-slate-400 font-mono">
                  {new Date(tx.order_completion_date || tx.order_initiation_date).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-emerald-600">₹{parseFloat(tx.order_amount).toLocaleString('en-IN')}</p>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  💵 CASH
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <DriverLedgerSection ownerIdVal={ownerId()} tokenVal={token()} />

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setSelectedTx(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-[412px] p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">Transaction Details</h3>
              <button onClick={() => setSelectedTx(null)} className="text-slate-400 text-lg">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              {[
                ['Driver', selectedTx.driver_name || selectedTx.payer_name || '—'],
                ['Phone', selectedTx.payer_mobile || '—'],
                ['Vehicle', selectedTx.vehicle_number || '—'],
                ['Amount', `₹${parseFloat(selectedTx.order_amount).toLocaleString('en-IN')}`],
                ['Purpose', selectedTx.purpose || 'RENT'],
                ['Mode', selectedTx.payment_mode || '—'],
                ['Status', selectedTx.transaction_status || '—'],
                ['Order ID', selectedTx.order_number || selectedTx.order_id || '—'],
                ['Initiated', selectedTx.order_initiation_date ? new Date(selectedTx.order_initiation_date).toLocaleString('en-IN') : '—'],
                ['Completed', selectedTx.order_completion_date ? new Date(selectedTx.order_completion_date).toLocaleString('en-IN') : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-start py-2 border-b border-slate-50">
                  <span className="text-slate-400 font-medium w-24 shrink-0">{label}</span>
                  <span className="text-slate-800 font-black text-right break-all">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// PROFILE TAB - Complete
const ProfileTab = () => (
  <div className="space-y-4 pb-4">
    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white text-center">
      <div className="w-20 h-20 rounded-full bg-white/20 mx-auto flex items-center justify-center text-3xl font-black mb-3 cursor-pointer hover:bg-white/30 transition">
        <Camera size={24} className="text-white" />
      </div>
      <h2 className="text-lg font-black">{owner?.full_name || owner?.name || 'Rajesh Kumar'}</h2>
      <p className="text-xs text-indigo-200">Owner Code: {owner?.owner_code || 'OWN701951'}</p>
      <p className="text-[10px] text-indigo-200 mt-1">Member since {new Date().toLocaleDateString()}</p>
    </div>
    
    <div className="bg-white rounded-2xl p-4 space-y-3 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center py-2 border-b border-slate-100">
        <span className="text-xs text-slate-500 flex items-center gap-2"><Phone size={12} /> {t.phone}</span>
        <span className="text-xs font-black font-mono">{owner?.mobile_number || '—'}</span>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-slate-100">
        <span className="text-xs text-slate-500 flex items-center gap-2"><Mail size={12} /> {t.email}</span>
        <span className="text-xs font-black">{owner?.email || '—'}</span>
        <button className="text-[9px] text-indigo-600">Edit</button>
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
        <span className="text-xs text-slate-500 flex items-center gap-2"><Building size={12} /> {t.businessName}</span>
        <span className="text-xs font-black">{owner?.company_name || '—'}</span>
        <button className="text-[9px] text-indigo-600">Edit</button>
      </div>
      <div className="flex justify-between items-center py-2">
        <span className="text-xs text-slate-500 flex items-center gap-2"><MapPin size={12} /> {t.address}</span>
        <span className="text-xs font-black text-right">{owner?.city || '—'}</span>
        <button className="text-[9px] text-indigo-600">Edit</button>
      </div>
    </div>
    
    <button className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2">
      <Edit2 size={14} /> {t.editProfile}
    </button>

    {/* ─── Manager Role (Premium) ─── */}
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-800">👥 Manager Role</span>
          {ownerPlan.is_premium
            ? <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">PREMIUM ✓</span>
            : <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">🔒 LOCKED</span>
          }
        </div>
        {ownerPlan.is_premium && (
          <button onClick={() => setShowAddManager(true)}
            className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition">
            + Add Manager
          </button>
        )}
      </div>

      {!ownerPlan.is_premium ? (
        !managerDemoMode ? (
        /* ── Paywall ── */
        <div className="p-5">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🔐</div>
            <p className="font-black text-slate-800">Unlock Manager Role</p>
            <p className="text-xs text-slate-400 mt-1">Add managers and control exactly what they can do</p>
          </div>
          <div className="space-y-2 mb-4">
            {['Add unlimited managers','Custom permissions per manager','Assign vehicles, record cash, view reports','Full access control'].map((f,i)=>(
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                  <span className="text-[8px] text-indigo-600 font-black">✓</span>
                </div>
                <span className="text-xs text-slate-600">{f}</span>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200 mb-3">
            <p className="text-[10px] text-slate-400 mb-1">Starting at</p>
            <p className="text-2xl font-black text-indigo-600">₹499<span className="text-sm font-normal text-slate-400">/month</span></p>
          </div>
          {/* Sneak peek button */}
          <button onClick={() => setManagerDemoMode(true)}
            className="w-full border-2 border-indigo-200 text-indigo-600 font-black py-2.5 rounded-xl text-sm mb-2 hover:bg-indigo-50 transition flex items-center justify-center gap-2">
            👀 See how it works — Free Preview
          </button>
          <button onClick={async () => {
              const u = JSON.parse(localStorage.getItem('user') || '{}');
              const r = await fetch(`${API}/api/payment/create-order`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                body: JSON.stringify({ amount: 499, customerName: u.name || 'Owner', customerPhone: ownerPhone(), customerEmail: u.email || 'owner@mg.com', purpose: 'PREMIUM_MANAGER' })
              }).then(r => r.json());
              const url = r?.checkoutUrl || r?.data?.checkoutUrl;
              if (url) window.location.href = url; else alert('Contact support to upgrade.');
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl text-sm transition">
            🚀 Unlock — ₹499/month
          </button>
          <p className="text-[9px] text-slate-400 text-center mt-2">Secure payment via PayYantra</p>
        </div>
        ) : (
        /* ── Demo / Sneak Peek Mode ── */
        <div>
          {/* Demo banner */}
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">PREVIEW MODE</span>
              <span className="text-[10px] text-amber-700">Explore the feature — changes won't be saved</span>
            </div>
            <button onClick={() => setManagerDemoMode(false)} className="text-amber-600 text-[10px] font-black">✕ Exit</button>
          </div>

          {/* Demo manager pre-populated */}
          <div className="divide-y divide-slate-50">
            {/* Sample manager 1 */}
            {[
              { name: 'Ankit Sharma', phone: '9876500001', code: 'MGR-DEMO1', perms: ['assign_vehicles','record_cash','view_financials','chat_drivers'] },
              { name: 'Meera Patel', phone: '9876500002', code: 'MGR-DEMO2', perms: ['record_cash','chat_drivers'] },
            ].map((dm, i) => (
              <div key={i} className="px-4 py-3 flex items-start justify-between gap-2 opacity-70">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-600 shrink-0">
                    {dm.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-slate-800">{dm.name}</p>
                      <span className="text-[8px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">DEMO</span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-mono">{dm.phone} · {dm.code}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {dm.perms.map(k => (
                        <span key={k} className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100">{k.replace(/_/g,' ')}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-300 shrink-0">🔒 Locked</span>
              </div>
            ))}

            {/* Try adding a manager */}
            <div className="p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Try adding a manager</p>
              <div className="space-y-2 mb-3">
                <input placeholder="Manager Name" disabled
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"/>
                <input placeholder="Phone Number" disabled
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"/>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Permissions</p>
              <div className="space-y-0 mb-4">
                {[
                  {key:'assign_vehicles', label:'Assign / Unassign Vehicles'},
                  {key:'record_cash',     label:'Record Cash Payments'},
                  {key:'view_financials', label:'View Collections & Ledger'},
                  {key:'add_drivers',     label:'Add New Drivers'},
                ].map(({key, label}) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-slate-50">
                    <span className="text-xs text-slate-600">{label}</span>
                    <button onClick={() => setNewManager(p => ({...p, permissions:{...p.permissions,[key]:!p.permissions[key]}}))}
                      className={`w-10 h-5 rounded-full relative transition-all shrink-0 ${newManager.permissions[key]?'bg-indigo-600':'bg-slate-200'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow transition-all ${newManager.permissions[key]?'right-0.5':'left-0.5'}`}/>
                    </button>
                  </div>
                ))}
              </div>

              {/* Upgrade CTA after they've explored */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-4 text-white text-center">
                <p className="text-sm font-black mb-1">🎉 Looks good, right?</p>
                <p className="text-[10px] text-indigo-200 mb-3">Unlock to actually add managers and save their permissions</p>
                <button onClick={async () => {
                    setManagerDemoMode(false);
                    const u = JSON.parse(localStorage.getItem('user') || '{}');
                    const r = await fetch(`${API}/api/payment/create-order`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                      body: JSON.stringify({ amount: 499, customerName: u.name || 'Owner', customerPhone: ownerPhone(), customerEmail: u.email || 'owner@mg.com', purpose: 'PREMIUM_MANAGER' })
                    }).then(r => r.json());
                    const url = r?.checkoutUrl || r?.data?.checkoutUrl;
                    if (url) window.location.href = url; else alert('Contact support to upgrade.');
                  }}
                  className="w-full bg-white text-indigo-600 font-black py-2.5 rounded-xl text-sm hover:bg-indigo-50 transition">
                  🚀 Unlock Now — ₹499/month
                </button>
              </div>
            </div>
          </div>
        </div>
        )
      ) : (
        <div className="divide-y divide-slate-50">
          {managers.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs text-slate-400">No managers yet</p>
              <button onClick={() => setShowAddManager(true)} className="text-indigo-600 font-black text-xs mt-1">+ Add first manager</button>
            </div>
          ) : managers.map((m, i) => (
            <div key={i} className="px-4 py-3 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-600 shrink-0">
                  {m.full_name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">{m.full_name}</p>
                  <p className="text-[9px] text-slate-400 font-mono">{m.mobile_number} · {m.manager_code}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(m.permissions||{}).filter(([,v])=>v).map(([k])=>(
                      <span key={k} className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100">{k.replace(/_/g,' ')}</span>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={async () => {
                if (!window.confirm(`Remove ${m.full_name}?`)) return;
                await fetch(`${API}/api/payment/owner/managers/${m.id}?ownerId=${ownerId()}`, { method:'DELETE', headers:{Authorization:`Bearer ${token()}`} });
                setManagers(p => p.filter(x => x.id !== m.id));
              }} className="text-[10px] font-black text-red-500 shrink-0">Remove</button>
            </div>
          ))}
          {ownerPlan.expires_at && (
            <div className="px-4 py-2 bg-slate-50">
              <p className="text-[9px] text-slate-400">Premium until {new Date(ownerPlan.expires_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</p>
            </div>
          )}
        </div>
      )}
    </div>

    {/* Add Manager Modal */}
    {showAddManager && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="px-5 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
            <p className="font-black text-slate-800">Add Manager</p>
            <button onClick={() => setShowAddManager(false)}><X size={18} className="text-slate-400"/></button>
          </div>
          <div className="p-5 space-y-4">
            <input placeholder="Full Name *" value={newManager.name}
              onChange={e => setNewManager(p => ({...p, name: e.target.value.replace(/[^a-zA-Z\s]/g,'')}))}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500"/>
            <input placeholder="Phone Number *" value={newManager.phone} maxLength={10}
              onChange={e => setNewManager(p => ({...p, phone: e.target.value.replace(/\D/g,'').slice(0,10)}))}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-mono focus:outline-none focus:border-indigo-500"/>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Set Permissions</p>
              <div className="space-y-0">
                {[
                  {key:'assign_vehicles',   label:'Assign / Unassign Vehicles'},
                  {key:'record_cash',       label:'Record Cash Payments'},
                  {key:'view_financials',   label:'View Collections & Ledger'},
                  {key:'chat_drivers',      label:'Chat with Drivers'},
                  {key:'add_drivers',       label:'Add New Drivers'},
                  {key:'remove_drivers',    label:'Remove Drivers'},
                  {key:'add_vehicles',      label:'Add New Vehicles'},
                  {key:'bulk_import',       label:'Bulk CSV Import'},
                  {key:'upload_documents',  label:'Upload Documents'},
                ].map(({key,label}) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-slate-50">
                    <span className="text-xs text-slate-600">{label}</span>
                    <button onClick={() => setNewManager(p => ({...p, permissions:{...p.permissions,[key]:!p.permissions[key]}}))}
                      className={`w-10 h-5 rounded-full relative transition-all shrink-0 ${newManager.permissions[key]?'bg-indigo-600':'bg-slate-200'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow transition-all ${newManager.permissions[key]?'right-0.5':'left-0.5'}`}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAddManager(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-black text-slate-600">Cancel</button>
              <button onClick={async () => {
                if (!newManager.name || newManager.phone.length !== 10) return alert('Enter valid name and 10-digit phone');
                const r = await fetch(`${API}/api/payment/owner/managers/add`, {
                  method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token()}`},
                  body: JSON.stringify({ownerId:ownerId(), fullName:newManager.name, mobileNumber:newManager.phone, permissions:newManager.permissions})
                }).then(r=>r.json());
                if (r.success) {
                  setManagers(p=>[r.manager,...p]); setShowAddManager(false);
                  setNewManager({name:'',phone:'',permissions:{assign_vehicles:true,record_cash:true,view_financials:true,chat_drivers:true,add_drivers:false,remove_drivers:false,add_vehicles:false,bulk_import:false,upload_documents:false}});
                  alert(`✅ ${newManager.name} added as manager!`);
                } else alert(r.error || 'Failed');
              }} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition">
                Add Manager
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-slate-800">🎯 Driver Incentive Rules</p>
          <p className="text-[10px] text-slate-400">Active hours pe rent discount configure karo</p>
        </div>
        <button onClick={() => setIncentiveRules(prev => ({ ...prev, is_enabled: !prev.is_enabled }))}
          className={`w-12 h-6 rounded-full relative transition-all ${incentiveRules.is_enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}>
          <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 shadow transition-all ${incentiveRules.is_enabled ? 'right-0.5' : 'left-0.5'}`}/>
        </button>
      </div>
      {incentiveRules.is_enabled && (
        <div className="space-y-3 pt-2 border-t border-slate-100">
          {incentiveRules.rules.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">Koi rule nahi — neeche add karo</p>
          )}
          {incentiveRules.rules.map((rule, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500">Rule {i + 1}</span>
                <button onClick={() => removeRule(i)} className="text-red-400 text-xs font-black">✕ Remove</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-slate-500 font-black block mb-1">Min Hours</label>
                  <input type="number" min={1} max={24} value={rule.min_hours}
                    onChange={e => updateRule(i, 'min_hours', parseInt(e.target.value))}
                    className="w-full border rounded-lg p-2 text-xs text-center font-black"/>
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 font-black block mb-1">Type</label>
                  <select value={rule.type} onChange={e => updateRule(i, 'type', e.target.value)}
                    className="w-full border rounded-lg p-2 text-xs bg-white">
                    <option value="FULL_WAIVER">🆓 Free</option>
                    <option value="PERCENTAGE">% Off</option>
                    <option value="FIXED">₹ Off</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 font-black block mb-1">
                    {rule.type === 'PERCENTAGE' ? '%' : rule.type === 'FIXED' ? '₹' : '—'}
                  </label>
                  <input type="number" value={rule.type === 'FULL_WAIVER' ? '' : rule.value}
                    disabled={rule.type === 'FULL_WAIVER'}
                    onChange={e => updateRule(i, 'value', parseFloat(e.target.value))}
                    className="w-full border rounded-lg p-2 text-xs text-center disabled:bg-slate-100"/>
                </div>
              </div>
              <div className="bg-indigo-50 rounded-lg px-2 py-1">
                <p className="text-[9px] text-indigo-700 font-black">
                  {rule.min_hours}h+ active → {rule.type === 'FULL_WAIVER' ? 'Rent free!' : rule.type === 'PERCENTAGE' ? `${rule.value||0}% rent discount` : `₹${rule.value||0} off`}
                </p>
              </div>
            </div>
          ))}
          <button onClick={addRule}
            className="w-full py-2 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-xl text-xs font-black hover:border-indigo-500 transition">
            + Add Rule
          </button>
          <button onClick={saveRules} disabled={savingRules}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black disabled:opacity-50">
            {savingRules ? 'Saving...' : '💾 Save Rules'}
          </button>
        </div>
      )}
    </div>
    <DocumentSection
  userId={ownerId()}
  userType="OWNER"
  token={token()}
/>
    <button onClick={logout} className="w-full bg-red-50 text-red-600 py-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 border border-red-100">
      <LogOut size={14} /> {t.logout}
    </button>
  </div>
);

  return (
    <div className="min-h-screen bg-slate-100 flex items-start justify-center">
      <div className="w-full bg-slate-50 flex flex-col relative overflow-hidden" style={{maxWidth:412, minHeight:'100dvh'}}>
        {/* Status bar */}
        <div className="bg-indigo-700 text-white text-[11px] px-4 py-1.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-black text-[10px] tracking-widest text-indigo-200">MG</span>
            <span className="text-indigo-400 text-[8px]">|</span>
            <span className="text-indigo-300 text-[9px] font-semibold">{t.portal}</span>
          </div>
          <span className="text-indigo-300 text-[10px] font-mono">{time}</span>
        </div>

        {/* Header */}
        <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between" style={{boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
          <div>
            <h1 className="text-[17px] font-black text-slate-800 tracking-tight">{getHeaderTitle()}</h1>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              {owner?.full_name ? `${owner.full_name}${owner.company_name ? ' · ' + owner.company_name : ''}` : getHeaderSubtitle()}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Language toggle */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg">
              <button onClick={() => setLang('en')} className={`px-2 py-1 text-[10px] font-black rounded-md transition ${lang==='en'?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`}>EN</button>
              <button onClick={() => setLang('hi')} className={`px-2 py-1 text-[10px] font-black rounded-md transition ${lang==='hi'?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`}>हिं</button>
            </div>
            <ThemeToggle />
            {/* AI Assistant */}
            <button onClick={() => setShowChatbot(true)} className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition flex items-center justify-center" title="AI Assistant">
              <MessageCircle size={15} className="text-indigo-600" />
            </button>
            {/* Notification bell */}
            <button onClick={() => setShowNotif(!showNotif)} className="relative w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 transition flex items-center justify-center">
              {unreadCount > 0 ? <BellRing size={15} className="text-indigo-600" /> : <Bell size={15} className="text-slate-500" />}
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {/* Logout */}
            <button onClick={logout} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 transition flex items-center justify-center">
              <LogOut size={15} className="text-red-500" />
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
            assignMode === 'driver' ? 'bg-indigo-600 text-white' : 'text-slate-600'
          }`}
        >
          Driver → Vehicle
        </button>
        <button
          onClick={() => setAssignMode('vehicle')}
          className={`flex-1 py-2 rounded-lg text-sm font-black transition ${
            assignMode === 'vehicle' ? 'bg-indigo-600 text-white' : 'text-slate-600'
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
        <div className="p-3 bg-indigo-50 rounded-xl mb-4">
          <p className="text-xs text-center text-indigo-800">
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
          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black disabled:opacity-50"
        >
          {assigning ? 'Assigning...' : 'Confirm Assignment'}
        </button>
      </div>
    </div>
  </div>
)}
        {/* Notification Panel */}
        {showNotif && (
          <div className="absolute top-[112px] left-3 right-3 sm:left-auto sm:right-3 sm:w-72 bg-white rounded-2xl shadow-2xl border z-[100]">
            <div className="px-4 py-2 border-b flex justify-between items-center">
              <span className="text-[10px] font-black">{t.notifications}</span>
              <button onClick={() => setShowNotif(false)}><X size={14} /></button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">{t.noNotif}</div>
              ) : (
                notifications.map((n, i) => (
  <div key={i}
    className={`px-4 py-3 border-b cursor-pointer hover:bg-slate-50 transition ${!n.is_read ? 'bg-indigo-50' : ''}`}
    onClick={() => {
      setNotifications(prev => prev.map((x, idx) => idx === i ? {...x, is_read: true} : x));
      setUnreadCount(prev => Math.max(0, prev - 1));
      setShowNotif(false);
      
      const title = (n.title || '').toLowerCase();
      
      // ✅ Chat notification → driver ki chat kholo
      if (title.includes('💬') || title.includes('message')) {
        setActiveTab('drivers');
        // Driver dhundo aur chat kholo
        const driver = drivers.find(d => 
          String(d.id) === String(n.driver_id) ||
          d.full_name === n.driver_name
        );
        if (driver) {
          setTimeout(() => openChatWithDriver(driver), 100);
        }
      } else if (title.includes('payment') || title.includes('rent') || title.includes('cash')) {
        setActiveTab('payments');
      } else if (title.includes('sos')) {
        // SOS already handles itself
      } else if (title.includes('vehicle') || title.includes('assign')) {
        setActiveTab('vehicles');
      } else {
        setActiveTab('home');
      }
    }}
  >
    <p className="text-xs font-black">{n.title}</p>
    <p className="text-[10px] text-slate-500">{n.message}</p>
    <p className="text-[9px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
    {!n.is_read && (
      <p className="text-[9px] font-black mt-0.5 text-indigo-500">
        {/* ✅ Chat vs transaction alag text */}
        {(n.title||'').includes('💬') ? 'Tap to open chat →' : 
         (n.title||'').includes('🚨') ? 'Tap to view SOS →' :
         'Tap to view →'}
      </p>
    )}
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
              {activeTab === 'links' && (
                <div>
                  <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                    <button onClick={() => setActiveTab('payments')} className="flex items-center gap-1 text-xs text-indigo-600 font-black">
                      <span>←</span> Back
                    </button>
                  </div>
                  <PaymentLinks token={localStorage.getItem('mg_token')} />
                </div>
              )}
              {activeTab === 'profile' && <ProfileTab />}
            </>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 max-w-[412px] mx-auto bg-white border-t border-slate-100 flex justify-around items-center z-50" style={{height:58, boxShadow:'0 -4px 20px rgba(0,0,0,0.06)'}}>
          {[
            { id: 'home',     Icon: Home,       label: t.navHome },
            { id: 'drivers',  Icon: Users,      label: t.navDrivers },
            { id: 'vehicles', Icon: Truck,      label: t.navFleet },
            { id: 'payments', Icon: Wallet,     label: t.navPayments },
            { id: 'profile',  Icon: User,       label: t.navProfile },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                setSearchQuery('');
                setVehicleSearch('');
              }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, paddingTop: 2, position: 'relative' }}
            >
              {activeTab === id && (
                <span style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:24, height:2, background:'#4f46e5', borderRadius:'0 0 4px 4px' }} />
              )}
              <Icon size={19} style={{ color: activeTab === id ? '#4f46e5' : '#94a3b8' }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', color: activeTab === id ? '#4f46e5' : '#94a3b8' }}>{label}</span>
            </button>
          ))}
        </div>
        {showChatbot && (
          <Chatbot 
  userRole="OWNER"
  userId={ownerId()}
  userPhone={ownerPhone()}
  token={token()}
  onClose={() => setShowChatbot(false)}
/>
)}
        {/* Chat Modal */}
        {showChat && selectedDriver && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm h-[500px] flex flex-col">
              <div className="p-4 bg-indigo-600 text-white rounded-t-3xl flex justify-between items-center">
                <div>
                  <h3 className="font-black">{selectedDriver.full_name || selectedDriver.name}</h3>
                  <p className="text-[10px] text-indigo-200">{selectedDriver.phone_number || selectedDriver.phone}</p>
                </div>
                <button onClick={() => setShowChat(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.from === 'owner' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${msg.from === 'owner' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                      {msg.text}
                      <div className={`text-[9px] mt-1 ${msg.from === 'owner' ? 'text-indigo-200' : 'text-slate-400'}`}>{msg.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t flex gap-2">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessageToDriver()}
                  placeholder="Type message..." className="flex-1 border rounded-xl px-3 py-2 text-sm" />
                <button onClick={sendMessageToDriver} className="bg-indigo-600 text-white p-2 rounded-xl"><Send size={16} /></button>
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
      {/* Insurance + Fitness */}
<div className="grid grid-cols-2 gap-2 mb-3">
  <div>
    <label className="text-[10px] font-black text-slate-500 block mb-1">🛡️ Insurance Expiry</label>
    <input 
      type="date"
      className="w-full border rounded-xl p-3 text-sm bg-white"
      value={newVehicle.insuranceExpiry || ''}
      onChange={e => setNewVehicle({...newVehicle, insuranceExpiry: e.target.value})}
    />
  </div>
  <div>
    <label className="text-[10px] font-black text-slate-500 block mb-1">📋 Fitness Expiry</label>
    <input 
      type="date"
      className="w-full border rounded-xl p-3 text-sm bg-white"
      value={newVehicle.fitnessExpiry || ''}
      onChange={e => setNewVehicle({...newVehicle, fitnessExpiry: e.target.value})}
    />
  </div>
</div>

{/* Chassis Number */}
<input
  placeholder="Chassis Number (optional)"
  className="w-full border rounded-xl p-3 mb-3 text-sm uppercase font-mono"
  value={newVehicle.chassisNumber || ''}
  onChange={e => setNewVehicle({...newVehicle, chassisNumber: e.target.value.toUpperCase()})}
/>
      
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
          {drivers.filter(d => !vehicles.some(v => v.driver_id === d.id)).map(driver => (
            <option key={driver.id} value={driver.id}>
              {driver.full_name} - {driver.mobile_number}
            </option>
          ))}
        </select>
      </div>
      
      {/* Buttons */}
      <div className="flex gap-3">
        <button onClick={() => setShowAddVehicle(false)} className="flex-1 py-3 bg-slate-100 rounded-xl text-sm font-black">Cancel</button>
        <button onClick={addVehicle} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black">Add Vehicle</button>
      </div>
    </div>
  </div>
)}
{showAddDriver && (
  <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
    <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      
      {/* Header */}
      <div className="p-5 pb-3 flex justify-between items-center border-b">
        <h3 className="text-lg font-black">Add Driver</h3>
        <button onClick={() => {
          setShowAddDriver(false);
          setAddDriverMode('single');
          setMultipleDrivers([{ name:'', phone:'' }]);
        }}><X size={20}/></button>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 p-4 pb-0">
        <button onClick={() => setAddDriverMode('single')}
          className={`flex-1 py-2 rounded-xl text-sm font-black transition ${
            addDriverMode==='single' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
          👤 Single
        </button>
        <button onClick={() => setAddDriverMode('multiple')}
          className={`flex-1 py-2 rounded-xl text-sm font-black transition ${
            addDriverMode==='multiple' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
          👥 Multiple
        </button>
      </div>

      <div className="p-5">
        {/* ── SINGLE MODE ── */}
        {addDriverMode === 'single' && (
          <div className="space-y-3">
            <input placeholder="Full Name (Letters only)"
              className="w-full border rounded-xl p-3 text-sm"
              value={newDriver.name}
              onChange={e => setNewDriver({...newDriver, name: e.target.value})}/>
            <input placeholder="Phone Number (10 digits)"
              className="w-full border rounded-xl p-3 text-sm"
              value={newDriver.phone}
              onChange={e => setNewDriver({...newDriver, phone: e.target.value.replace(/\D/g,'').slice(0,10)})}/>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400 text-sm font-black">₹</span>
              <input type="number" placeholder="Security Deposit (optional)"
                className="w-full border rounded-xl p-3 pl-7 text-sm"
                value={newDriver.securityDeposit || ''}
                onChange={e => setNewDriver({...newDriver, securityDeposit: e.target.value})}/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">Date of Birth</label>
                <input type="date" className="w-full border rounded-xl p-3 text-sm bg-white"
                  value={newDriver.dob}
                  onChange={e => setNewDriver({...newDriver, dob: e.target.value})}/>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">License Expiry</label>
                <input type="date" className="w-full border rounded-xl p-3 text-sm bg-white"
                  value={newDriver.licenseExpiry}
                  onChange={e => setNewDriver({...newDriver, licenseExpiry: e.target.value})}/>
              </div>
            </div>
            <input placeholder="License Number"
              className="w-full border rounded-xl p-3 text-sm uppercase font-mono"
              value={newDriver.licenseNumber}
              onChange={e => setNewDriver({...newDriver, licenseNumber: e.target.value.toUpperCase()})}/>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Emergency Contact Name"
                className="border rounded-xl p-3 text-sm"
                value={newDriver.emergencyName}
                onChange={e => setNewDriver({...newDriver, emergencyName: e.target.value})}/>
              <input placeholder="Emergency Phone"
                className="border rounded-xl p-3 text-sm"
                value={newDriver.emergencyPhone}
                onChange={e => setNewDriver({...newDriver, emergencyPhone: e.target.value.replace(/\D/g,'').slice(0,10)})}/>
            </div>
            <input placeholder="Home Address (optional)"
              className="w-full border rounded-xl p-3 text-sm"
              value={newDriver.address}
              onChange={e => setNewDriver({...newDriver, address: e.target.value})}/>
            <div className="border border-dashed border-slate-300 rounded-xl p-3 space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Agreement / Contract (PDF/Image)</p>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setAgreementFile(e.target.files[0] || null)}
                className="w-full text-xs text-slate-600"/>
              {agreementFile && <p className="text-[10px] text-emerald-600 font-black">📎 {agreementFile.name}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddDriver(false)}
                className="flex-1 py-3 bg-slate-100 rounded-xl text-sm font-black">Cancel</button>
              <button onClick={addDriver}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black">Add</button>
            </div>
          </div>
        )}

        {/* ── MULTIPLE MODE ── */}
        {addDriverMode === 'multiple' && (
          <div>
            <p className="text-xs text-slate-400 mb-3">
              Naam aur phone required hai. Baaki optional.
            </p>
            
            <div className="space-y-2 mb-3">
              {multipleDrivers.map((d, i) => (
                <div key={i} className={`border rounded-xl p-3 space-y-2 ${
                  d._saved ? 'bg-emerald-50 border-emerald-200' : 
                  d._error ? 'bg-red-50 border-red-200' : 'bg-slate-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400">Driver {i+1}</span>
                    <div className="flex items-center gap-2">
                      {d._saved && <span className="text-[10px] text-emerald-600 font-black">✅ Added</span>}
                      {d._error && <span className="text-[10px] text-red-600 font-black">{d._error}</span>}
                      {multipleDrivers.length > 1 && !d._saved && (
                        <button onClick={() => {
                          setMultipleDrivers(prev => prev.filter((_,idx) => idx!==i));
                        }} className="text-red-400 text-xs">✕</button>
                      )}
                    </div>
                  </div>
                  {!d._saved && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        placeholder="Full Name *"
                        className="border rounded-lg p-2 text-sm bg-white"
                        value={d.name}
                        onChange={e => setMultipleDrivers(prev => prev.map((x,idx) =>
                          idx===i ? {...x, name: e.target.value, _error: null} : x
                        ))}/>
                      <input
                        placeholder="Phone *"
                        className="border rounded-lg p-2 text-sm bg-white font-mono"
                        value={d.phone}
                        maxLength={10}
                        onChange={e => setMultipleDrivers(prev => prev.map((x,idx) =>
                          idx===i ? {...x, phone: e.target.value.replace(/\D/g,'').slice(0,10), _error: null} : x
                        ))}/>
                      <input
                        placeholder="License No. (optional)"
                        className="border rounded-lg p-2 text-sm bg-white uppercase font-mono"
                        value={d.license || ''}
                        onChange={e => setMultipleDrivers(prev => prev.map((x,idx) =>
                          idx===i ? {...x, license: e.target.value.toUpperCase()} : x
                        ))}/>
                      <input
                        type="number"
                        placeholder="₹ Security Deposit"
                        className="border rounded-lg p-2 text-sm bg-white"
                        value={d.deposit || ''}
                        onChange={e => setMultipleDrivers(prev => prev.map((x,idx) =>
                          idx===i ? {...x, deposit: e.target.value} : x
                        ))}/>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Row */}
            <button
              onClick={() => setMultipleDrivers(prev => [...prev, {name:'', phone:'', license:'', deposit:''}])}
              className="w-full py-2 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-xl text-sm font-black mb-4 hover:border-indigo-500 transition">
              + Add Another Driver
            </button>

            <div className="flex gap-3">
              <button onClick={() => {
                setShowAddDriver(false);
                setMultipleDrivers([{name:'', phone:''}]);
                setAddDriverMode('single');
              }} className="flex-1 py-3 bg-slate-100 rounded-xl text-sm font-black">
                Cancel
              </button>
              <button
                onClick={addMultipleDrivers}
                disabled={bulkLoading}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black disabled:opacity-50">
                {bulkLoading ? 'Adding...' : `Add ${multipleDrivers.filter(d=>d.name&&d.phone&&!d._saved).length} Drivers`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)}
{/* Overdue Drivers Bottom Sheet */}
{showOverdue && (
  <div className="fixed inset-0 z-[999] flex flex-col justify-end" onClick={() => setShowOverdue(false)}>
    <div className="bg-white rounded-t-3xl shadow-2xl max-h-[75vh] flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-slate-100">
        <div>
          <p className="font-black text-slate-800 text-sm">⏰ Overdue Today</p>
          <p className="text-[10px] text-slate-400">{overdueDrivers.length} drivers haven't paid yet</p>
        </div>
        <div className="flex items-center gap-2">
          {overdueDrivers.length > 0 && (
            <button disabled={remindingAll}
              onClick={async () => {
                setRemindingAll(true);
                await fetch(`${API}/api/payment/owner/remind-overdue?ownerId=${ownerId()}`, {
                  method: 'POST', headers: { Authorization: `Bearer ${token()}` }
                }).catch(() => {});
                setRemindingAll(false);
                alert(`✅ Reminder bhej diya ${overdueDrivers.length} drivers ko`);
              }}
              className="text-[10px] font-black bg-indigo-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">
              {remindingAll ? 'Sending…' : '🔔 Remind All'}
            </button>
          )}
          <button onClick={() => setShowOverdue(false)} className="text-slate-400"><X size={18}/></button>
        </div>
      </div>
      <div className="overflow-y-auto divide-y divide-slate-50">
        {overdueDrivers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-sm font-black text-slate-700">Sab ne pay kar diya!</p>
            <p className="text-[10px] text-slate-400 mt-1">No outstanding dues today</p>
          </div>
        ) : overdueDrivers.map((d, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-500 font-black text-sm border border-red-100">
                {(d.full_name||'D').charAt(0)}
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">{d.full_name}</p>
                <p className="text-[9px] text-slate-400">{d.vehicle_number || 'No vehicle'} · {d.mobile_number}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-red-600">₹{parseFloat(d.daily_rent||0).toLocaleString('en-IN')}</p>
              <p className="text-[9px] text-slate-400">due</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}

{showSOSAlert && activeSOS && (
  <div className="fixed inset-0 z-[9999] flex flex-col bg-red-600 text-white">
    {/* Flashing header */}
    <div className="bg-red-800 px-4 py-3 flex items-center justify-between animate-pulse">
      <span className="font-black text-lg tracking-widest">🚨 SOS ALERT</span>
      <span className="text-xs opacity-75">
        {new Date(activeSOS.created_at).toLocaleTimeString('en-IN')}
      </span>
    </div>

    {/* Driver info */}
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-5xl font-black animate-bounce">
        {activeSOS.full_name?.charAt(0)}
      </div>
      
      <div>
        <h2 className="text-3xl font-black">{activeSOS.full_name}</h2>
        <p className="text-red-200 font-mono text-sm mt-1">{activeSOS.mobile_number}</p>
      </div>

      <div className="bg-white/20 rounded-2xl p-4 w-full max-w-sm">
        <p className="text-[10px] font-black uppercase tracking-wider opacity-75 mb-2">
          Emergency Message
        </p>
        <p className="text-base font-medium">{activeSOS.message}</p>
      </div>

      {/* Location */}
      {activeSOS.message?.includes('maps.google') && (
        <a 
          href={activeSOS.message.match(/https:\/\/maps\.google[^\s]*/)?.[0]}
          target="_blank"
          rel="noreferrer"
          className="bg-white/20 rounded-xl px-4 py-2 text-sm font-black flex items-center gap-2"
        >
          📍 View Location on Maps
        </a>
      )}
    </div>

    {/* Action buttons */}
    <div className="p-6 space-y-3">
      <button
        onClick={async () => {
          // Dismiss SOS
          await fetch(`${API}/api/payment/owner/sos-dismiss/${activeSOS.id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token()}` }
          }).catch(() => {});
          
          setShowSOSAlert(false);
          
          // ✅ Chat open karo usi driver ke saath
          const driver = drivers.find(d => 
            d.mobile_number === activeSOS.mobile_number ||
            d.phone_number === activeSOS.mobile_number
          );
          if (driver) {
            openChatWithDriver(driver);
          }
          setActiveSOS(null);
        }}
        className="w-full bg-white text-red-600 font-black py-4 rounded-2xl text-base"
      >
        💬 Respond — Open Chat
      </button>
      
      <button
        onClick={async () => {
          await fetch(`${API}/api/payment/owner/sos-dismiss/${activeSOS.id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token()}` }
          }).catch(() => {});
          setShowSOSAlert(false);
          setActiveSOS(null);
        }}
        className="w-full bg-white/20 font-black py-3 rounded-2xl text-sm"
      >
        Dismiss Alert
      </button>
    </div>
  </div>
)}
        {showVehicleDetailModal && <VehicleDetailModal />}
{showDriverDetailsModal && <DriverDetailsModal />}
{showCashModal && cashDriver && (
  <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
    <div className="bg-white rounded-3xl w-full max-w-sm p-6">
      <h3 className="text-lg font-black mb-1">Record Cash Payment</h3>
      <p className="text-sm text-slate-500 mb-4">{cashDriver.full_name} — {cashDriver.phone_number}</p>
      <input
        type="number"
        placeholder="Enter amount (₹)"
        value={cashAmount}
        onChange={e => setCashAmount(e.target.value)}
        className="w-full border rounded-xl p-3 mb-4 text-sm font-mono"
      />
      <div className="flex gap-3">
        <button onClick={() => setShowCashModal(false)} className="flex-1 py-3 bg-slate-100 rounded-xl text-sm font-black">Cancel</button>
        <button
          onClick={async () => {
            if (!cashAmount || parseFloat(cashAmount) <= 0) return alert('Enter valid amount');
            try {
              const res = await fetch(`${API}/api/payment/owner/cash-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                body: JSON.stringify({
                  driverPhone: cashDriver.phone_number,
                  driverName: cashDriver.full_name,
                  amount: parseFloat(cashAmount),
                  ownerId: ownerId()
                })
              });
              const d = await res.json();
              if (d.success) {
                alert(`✅ ₹${cashAmount} cash payment recorded for ${cashDriver.full_name}`);
                setShowCashModal(false);
                setCashAmount('');
              } else alert(d.message || 'Failed');
            } catch { alert('Network error'); }
          }}
          className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-black"
        >
          💵 Record Cash
        </button>
      </div>
    </div>
  </div>
)}
{showBulkModal && (
  <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-2">
    <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[95vh] flex flex-col">
      
      {/* Header */}
      <div className="p-4 pb-3 flex justify-between items-center border-b shrink-0">
        <div>
          <h3 className="text-lg font-black">
  {bulkTab === 'drivers' ? '👤 Bulk Driver Import' : '🚛 Bulk Vehicle Import'}
</h3>
<p className="text-[10px] text-slate-400">CSV → verify → fix → import</p>
        </div>
        <button onClick={() => { setShowBulkModal(false); setBulkDrivers([]); setBulkVehicles([]); setBulkResult(null); setBulkFile(null); setBulkTab('drivers'); }}>
          <X size={20}/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!bulkResult ? (
          <>
            {/* Step row */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-indigo-50 rounded-xl p-3">
                <p className="text-xs font-black text-indigo-700 mb-2">① Download Template</p>
                <button onClick={bulkTab==='drivers' ? downloadTemplate : downloadVehicleTemplate}
                  className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-black">
                  📥 Download {bulkTab==='drivers'?'Driver':'Vehicle'} CSV
                </button>
              </div>
              <div className="flex-1 bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-black text-slate-600 mb-2">② Upload Filled CSV</p>
                <label className="w-full py-2 border-2 border-dashed border-slate-300 rounded-xl text-xs font-black text-slate-500 cursor-pointer hover:border-indigo-400 flex items-center justify-center gap-1 transition">
                  📂 {bulkFile || 'Choose File'}
                  <input type="file" accept=".csv" className="hidden"
                    onChange={bulkTab==='drivers' ? handleBulkFile : handleVehicleBulkFile}/>
                </label>
              </div>
            </div>

            {/* ── DRIVERS TABLE ── */}
            {bulkTab==='drivers' && bulkDrivers.length > 0 && (
              <>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-black">{bulkDrivers.length} rows</span>
                  <div className="flex gap-3">
                    <span className="text-xs text-emerald-600 font-black">✅ {bulkDrivers.filter(d=>d._errors.length===0).length} valid</span>
                    {bulkDrivers.filter(d=>d._errors.length>0).length > 0 &&
                      <span className="text-xs text-red-600 font-black">❌ {bulkDrivers.filter(d=>d._errors.length>0).length} errors</span>}
                  </div>
                </div>
                <div className="border rounded-xl overflow-hidden mb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[750px]">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          {['#','Name *','Phone *','DOB','Emergency Name','Emergency Phone','License No.','License Expiry','Deposit','Status'].map(h=>(
                            <th key={h} className="text-left px-2 py-2 font-black text-slate-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {bulkDrivers.map((d, i) => (
                          <tr key={i} className={d._errors.length>0?'bg-red-50':'bg-white'}>
                            <td className="px-2 py-1.5 text-slate-400">{i+1}</td>
                            <td className="px-1 py-1">
                              <input value={d.full_name||''} onChange={e=>updateBulkRow(i,'full_name',e.target.value)}
                                className={`w-24 border rounded px-1.5 py-1 text-xs focus:outline-none ${d._errors.some(e=>e.includes('Name'))?'border-red-400':'border-slate-200'}`}/>
                            </td>
                            <td className="px-1 py-1">
                              <input value={d.mobile_number||''} onChange={e=>updateBulkRow(i,'mobile_number',e.target.value.replace(/\D/g,'').slice(0,10))}
                                className={`w-24 border rounded px-1.5 py-1 text-xs font-mono focus:outline-none ${d._errors.some(e=>e.includes('Phone'))?'border-red-400':'border-slate-200'}`} maxLength={10}/>
                            </td>
                            <td className="px-1 py-1">
                              <input type="date" value={d.date_of_birth||''} onChange={e=>updateBulkRow(i,'date_of_birth',e.target.value)}
                                className="w-28 border border-slate-200 rounded px-1.5 py-1 text-xs focus:outline-none"/>
                            </td>
                            <td className="px-1 py-1">
                              <input value={d.emergency_contact_name||''} onChange={e=>updateBulkRow(i,'emergency_contact_name',e.target.value)}
                                className="w-24 border border-slate-200 rounded px-1.5 py-1 text-xs focus:outline-none"/>
                            </td>
                            <td className="px-1 py-1">
                              <input value={d.emergency_contact_number||''} onChange={e=>updateBulkRow(i,'emergency_contact_number',e.target.value.replace(/\D/g,'').slice(0,10))}
                                className="w-24 border border-slate-200 rounded px-1.5 py-1 text-xs font-mono focus:outline-none" maxLength={10}/>
                            </td>
                            <td className="px-1 py-1">
                              <input value={d.driving_license_number||''} onChange={e=>updateBulkRow(i,'driving_license_number',e.target.value.toUpperCase())}
                                className="w-28 border border-slate-200 rounded px-1.5 py-1 text-xs uppercase focus:outline-none"/>
                            </td>
                            <td className="px-1 py-1">
                              <input type="date" value={d.driving_license_expiry||''} onChange={e=>updateBulkRow(i,'driving_license_expiry',e.target.value)}
                                className="w-28 border border-slate-200 rounded px-1.5 py-1 text-xs focus:outline-none"/>
                            </td>
                            <td className="px-1 py-1">
                              <input type="number" value={d.security_deposit||''} onChange={e=>updateBulkRow(i,'security_deposit',e.target.value)}
                                className="w-16 border border-slate-200 rounded px-1.5 py-1 text-xs focus:outline-none" placeholder="0"/>
                            </td>
                            <td className="px-2 py-1.5">
                              {d._errors.length===0
                                ? <span className="text-emerald-600 font-black text-[10px]">✅</span>
                                : <span className="text-red-600 font-black text-[9px]">{d._errors[0]}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setBulkDrivers(prev => prev.map(row=>({...row,_errors:validateBulkRow(row)})))}
                    className="px-4 py-2.5 bg-slate-100 rounded-xl text-xs font-black">🔄 Re-verify</button>
                  <button onClick={() => setBulkDrivers(prev=>prev.filter(d=>d._errors.length===0))}
                    className="px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-xs font-black border border-amber-200">🗑 Remove Errors</button>
                  <button onClick={importBulkDrivers}
                    disabled={bulkLoading || bulkDrivers.filter(d=>d._errors.length===0).length===0}
                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black disabled:opacity-50">
                    {bulkLoading ? '⏳ Importing...' : `Import ${bulkDrivers.filter(d=>d._errors.length===0).length} Drivers →`}
                  </button>
                </div>
              </>
            )}

            {/* ── VEHICLES TABLE ── */}
            {bulkTab==='vehicles' && bulkVehicles.length > 0 && (
              <>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-black">{bulkVehicles.length} rows</span>
                  <div className="flex gap-3">
                    <span className="text-xs text-emerald-600 font-black">✅ {bulkVehicles.filter(v=>v._errors.length===0).length} valid</span>
                    {bulkVehicles.filter(v=>v._errors.length>0).length > 0 &&
                      <span className="text-xs text-red-600 font-black">❌ {bulkVehicles.filter(v=>v._errors.length>0).length} errors</span>}
                  </div>
                </div>
                <div className="border rounded-xl overflow-hidden mb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[650px]">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          {['#','Vehicle No. *','Model *','Type','Daily Rent','Insurance Expiry','Fitness Expiry','Chassis No.','Status'].map(h=>(
                            <th key={h} className="text-left px-2 py-2 font-black text-slate-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {bulkVehicles.map((v, i) => (
                          <tr key={i} className={v._errors.length>0?'bg-red-50':'bg-white'}>
                            <td className="px-2 py-1.5 text-slate-400">{i+1}</td>
                            <td className="px-1 py-1">
                              <input value={v.vehicle_number||''} onChange={e=>{
                                setBulkVehicles(prev=>{const u=[...prev];u[i]={...u[i],vehicle_number:e.target.value.toUpperCase()};const errs=[];if(!u[i].vehicle_number)errs.push('Number missing');if(!u[i].vehicle_model)errs.push('Model missing');u[i]._errors=errs;return u;});
                              }} className={`w-24 border rounded px-1.5 py-1 text-xs uppercase font-mono focus:outline-none ${v._errors.some(e=>e.includes('Number'))?'border-red-400':'border-slate-200'}`}/>
                            </td>
                            <td className="px-1 py-1">
                              <input value={v.vehicle_model||''} onChange={e=>{
                                setBulkVehicles(prev=>{const u=[...prev];u[i]={...u[i],vehicle_model:e.target.value};const errs=[];if(!u[i].vehicle_number)errs.push('Number missing');if(!u[i].vehicle_model)errs.push('Model missing');u[i]._errors=errs;return u;});
                              }} className={`w-28 border rounded px-1.5 py-1 text-xs focus:outline-none ${v._errors.some(e=>e.includes('Model'))?'border-red-400':'border-slate-200'}`}/>
                            </td>
                            <td className="px-1 py-1">
                              <select value={v.vehicle_type||'EV'} onChange={e=>{setBulkVehicles(prev=>{const u=[...prev];u[i]={...u[i],vehicle_type:e.target.value};return u;})}}
                                className="border border-slate-200 rounded px-1.5 py-1 text-xs bg-white focus:outline-none">
                                <option>EV</option><option>TRUCK</option><option>AUTO</option><option>CAR</option><option>BUS</option>
                              </select>
                            </td>
                            <td className="px-1 py-1">
                              <input type="number" value={v.daily_rent||''} onChange={e=>{setBulkVehicles(prev=>{const u=[...prev];u[i]={...u[i],daily_rent:e.target.value};return u;})}}
                                className="w-16 border border-slate-200 rounded px-1.5 py-1 text-xs focus:outline-none" placeholder="850"/>
                            </td>
                            <td className="px-1 py-1">
                              <input type="date" value={v.insurance_expiry||''} onChange={e=>{setBulkVehicles(prev=>{const u=[...prev];u[i]={...u[i],insurance_expiry:e.target.value};return u;})}}
                                className="w-28 border border-slate-200 rounded px-1.5 py-1 text-xs focus:outline-none"/>
                            </td>
                            <td className="px-1 py-1">
                              <input type="date" value={v.fitness_expiry||''} onChange={e=>{setBulkVehicles(prev=>{const u=[...prev];u[i]={...u[i],fitness_expiry:e.target.value};return u;})}}
                                className="w-28 border border-slate-200 rounded px-1.5 py-1 text-xs focus:outline-none"/>
                            </td>
                            <td className="px-1 py-1">
                              <input value={v.chassis_number||''} onChange={e=>{setBulkVehicles(prev=>{const u=[...prev];u[i]={...u[i],chassis_number:e.target.value.toUpperCase()};return u;})}}
                                className="w-28 border border-slate-200 rounded px-1.5 py-1 text-xs uppercase font-mono focus:outline-none"/>
                            </td>
                            <td className="px-2 py-1.5">
                              {v._errors.length===0
                                ? <span className="text-emerald-600 font-black text-[10px]">✅</span>
                                : <span className="text-red-600 font-black text-[9px]">{v._errors[0]}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setBulkVehicles(prev=>prev.filter(v=>v._errors.length===0))}
                    className="px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-xs font-black border border-amber-200">🗑 Remove Errors</button>
                  <button onClick={importBulkVehicles}
                    disabled={bulkLoading || bulkVehicles.filter(v=>v._errors.length===0).length===0}
                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black disabled:opacity-50">
                    {bulkLoading ? '⏳ Importing...' : `Import ${bulkVehicles.filter(v=>v._errors.length===0).length} Vehicles →`}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
              <p className="text-5xl font-black text-emerald-600">{bulkResult.imported}</p>
              <p className="text-base font-black text-emerald-600 mt-2">
                {bulkTab==='drivers'?'Drivers':'Vehicles'} Imported! ✅
              </p>
            </div>
            {bulkResult.failed > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs font-black text-red-700 mb-2">❌ {bulkResult.failed} Failed:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {bulkResult.failures?.map((f, i) => (
                    <p key={i} className="text-[10px] text-red-500">{f.name||f.num} — {f.reason}</p>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => { setShowBulkModal(false); setBulkDrivers([]); setBulkVehicles([]); setBulkResult(null); setBulkFile(null); setBulkTab('drivers'); }}
              className="w-full py-3 bg-slate-800 text-white rounded-xl text-sm font-black">✓ Done</button>
          </div>
        )}
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  );
}