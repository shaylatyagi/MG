import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import Chart from '../components/Chart';

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

const initialVehicles = [
  { id: 'UP-14-EA-2201', driver: 'Amit Sharma', driverPhone: '9999999999', status: 'On Route', rent: '₹450', payout: 'Paid', area: 'Dwarka', condition: 'Good' },
  { id: 'UP-14-EA-2005', driver: 'Suresh Yadav', driverPhone: '8888888888', status: 'Idle', rent: '₹450', payout: 'Pending', area: 'Dwarka', condition: 'Fair' },
];

export default function OwnerDashboard() {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [vehicles, setVehicles] = useState(() => {
    const saved = localStorage.getItem('vehicles');
    return saved ? JSON.parse(saved) : initialVehicles;
  });
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [search, setSearch] = useState('');
  const [newVehicle, setNewVehicle] = useState({
    id: '', age: '', condition: 'Good', area: '', rent: '', fine: '',
    from: '', to: '', deadline: '', charging: '', driverPhone: '', driverName: ''
  });

  const saveVehicles = (updated) => {
    setVehicles(updated);
    localStorage.setItem('vehicles', JSON.stringify(updated));
  };

  const handleEdit = (vehicle) => {
    setSelectedVehicle(vehicle);
    setEditDriverName(vehicle.driver);
    setEditDriverPhone(vehicle.driverPhone || '');
    setShowEditModal(true);
  };

  const handleUpdateDriver = () => {
    const updated = vehicles.map(v =>
      v.id === selectedVehicle.id ? { ...v, driver: editDriverName, driverPhone: editDriverPhone } : v
    );
    saveVehicles(updated);
    setShowEditModal(false);
  };

  const handleFileUpload = (docName, file) => {
    if (file) {
      setUploadedDocs(prev => ({ ...prev, [docName]: file.name }));
    }
  };

  const handleAddVehicle = () => {
    if (!newVehicle.id) { alert('Please enter a vehicle number'); return; }
    const vehicle = {
      id: newVehicle.id,
      driver: newVehicle.driverName || 'Unassigned',
      driverPhone: newVehicle.driverPhone || '',
      status: 'Idle',
      rent: newVehicle.rent ? `₹${newVehicle.rent}` : '₹0',
      payout: 'Pending',
      area: newVehicle.area || '',
      condition: newVehicle.condition || 'Good',
    };
    saveVehicles([...vehicles, vehicle]);
    setShowModal(false);
    setUploadedDocs({});
    setNewVehicle({ id: '', age: '', condition: 'Good', area: '', rent: '', fine: '', from: '', to: '', deadline: '', charging: '', driverPhone: '', driverName: '' });
  };

  const filteredVehicles = vehicles.filter(v =>
    v.id.toLowerCase().includes(search.toLowerCase()) ||
    v.driver.toLowerCase().includes(search.toLowerCase()) ||
    v.area?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '32px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A' }}>Fleet Overview</h1>
            <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>Real time status of your EV assets.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', backgroundColor: 'white', color: '#1A1A1A', border: '1px solid #E8E0D5' }}>Download Report</button>
            <button onClick={() => setShowModal(true)} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', backgroundColor: '#8B5E3C', color: 'white' }}>+ Add Vehicle</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <StatCard label="Total Earnings" value="₹42,500" sub="▲ 12% vs last month" subColor="#16A34A" />
          <StatCard label="Collection Efficiency" value="94.2%" sub="Target: 98%" />
          <StatCard label="Active Fleet" value={`${vehicles.length} / ${vehicles.length}`} sub="All vehicles active" subColor="#16A34A" />
          <StatCard label="Compliance Score" value="Healthy" sub="All RCs/Insurance valid" subColor="#16A34A" />
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 2 }}>
            <Chart data={revenueData} title="Collection Revenue Trend" />
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
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1A1A1A' }}>{v.id}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1A1A1A' }}>{v.driver}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: v.status === 'On Route' ? '#DCFCE7' : '#F3F4F6', color: v.status === 'On Route' ? '#16A34A' : '#6B7280' }}>{v.status}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1A1A1A' }}>{v.rent}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: v.payout === 'Paid' ? '#16A34A' : '#D97706' }}>{v.payout}</td>
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

      {/* Add Vehicle Modal */}
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
                <input style={inputStyle} placeholder="UP-14-EA-2201" value={newVehicle.id} onChange={(e) => setNewVehicle({ ...newVehicle, id: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Vehicle Age (years)</p>
                <input style={inputStyle} type="number" placeholder="2" value={newVehicle.age} onChange={(e) => setNewVehicle({ ...newVehicle, age: e.target.value })} />
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
                <input style={inputStyle} type="number" placeholder="450" value={newVehicle.rent} onChange={(e) => setNewVehicle({ ...newVehicle, rent: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Fine Per Day After Deadline (₹)</p>
                <input style={inputStyle} type="number" placeholder="50" value={newVehicle.fine} onChange={(e) => setNewVehicle({ ...newVehicle, fine: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Rental From</p>
                <input style={inputStyle} type="date" value={newVehicle.from} onChange={(e) => setNewVehicle({ ...newVehicle, from: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Rental To</p>
                <input style={inputStyle} type="date" value={newVehicle.to} onChange={(e) => setNewVehicle({ ...newVehicle, to: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Payment Deadline (days)</p>
                <input style={inputStyle} type="number" placeholder="3" value={newVehicle.deadline} onChange={(e) => setNewVehicle({ ...newVehicle, deadline: e.target.value })} />
              </div>
              <div>
                <p style={labelStyle}>Charging Station Location</p>
                <input style={inputStyle} placeholder="Sector 10, Dwarka" value={newVehicle.charging} onChange={(e) => setNewVehicle({ ...newVehicle, charging: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={labelStyle}>Assign Driver Phone Number</p>
                <input style={inputStyle} placeholder="9999999999" type="number" value={newVehicle.driverPhone} onChange={(e) => setNewVehicle({ ...newVehicle, driverPhone: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={labelStyle}>Driver Name</p>
                <input style={inputStyle} placeholder="Amit Sharma" value={newVehicle.driverName} onChange={(e) => setNewVehicle({ ...newVehicle, driverName: e.target.value })} />
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <p style={labelStyle}>Upload Vehicle Documents</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
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

      {/* Edit Driver Modal */}
      {showEditModal && selectedVehicle && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>Edit Driver</h2>
              <button onClick={() => setShowEditModal(false)} style={{ fontSize: '20px', color: '#6B6B6B', backgroundColor: 'transparent' }}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: '#6B6B6B', marginBottom: '16px' }}>Vehicle: {selectedVehicle.id}</p>
            <div style={{ marginBottom: '16px' }}>
              <p style={labelStyle}>Driver Name</p>
              <input style={inputStyle} value={editDriverName} onChange={(e) => setEditDriverName(e.target.value)} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <p style={labelStyle}>Driver Phone Number</p>
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