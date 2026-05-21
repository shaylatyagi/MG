import { useState, useEffect, createElement } from 'react';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import Chart from '../components/Chart';
import api from '../api';

const thStyle = { textAlign: 'left', padding: '12px 16px', fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' };
const tdStyle = { padding: '14px 16px', fontSize: '14px', color: '#1A1A1A' };

export default function OwnerDashboard() {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [stats, setStats] = useState({ total_vehicles: 0, total_earnings: 0, collection_efficiency: 0, revenue_chart: [] });
  const [vehicles, setVehicles] = useState([]);
  const [driverPayouts, setDriverPayouts] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [search, setSearch] = useState('');
  const [newVehicle, setNewVehicle] = useState({
    vehicle_number: '', vehicle_age: '', condition: 'Good', area: '', daily_rent: '', fine_per_day: '',
    rental_from: '', rental_to: '', payment_deadline: '', charging_station: '', driver_phone: '', driver_name: ''
  });
  const [uploadedDocs, setUploadedDocs] = useState({});
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchStats();
    fetchVehicles();
    fetchDriverPayouts();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/owner/stats');
      setStats(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/api/owner/vehicles');
      setVehicles(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchDriverPayouts = async () => {
    try {
      const res = await api.get('/api/owner/driver-payouts');
      setDriverPayouts(res.data);
    } catch (err) { console.error(err); }
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
      fetchDriverPayouts();
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update driver');
    }
  };

  const handleFileUpload = (docName, file) => {
    if (file) setUploadedDocs(prev => ({ ...prev, [docName]: file.name }));
  };

  const handleAddVehicle = async () => {
    if (!newVehicle.vehicle_number) { alert('Please enter a vehicle number'); return; }
    try {
      await api.post('/api/owner/vehicles', newVehicle);
      fetchVehicles();
      fetchStats();
      setShowModal(false);
      setUploadedDocs({});
      setNewVehicle({ vehicle_number: '', vehicle_age: '', condition: 'Good', area: '', daily_rent: '', fine_per_day: '', rental_from: '', rental_to: '', payment_deadline: '', charging_station: '', driver_phone: '', driver_name: '' });
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

  const labelStyle = { fontSize: '12px', color: '#6B6B6B', marginBottom: '6px', fontWeight: '500' };
  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '14px', backgroundColor: '#FAF7F2', color: '#1A1A1A' };

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
            <button onClick={() => setShowModal(true)} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', backgroundColor: '#8B5E3C', color: 'white', border: 'none', cursor: 'pointer' }}>+ Add Vehicle</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <StatCard label="Total Earnings" value={`₹${stats.total_earnings}`} sub="From successful payments" subColor="#16A34A" />
          <StatCard label="Collection Efficiency" value={`${stats.collection_efficiency}%`} sub="Target: 98%" />
          <StatCard label="Active Fleet" value={`${stats.total_vehicles} vehicles`} sub="All vehicles active" subColor="#16A34A" />
          <StatCard label="Compliance Score" value="Healthy" sub="All RCs/Insurance valid" subColor="#16A34A" />
        </div>

        {/* Fleet Management Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5', marginBottom: '24px' }}>
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
                {['Vehicle ID', 'Driver', 'Area', 'Daily Rent', "Today's Payout", 'Status', 'Action'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', fontSize: '14px', color: '#9CA3AF' }}>No vehicles found</td>
                </tr>
              ) : filteredVehicles.map((v, i) => {
                const payout = driverPayouts.find(p => p.vehicle_number === v.vehicle_number);
                const payoutStatus = payout ? payout.payout_status : 'Pending';
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #E8E0D5' }}>
                    <td style={tdStyle}>{v.vehicle_number}</td>
                    <td style={tdStyle}>{v.driver_name}</td>
                    <td style={tdStyle}>{v.area || 'N/A'}</td>
                    <td style={tdStyle}>₹{v.daily_rent}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', backgroundColor: payoutStatus === 'Paid' ? '#DCFCE7' : '#FEF3C7', color: payoutStatus === 'Paid' ? '#16A34A' : '#D97706' }}>
                        {payoutStatus}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: v.status === 'On Route' ? '#DCFCE7' : '#F3F4F6', color: v.status === 'On Route' ? '#16A34A' : '#6B7280' }}>
                        {v.status || 'Idle'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button onClick={() => handleEdit(v)} style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', backgroundColor: '#F3EDE5', color: '#8B5E3C', border: 'none', cursor: 'pointer' }}>
                        Edit Driver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Chart */}
        <Chart
          data={stats.revenue_chart.length > 0 ? stats.revenue_chart.map(r => ({
            name: new Date(r.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
            value: parseFloat(r.value)
          })) : [{ name: 'No data', value: 0 }]}
          title="Collection Revenue Trend"
        />

      </div>

      {/* Add Vehicle Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '560px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>Add New Vehicle</h2>
              <button onClick={() => setShowModal(false)} style={{ fontSize: '20px', color: '#6B6B6B', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { label: 'Vehicle Number', key: 'vehicle_number', placeholder: 'UP-14-EA-2201' },
                { label: 'Vehicle Age (years)', key: 'vehicle_age', placeholder: '2', type: 'number' },
                { label: 'Operating Area', key: 'area', placeholder: 'Dwarka, Delhi' },
                { label: 'Daily Rent (₹)', key: 'daily_rent', placeholder: '450', type: 'number' },
                { label: 'Fine Per Day (₹)', key: 'fine_per_day', placeholder: '50', type: 'number' },
                { label: 'Payment Deadline (days)', key: 'payment_deadline', placeholder: '3', type: 'number' },
                { label: 'Charging Station', key: 'charging_station', placeholder: 'Sector 10, Dwarka' },
                { label: 'Driver Phone', key: 'driver_phone', placeholder: '9999999999' },
                { label: 'Driver Name', key: 'driver_name', placeholder: 'Amit Sharma' },
              ].map(field => (
                <div key={field.key}>
                  <p style={labelStyle}>{field.label}</p>
                  <input style={inputStyle} type={field.type || 'text'} placeholder={field.placeholder} value={newVehicle[field.key]} onChange={(e) => setNewVehicle({ ...newVehicle, [field.key]: e.target.value })} />
                </div>
              ))}
              <div>
                <p style={labelStyle}>Condition</p>
                <select style={inputStyle} value={newVehicle.condition} onChange={(e) => setNewVehicle({ ...newVehicle, condition: e.target.value })}>
                  <option>Good</option><option>Fair</option><option>Needs Repair</option>
                </select>
              </div>
              <div>
                <p style={labelStyle}>Rental From</p>
                <input style={inputStyle} type="date" value={newVehicle.rental_from} onChange={(e) => setNewVehicle({ ...newVehicle, rental_from: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Rental To</p>
                <input style={inputStyle} type="date" value={newVehicle.rental_to} onChange={(e) => setNewVehicle({ ...newVehicle, rental_to: e.target.value })} />
              </div>
            </div>
            <div style={{ marginTop: '20px' }}>
              <p style={labelStyle}>Upload Vehicle Documents</p>
              {['Vehicle RC', 'Insurance Certificate', 'Pollution Certificate'].map((doc) => (
                <div key={doc} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E8E0D5', backgroundColor: '#FAF7F2', marginBottom: '8px' }}>
                  <div>
                    <p style={{ fontSize: '13px', color: '#1A1A1A', fontWeight: '500' }}>{doc}</p>
                    {uploadedDocs[doc] && <p style={{ fontSize: '11px', color: '#16A34A' }}>✓ {uploadedDocs[doc]}</p>}
                  </div>
                  <label style={{ backgroundColor: uploadedDocs[doc] ? '#DCFCE7' : '#8B5E3C', color: uploadedDocs[doc] ? '#16A34A' : 'white', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                    {uploadedDocs[doc] ? 'Uploaded ✓' : 'Upload'}
                    <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(doc, e.target.files[0])} />
                  </label>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#F3EDE5', color: '#8B5E3C', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddVehicle} style={{ flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#8B5E3C', color: 'white', border: 'none', cursor: 'pointer' }}>Add Vehicle</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Driver Modal */}
      {showEditModal && selectedVehicle && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>Edit Driver</h2>
              <button onClick={() => setShowEditModal(false)} style={{ fontSize: '20px', color: '#6B6B6B', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: '#6B6B6B', marginBottom: '16px' }}>Vehicle: {selectedVehicle.vehicle_number}</p>
            <div style={{ marginBottom: '16px' }}>
              <p style={labelStyle}>Driver Name</p>
              <input style={inputStyle} value={editDriverName} onChange={(e) => setEditDriverName(e.target.value)} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <p style={labelStyle}>Driver Phone Number</p>
              <input style={inputStyle} type="number" value={editDriverPhone} onChange={(e) => setEditDriverPhone(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#F3EDE5', color: '#8B5E3C', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleUpdateDriver} style={{ flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#8B5E3C', color: 'white', border: 'none', cursor: 'pointer' }}>Update Driver</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}