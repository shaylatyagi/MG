import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Chart from '../components/Chart';
import api from '../api';

const thStyle = { textAlign: 'left', padding: '12px 16px', fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' };
const tdStyle = { padding: '14px 16px', fontSize: '14px', color: '#1A1A1A' };

export default function EarningsPayouts() {
  const [stats, setStats] = useState({ total_vehicles: 0, total_earnings: 0, collection_efficiency: 0, revenue_chart: [] });
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStats();
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/api/payment/my-transactions?phone=9876542345');
      setTransactions(res.data);
    } catch (err) {
      console.error('Error fetching transactions:', err);
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

  const totalEarnings = transactions
    .filter(t => t.transaction_status === 'SUCCESS')
    .reduce((sum, t) => sum + parseFloat(t.order_amount || 0), 0);
  
  const pendingCount = transactions.filter(t => t.transaction_status === 'PENDING').length;
  
  const filteredTxns = transactions.filter(txn => {
    const term = search.toLowerCase();
    return (
      (txn.payer_mobile || '').toLowerCase().includes(term) ||
      (txn.order_id || '').toLowerCase().includes(term) ||
      (txn.pg_transaction_id || '').toLowerCase().includes(term) ||
      (txn.transaction_status || '').toLowerCase().includes(term) ||
      `INR ${txn.order_amount || ''}`.toLowerCase().includes(term) ||
      (txn.payment_mode || '').toLowerCase().includes(term) ||
      (txn.order_initiation_date ? new Date(txn.order_initiation_date).toLocaleString('en-IN').toLowerCase().includes(term) : false)
    );
  });

  return (
    <div style={{ display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A' }}>Earnings</h1>
          <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>Track all your rental income and transaction history.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Earnings', value: `₹${totalEarnings.toFixed(2)}`, sub: 'From successful payments', color: '#16A34A' },
            { label: 'Collection Efficiency', value: `${stats.collection_efficiency}%`, sub: 'Target: 98%', color: stats.collection_efficiency >= 98 ? '#16A34A' : '#D97706' },
            { label: 'Pending Dues', value: `${pendingCount}`, sub: 'Payments pending', color: pendingCount > 0 ? '#D97706' : '#16A34A' },
            { label: 'Total Transactions', value: `${transactions.length}`, sub: 'All time', color: '#1A1A1A' },
          ].map((card, i) => (
            <div key={i} style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #E8E0D5' }}>
              <p style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{card.label}</p>
              <p style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', marginBottom: '4px' }}>{card.value}</p>
              <p style={{ fontSize: '12px', color: card.color }}>{card.sub}</p>
            </div>
          ))}
        </div>
        
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', margin: 0 }}>Live Rental Collection History</p>
            <input
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', backgroundColor: '#FAF7F2', color: '#1A1A1A', width: '260px' }}
              placeholder="Search by driver, order ID, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E8E0D5' }}>
                  {['Driver', 'Order ID', 'Transaction ID', 'Date & Time', 'Amount', 'Payment Mode', 'Status'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTxns.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', fontSize: '14px', color: '#9CA3AF' }}>No rental transactions recorded yet.</td>
                  </tr>
                ) : filteredTxns.map((txn, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #E8E0D5' }}>
                    <td style={tdStyle}>{txn.payer_mobile || 'N/A'}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '12px' }}>{txn.order_id}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '12px', color: '#6B6B6B' }}>
                      {txn.pg_transaction_id || 'N/A'}
                    </td>
                    <td style={tdStyle}>{new Date(txn.order_initiation_date).toLocaleString('en-IN')}</td>
                    <td style={{ ...tdStyle, fontWeight: '600' }}>INR {parseFloat(txn.order_amount).toFixed(2)}</td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: '500', color: '#4B5563', fontSize: '13px' }}>
                        {txn.payment_mode || 'N/A'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                        backgroundColor: txn.transaction_status === 'SUCCESS' ? '#DCFCE7' : txn.transaction_status === 'FAILED' ? '#FEE2E2' : '#FEF3C7',
                        color: txn.transaction_status === 'SUCCESS' ? '#16A34A' : txn.transaction_status === 'FAILED' ? '#EF4444' : '#D97706'
                      }}>
                        {txn.transaction_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <Chart
            data={stats.revenue_chart.length > 0 ? stats.revenue_chart.map(r => ({
              name: new Date(r.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
              value: parseFloat(r.value)
            })) : [{ name: 'No data', value: 0 }]}
            title="Collection Revenue Trend"
          />
        </div>
      </div>
    </div>
  );
}