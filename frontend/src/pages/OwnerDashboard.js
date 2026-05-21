import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import Chart from '../components/Chart';
import api from '../api';

const labelStyle = { fontSize: '12px', color: '#6B6B6B', marginBottom: '6px', fontWeight: '500' };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '14px', backgroundColor: '#FAF7F2', color: '#1A1A1A' };

const revenueData = [
  { name: 'Aug 17', value: 1200 },
  { name: 'Aug 18', value: 1450 },
  { name: 'Aug 19', value: 1380 },
  { name: 'Aug 20', value: 1600 },
  { name: 'Aug 21', value: 2050 },
  { name: 'Aug 22', value: 1900 },
  { name: 'Aug 23', value: 2400 },
];

const alerts = [
  { icon: '⚠️', title: 'Geofence Breach', sub: 'Vehicle UP-14-EA-2201', color: '#FEF3C7', border: '#D97706' },
  { icon: '🔋', title: 'Low Battery Alert', sub: 'Driver: Rajesh K. (12% left)', color: '#ECFDF5', border: '#16A34A' },
  { icon: '📋', title: 'Renewal Due', sub: 'Insurance for UP-14-EA-1905', color: '#EFF6FF', border: '#3B82F6' },
];

export default function OwnerDashboard() {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState({ total_vehicles: 0, total_earnings: 0, collection_efficiency: 0, revenue_chart: [] });
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [search, setSearch] = useState('');
  const [driverPayouts, setDriverPayouts] = useState([]);
  const [newVehicle, setNewVehicle] = useState({
    vehicle_number: '', vehicle_age: '', condition: 'Good', area: '', daily_rent: '', fine_per_day: '',
    rental_from: '', rental_to: '', payment_deadline: '', charging_station: ''
  });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchVehicles();
    fetchStats();
    fetchDriverPayouts();
  }, []);

  const fetchDriverPayouts = async () => {
    try {
      const res = await api.get('/api/owner/driver-payouts');
      setDriverPayouts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/api/owner/vehicles');
      setVehicles(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/owner/stats');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (vehicle) => {
    setSelectedVehicle(vehicle);
    setEditDriverName(vehicle.driver_name);
    setEditDriverPhone(vehicle.driver_phone || '');
    setShowEditModal(true);
  };

  const handleUpdateDriver = async () => {
    try {
      await api.put(`/api/owner/vehicles/${selectedVehicle.vehicle_number}`, {
        driver_name: editDriverName,
        driver_phone: editDriverPhone,
      });
      fetchVehicles();
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update driver');
    }
  };

  const handleFileUpload = (docName, file) => {
    if (file) {
      setUploadedDocs(prev => ({ ...prev, [docName]: file.name }));
    }
  };

  const handleAddVehicle = async () => {
    if (!newVehicle.vehicle_number) { alert('Please enter a vehicle number'); return; }
    try {
      await api.post('/api/owner/vehicles', newVehicle);
      fetchVehicles();
      fetchStats();
      setShowModal(false);
      setUploadedDocs({});
      setNewVehicle({ vehicle_number: '', vehicle_age: '', condition: 'Good', area: '', daily_rent: '', fine_per_day: '', rental_from: '', rental_to: '', payment_deadline: '', charging_station: '' });
    } catch (err) {
      console.error(err);
      alert('Failed to add vehicle');
    }
  };

  const filteredVehicles = vehicles.filter(v =>
    v.vehicle_number.toLowerCase().includes(search.toLowerCase()) ||
    v.driver_name.toLowerCase().includes(search.toLowerCase()) ||
    (v.area || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '32px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A' }}>Hello, {user.name || 'Owner'} 👋</h1>
            <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>Real time status of your EV assets.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', backgroundColor: 'white', color: '#1A1A1A', border: '1px solid #E8E0D5' }}>Download Report</button>
            <button onClick={() => setShowModal(true)} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', backgroundColor: '#8B5E3C', color: 'white' }}>+ Add Vehicle</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <StatCard label="Total Earnings" value={`₹${stats.total_earnings}`} sub="From successful payments" subColor="#16A34A" />
          <StatCard label="Collection Efficiency" value={`${stats.collection_efficiency}%`} sub="Target: 98%" />
          <StatCard label="Active Fleet" value={`${stats.total_vehicles} vehicles`} sub="All vehicles active" subColor="#16A34A" />
          <StatCard label="Compliance Score" value="Healthy" sub="All RCs/Insurance valid" subColor="#16A34A" />
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 2 }}>
            <Chart data={stats.revenue_chart.length > 0 ? stats.revenue_chart.map(r => ({ name: new Date(r.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), value: parseFloat(r.value) })) : [{ name: 'No data', value: 0 }]} title="Collection Revenue Trend" />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A' }}>Operational Alerts</p>
            {alerts.map((alert, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', borderRadius: '8px', backgroundColor: alert.color, borderLeft: `3px solid ${alert.border}` }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{alert.icon}</span>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>{alert.title}</p>
                  <p style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '2px' }}>{alert.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A' }}>Fleet Management</p>
            <input
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', backgroundColor: '#FAF7F2', color: '#1A1A1A' }}
              placeholder="Search by vehicle ID, driver, area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E8E0D5' }}>
                {['Vehicle ID', 'Current Driver', 'Status', 'Daily Rent', "Today's Payout", 'Action'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', fontSize: '14px', color: '#9CA3AF' }}>No vehicles found</td>
                </tr>
              ) : filteredVehicles.map((v, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #E8E0D5' }}>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1A1A1A' }}>{v.vehicle_number}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1A1A1A' }}>{v.driver_name}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: v.status === 'On Route' ? '#DCFCE7' : '#F3F4F6', color: v.status === 'On Route' ? '#16A34A' : '#6B7280' }}>{v.status}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1A1A1A' }}>₹{v.daily_rent}</td>
                  <td style={{ padding: '14px 16px' }}>
                    {(() => {
                      var payout = driverPayouts.find(p => p.vehicle_number === v.vehicle_number);
                      var status = payout ? payout.payout_status : 'Pending';
                      return (
                        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', backgroundColor: status === 'Paid' ? '#DCFCE7' : '#FEF3C7', color: status === 'Paid' ? '#16A34A' : '#D97706' }}>
                          {status}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={() => handleEdit(v)} style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', backgroundColor: '#F3EDE5', color: '#8B5E3C', border: 'none', cursor: 'pointer' }}>
                      Edit Driver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '560px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>Add New Vehicle</h2>
              <button onClick={() => setShowModal(false)} style={{ fontSize: '20px', color: '#6B6B6B', backgroundColor: 'transparent' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={labelStyle}>Vehicle Number</p>
                <input style={inputStyle} placeholder="UP-14-EA-2201" value={newVehicle.vehicle_number} onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_number: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Vehicle Age (years)</p>
                <input style={inputStyle} type="number" placeholder="2" value={newVehicle.vehicle_age} onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_age: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Condition</p>
                <select style={inputStyle} value={newVehicle.condition} onChange={(e) => setNewVehicle({ ...newVehicle, condition: e.target.value })}>
                  <option>Good</option>
                  <option>Fair</option>
                  <option>Needs Repair</option>
                </select>
              </div>
              <div>
                <p style={labelStyle}>Operating Area</p>
                <input style={inputStyle} placeholder="Dwarka, Delhi" value={newVehicle.area} onChange={(e) => setNewVehicle({ ...newVehicle, area: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Daily Rent (₹)</p>
                <input style={inputStyle} type="number" placeholder="450" value={newVehicle.daily_rent} onChange={(e) => setNewVehicle({ ...newVehicle, daily_rent: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Fine Per Day After Deadline (₹)</p>
                <input style={inputStyle} type="number" placeholder="50" value={newVehicle.fine_per_day} onChange={(e) => setNewVehicle({ ...newVehicle, fine_per_day: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Rental From</p>
                <input style={inputStyle} type="date" value={newVehicle.rental_from} onChange={(e) => setNewVehicle({ ...newVehicle, rental_from: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Rental To</p>
                <input style={inputStyle} type="date" value={newVehicle.rental_to} onChange={(e) => setNewVehicle({ ...newVehicle, rental_to: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Payment Deadline (days)</p>
                <input style={inputStyle} type="number" placeholder="3" value={newVehicle.payment_deadline} onChange={(e) => setNewVehicle({ ...newVehicle, payment_deadline: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Charging Station Location</p>
                <input style={inputStyle} placeholder="Sector 10, Dwarka" value={newVehicle.charging_station} onChange={(e) => setNewVehicle({ ...newVehicle, charging_station: e.target.value })} />
              </div>
            </div>
            <div style={{ marginTop: '20px' }}>
              <p style={labelStyle}>Upload Vehicle Documents</p>
              <div style={{ display: 'flex', flexType: 'column', gap: '10px', marginTop: '8px' }}>
                {['Vehicle RC', 'Insurance Certificate', 'Pollution Certificate'].map((doc) => (
                  <div key={doc} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E8E0D5', backgroundColor: '#FAF7F2' }}>
                    <div>
                      <p style={{ fontSize: '13px', color: '#1A1A1A', fontWeight: '500' }}>{doc}</p>
                      {uploadedDocs[doc] && <p style={{ fontSize: '11px', color: '#16A34A', marginTop: '2px' }}>✓ {uploadedDocs[doc]}</p>}
                    </div>
                    <label style={{ backgroundColor: uploadedDocs[doc] ? '#DCFCE7' : '#8B5E3C', color: uploadedDocs[doc] ? '#16A34A' : 'white', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      {uploadedDocs[doc] ? 'Uploaded ✓' : 'Upload'}
                      <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(doc, e.target.files[0])} />
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <p style={labelStyle}>Documents Required from Driver</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px' }}>
                {['Aadhaar', 'Driving License', 'RC', 'Photo'].map((doc) => (
                  <label key={doc} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#1A1A1A', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked />
                    {doc}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#F3EDE5', color: '#8B5E3C' }}>Cancel</button>
              <button onClick={handleAddVehicle} style={{ flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#8B5E3C', color: 'white' }}>Add Vehicle</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedVehicle && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>Edit Driver</h2>
              <button onClick={() => setShowEditModal(false)} style={{ fontSize: '20px', color: '#6B6B6B', backgroundColor: 'transparent' }}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: '#6B6B6B', marginBottom: '16px' }}>Vehicle: {selectedVehicle.vehicle_number}</p>
            <div style={{ marginBottom: '16px' }}>
              <p style={labelStyle}>Driver Name</p>
              <input style={inputStyle} value={editDriverName} onChange={(e) => setEditDriverName(e.target.value)} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              {/* CHANGED LABEL FROM "Driver Phone Number" to "Driver" to avoid word clutter and perfectly balance structural layout */}
              <p style={labelStyle}>Driver</p>
              <input style={inputStyle} placeholder="9999999999" type="number" value={editDriverPhone} onChange={(e) => setEditDriverPhone(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#F3EDE5', color: '#8B5E3C' }}>Cancel</button>
              <button onClick={handleUpdateDriver} style={{ flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#8B5E3C', color: 'white' }}>Update Driver</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}