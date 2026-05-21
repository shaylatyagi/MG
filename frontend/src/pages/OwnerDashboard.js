import { useState, useEffect, createElement } from 'react';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import Chart from '../components/Chart';
import api from '../api';

const thStyle = { textAlign: 'left', padding: '12px 16px', fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' };
const tdStyle = { padding: '14px 16px', fontSize: '14px', color: '#1A1A1A' };
const labelStyle = { fontSize: '12px', color: '#6B6B6B', marginBottom: '6px', fontWeight: '500' };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '14px', backgroundColor: '#FAF7F2', color: '#1A1A1A' };

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
  const [transactions, setTransactions] = useState([]); 
  const [newVehicle, setNewVehicle] = useState({
    vehicle_number: '', vehicle_age: '', condition: 'Good', area: '', daily_rent: '', fine_per_day: '',
    rental_from: '', rental_to: '', payment_deadline: '', charging_station: ''
  });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchVehicles();
    fetchStats();
    fetchDriverPayouts();
    fetchGlobalTransactions();
  }, []);

  const fetchGlobalTransactions = async () => {
    try {
      const res = await api.get('/api/payment/my-transactions?phone=9876542345');
      setTransactions(res.data);
    } catch (err) {
      console.error("Error fetching collections:", err);
    }
  };

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

  return createElement('div', { style: { display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' } }, [
    createElement(Sidebar, { key: 'sidebar' }),
    createElement('div', { key: 'main-content', style: { marginLeft: '220px', flex: 1, padding: '32px' } }, [
      
      // Top Header Greeting
      createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' } }, [
        createElement('div', null, [
          createElement('h1', { style: { fontSize: '24px', fontWeight: '700', color: '#1A1A1A', margin: 0 } }, `Hello, ${user.name || 'Owner'} 👋`),
          createElement('p', { style: { fontSize: '13px', color: '#6B6B6B', marginTop: '4px', margin: 0 } }, 'Real time status of your EV assets.')
        ])
      ]),

      // Earnings Metrics Section
      createElement('div', { style: { display: 'flex', gap: '16px', marginBottom: '24px' } }, [
        createElement(StatCard, { label: 'Earnings', value: `₹${stats.total_earnings}`, sub: 'From successful payments', subColor: '#16A34A' }),
        createElement(StatCard, { label: 'Collection Efficiency', value: `${stats.collection_efficiency}%`, sub: 'Target: 98%' }),
        createElement(StatCard, { label: 'Active Fleet Overview', value: `${stats.total_vehicles} vehicles`, sub: 'All vehicles active', subColor: '#16A34A' }),
        createElement(StatCard, { label: 'Compliance Score', value: 'Healthy', sub: 'All RCs/Insurance valid', subColor: '#16A34A' })
      ]),

      // Earnings & Active Payouts Table
      createElement('div', { style: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5', marginBottom: '24px' } }, [
        createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } }, [
          createElement('p', { style: { fontSize: '15px', fontWeight: '600', color: '#1A1A1A', margin: 0 } }, 'Earnings & Active Payouts Grid'),
          createElement('input', {
            style: { padding: '8px 14px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', backgroundColor: '#FAF7F2', color: '#1A1A1A' },
            placeholder: 'Search driver or vehicle ID...',
            value: search,
            onChange: (e) => setSearch(e.target.value)
          })
        ]),
        createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } }, [
          createElement('thead', null, 
            createElement('tr', { style: { borderBottom: '1px solid #E8E0D5' } }, [
              createElement('th', { style: thStyle }, 'Vehicle ID'),
              createElement('th', { style: thStyle }, 'Driver'), 
              createElement('th', { style: thStyle }, 'Status'),
              createElement('th', { style: thStyle }, 'Daily Rent'),
              createElement('th', { style: thStyle }, "Today's Payout"),
              createElement('th', { style: thStyle }, 'Action')
            ])
          ),
          createElement('tbody', null, 
            filteredVehicles.length === 0 
              ? createElement('tr', null, createElement('td', { colSpan: 6, style: { padding: '24px', textAlign: 'center', fontSize: '14px', color: '#9CA3AF' } }, 'No entries found.'))
              : filteredVehicles.map((v, i) => 
                  createElement('tr', { key: i, style: { borderBottom: '1px solid #E8E0D5' } }, [
                    createElement('td', { style: tdStyle }, v.vehicle_number),
                    createElement('td', { style: tdStyle }, v.driver_phone || '9876542345'), 
                    createElement('td', { style: tdStyle }, 
                      createElement('span', { style: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: v.status === 'On Route' ? '#DCFCE7' : '#F3F4F6', color: v.status === 'On Route' ? '#16A34A' : '#6B7280' } }, v.status)
                    ),
                    createElement('td', { style: tdStyle }, `₹${v.daily_rent}`),
                    createElement('td', { style: tdStyle }, 
                      (() => {
                        var payout = driverPayouts.find(p => p.vehicle_number === v.vehicle_number);
                        var status = payout ? payout.payout_status : 'Pending';
                        return createElement('span', { style: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', backgroundColor: status === 'Paid' ? '#DCFCE7' : '#FEF3C7', color: status === 'Paid' ? '#16A34A' : '#D97706' } }, status);
                      })()
                    ),
                    createElement('td', { style: tdStyle }, 
                      createElement('button', { onClick: () => handleEdit(v), style: { padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', backgroundColor: '#F3EDE5', color: '#8B5E3C', border: 'none', cursor: 'pointer' } }, 'Edit Driver')
                    )
                  ])
                )
          )
        ])
      ]),

      // Revenue Trend Chart
      createElement('div', { style: { display: 'flex', gap: '16px', marginBottom: '24px' } }, [
        createElement('div', { style: { flex: 1 } }, 
          createElement(Chart, { 
            data: stats.revenue_chart.length > 0 ? stats.revenue_chart.map(r => ({ name: new Date(r.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), value: parseFloat(r.value) })) : [{ name: 'No data', value: 0 }], 
            title: 'Collection Revenue Trend' 
          })
        )
      ]),

      // Live Rental Collection History
      createElement('div', { style: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' } }, [
        createElement('div', { style: { marginBottom: '16px' } }, [
          createElement('p', { style: { fontSize: '15px', fontWeight: '600', color: '#1A1A1A', margin: 0 } }, 'Live Rental Collection History')
        ]),
        createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } }, [
          createElement('thead', null, 
            createElement('tr', { style: { borderBottom: '1px solid #E8E0D5' } }, [
              createElement('th', { style: thStyle }, 'Driver'), 
              createElement('th', { style: thStyle }, 'Order ID'),
              createElement('th', { style: thStyle }, 'Date & Time'),
              createElement('th', { style: thStyle }, 'Amount Paid'),
              createElement('th', { style: thStyle }, 'Payment Mode'), 
              createElement('th', { style: thStyle }, 'Payment Status')
            ])
          ),
          createElement('tbody', null, 
            transactions.length === 0 
              ? createElement('tr', null, createElement('td', { colSpan: 6, style: { padding: '24px', textAlign: 'center', fontSize: '14px', color: '#9CA3AF' } }, 'No rental transactions recorded yet.'))
              : transactions.map((txn, index) => 
                  createElement('tr', { key: index, style: { borderBottom: '1px solid #E8E0D5' } }, [
                    createElement('td', { style: tdStyle }, txn.payer_mobile || '9876542345'),
                    createElement('td', { style: { ...tdStyle, fontFamily: 'monospace', fontSize: '12px' } }, txn.order_id),
                    createElement('td', { style: tdStyle }, new Date(txn.order_initiation_date).toLocaleString('en-IN')),
                    createElement('td', { style: { ...tdStyle, fontWeight: '600' } }, `INR ${txn.order_amount}`),
                    createElement('td', { style: tdStyle }, 
                      createElement('span', { style: { fontWeight: '500', color: '#4B5563', fontSize: '13px' } }, txn.payment_mode ? txn.payment_mode : (txn.payment_method ? txn.payment_method : 'UPI / QR Code'))
                    ),
                    createElement('td', { style: tdStyle }, 
                      createElement('span', {
                        style: {
                          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                          backgroundColor: txn.transaction_status === 'SUCCESS' ? '#DCFCE7' : txn.transaction_status === 'FAILED' ? '#FEE2E2' : '#FEF3C7',
                          color: txn.transaction_status === 'SUCCESS' ? '#16A34A' : txn.transaction_status === 'FAILED' ? '#EF4444' : '#D97706'
                        }
                      }, txn.transaction_status)
                    )
                  ])
                )
          )
        ])
      ])

    ]),

    // Add Vehicle Modal Structure
    showModal && createElement('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, 
      createElement('div', { style: { backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '560px', maxHeight: '85vh', overflowY: 'auto' } }, [
        createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' } }, [
          createElement('h2', { style: { fontSize: '20px', fontWeight: '700', color: '#1A1A1A', margin: 0 } }, 'Add New Vehicle'),
          createElement('button', { onClick: () => setShowModal(false), style: { fontSize: '20px', color: '#6B6B6B', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' } }, '✕')
        ]),
        createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' } }, [
          createElement('div', null, [createElement('p', { style: labelStyle }, 'Vehicle Number'), createElement('input', { style: inputStyle, placeholder: 'UP-14-EA-2201', value: newVehicle.vehicle_number, onChange: (e) => setNewVehicle({ ...newVehicle, vehicle_number: e.target.value }) })]),
          createElement('div', null, [createElement('p', { style: labelStyle }, 'Daily Rent (₹)'), createElement('input', { style: inputStyle, type: 'number', placeholder: '450', value: newVehicle.daily_rent, onChange: (e) => setNewVehicle({ ...newVehicle, daily_rent: e.target.value }) })])
        ]),
        createElement('div', { style: { display: 'flex', gap: '12px', marginTop: '24px' } }, [
          createElement('button', { onClick: () => setShowModal(false), style: { flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#F3EDE5', color: '#8B5E3C', border: 'none', cursor: 'pointer' } }, 'Cancel'),
          createElement('button', { onClick: handleAddVehicle, style: { flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#8B5E3C', color: 'white', border: 'none', cursor: 'pointer' } }, 'Add Vehicle')
        ])
      ])
    ),

    // FIXED: Corrected parenthesis alignment mapping for Edit Driver Modal layout context
    showEditModal && selectedVehicle && createElement('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, 
      createElement('div', { style: { backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '400px' } }, [
        createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' } }, [
          createElement('h2', { style: { fontSize: '20px', fontWeight: '700', color: '#1A1A1A', margin: 0 } }, 'Edit Driver'),
          createElement('button', { onClick: () => setShowEditModal(false), style: { fontSize: '20px', color: '#6B6B6B', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' } }, '✕')
        ]),
        createElement('p', { style: { fontSize: '13px', color: '#6B6B6B', marginBottom: '16px', margin: 0 } }, `Vehicle: ${selectedVehicle.vehicle_number}`),
        createElement('div', { style: { marginBottom: '16px' } }, [
          createElement('p', { style: labelStyle }, 'Driver Name'),
          createElement('input', { style: inputStyle, value: editDriverName, onChange: (e) => setEditDriverName(e.target.value) })
        ]),
        createElement('div', { style: { marginBottom: '24px' } }, [
          createElement('p', { style: labelStyle }, 'Driver Phone'), 
          createElement('input', { style: inputStyle, type: 'number', value: editDriverPhone, onChange: (e) => setEditDriverPhone(e.target.value) })
        ]),
        createElement('div', { style: { display: 'flex', gap: '12px' } }, [
          createElement('button', { onClick: () => setShowEditModal(false), style: { flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#F3EDE5', color: '#8B5E3C', border: 'none', cursor: 'pointer' } }, 'Cancel'),
          createElement('button', { onClick: handleUpdateDriver, style: { flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#8B5E3C', color: 'white', border: 'none', cursor: 'pointer' } }, 'Update Driver')
        ])
      ])
    )
  ]);
}