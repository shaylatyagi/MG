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
  const [stats, setStats] = useState({ total_vehicles: 0, total_earnings: 0, collection_efficiency: 0, revenue_chart: [] });
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [search, setSearch] = useState('');
  const [transactions, setTransactions] = useState([]); 
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchStats();
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

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/owner/stats');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return createElement('div', { style: { display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' } }, [
    // SIDEBAR WITH EXACT SPECIFIED NAVIGATION LINKS
    createElement(Sidebar, { 
      key: 'sidebar',
      links: [
        { name: 'Fleet Overview', icon: '🏠', path: '/owner/dashboard' },
        { name: 'My Vehicles', icon: '🚗', path: '/owner/vehicles' },
        { name: 'Earnings', icon: '💰', path: '/owner/earnings' },
        { name: 'Compliance Vault', icon: '📋', path: '/owner/compliance' },
        { name: 'Fleet Settings', icon: '⚙️', path: '/owner/settings' }
      ]
    }),
    
    createElement('div', { key: 'main-content', style: { marginLeft: '220px', flex: 1, padding: '32px' } }, [
      
      // 1. TOP GREETING HEADER
      createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' } }, [
        createElement('div', null, [
          createElement('h1', { style: { fontSize: '24px', fontWeight: '700', color: '#1A1A1A', margin: 0 } }, `Hello, ${user.name || 'Owner'} 👋`),
          createElement('p', { style: { fontSize: '13px', color: '#6B6B6B', marginTop: '4px', margin: 0 } }, 'Real time status of your EV assets.')
        ])
      ]),

      // 2. SUMMARY METRICS (STRICTLY AT THE TOP)
      createElement('div', { style: { display: 'flex', gap: '16px', marginBottom: '24px' } }, [
        createElement(StatCard, { label: 'Earnings', value: `₹${stats.total_earnings}`, sub: 'From successful payments', subColor: '#16A34A' }),
        createElement(StatCard, { label: 'Collection Efficiency', value: `${stats.collection_efficiency}%`, sub: 'Target: 98%' }),
        createElement(StatCard, { label: 'Active Fleet Overview', value: `${stats.total_vehicles} vehicles`, sub: 'All vehicles active', subColor: '#16A34A' }),
        createElement(StatCard, { label: 'Compliance Score', value: 'Healthy', sub: 'All RCs/Insurance valid', subColor: '#16A34A' })
      ]),

      // 3. MAIN SINGLE LIVE TRANSACTIONS TABLE (DUPLICATE REMOVED)
      createElement('div', { style: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5', marginBottom: '24px' } }, [
        createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } }, [
          createElement('p', { style: { fontSize: '15px', fontWeight: '600', color: '#1A1A1A', margin: 0 } }, 'Live Rental Collection History'),
          createElement('input', {
            style: { padding: '8px 14px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', backgroundColor: '#FAF7F2', color: '#1A1A1A' },
            placeholder: 'Search driver...',
            value: search,
            onChange: (e) => setSearch(e.target.value)
          })
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
              : transactions
                  .filter(txn => (txn.payer_mobile || '').includes(search))
                  .map((txn, index) => 
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
      ]),

      // 4. CHART GRAPH PLACED AT THE BOTTOM
      createElement('div', { style: { display: 'flex', gap: '16px', marginBottom: '24px' } }, [
        createElement('div', { style: { flex: 1 } }, 
          createElement(Chart, { 
            data: stats.revenue_chart.length > 0 ? stats.revenue_chart.map(r => ({ name: new Date(r.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), value: parseFloat(r.value) })) : [{ name: 'No data', value: 0 }], 
            title: 'Collection Revenue Trend' 
          })
        )
      ])

    ])
  ]);
}