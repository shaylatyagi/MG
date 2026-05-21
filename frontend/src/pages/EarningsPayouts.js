import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Chart from '../components/Chart';
import api from '../api';

export default function EarningsPayouts() {
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [stats, setStats] = useState({ total_vehicles: 0, total_earnings: 0, collection_efficiency: 0, revenue_chart: [] });
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, payoutsRes, txnRes] = await Promise.all([
          api.get('/api/owner/stats'),
          api.get('/api/owner/driver-payouts'),
          api.get('/api/payment/my-transactions?phone=9876542345'),
        ]);
        setStats(statsRes.data);
        setTransactions(payoutsRes.data);
        setAllTransactions(txnRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const pendingCount = transactions.filter(t => t.payout_status === 'Pending').length;

  const filteredTxns = allTransactions.filter(txn => {
    const term = search.toLowerCase();
    return (
      (txn.payer_mobile || '').toLowerCase().includes(term) ||
      (txn.order_id || '').toLowerCase().includes(term) ||
      (txn.transaction_status || '').toLowerCase().includes(term) ||
      (txn.order_amount || '').toString().includes(term)
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
            { label: 'Total Earnings', value: `₹${stats.total_earnings}`, sub: 'All time', color: '#1A1A1A' },
            { label: 'Collection Efficiency', value: `${stats.collection_efficiency}%`, sub: 'Target: 98%', color: stats.collection_efficiency >= 98 ? '#16A34A' : '#D97706' },
            { label: 'Pending Dues', value: `${pendingCount} drivers`, sub: 'Payment pending today', color: pendingCount > 0 ? '#D97706' : '#16A34A' },
            { label: 'Total Transactions', value: `${allTransactions.length}`, sub: 'All time', color: '#1A1A1A' },
          ].map((card, i) => (
            <div key={i} style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #E8E0D5' }}>
              <p style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{card.label}</p>
              <p style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', marginBottom: '4px' }}>{card.value}</p>
              <p style={{ fontSize: '12px', color: card.color }}>{card.sub}</p>
            </div>
          ))}
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

        {/* Live Rental Collection History */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A' }}>Live Rental Collection History</p>
            <input
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '13px', backgroundColor: '#FAF7F2', color: '#1A1A1A', width: '260px' }}
              placeholder="Search by driver, order ID, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E8E0D5' }}>
                {['Driver', 'Order ID', 'Date & Time', 'Amount Paid', 'Payment Mode', 'Payment Status'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTxns.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', fontSize: '14px', color: '#9CA3AF' }}>No rental transactions recorded yet.</td>
                </tr>
              ) : filteredTxns.map((txn, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #E8E0D5' }}>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1A1A1A' }}>{txn.payer_mobile || 'N/A'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#6B6B6B', fontFamily: 'monospace' }}>{txn.order_id}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#1A1A1A' }}>{new Date(txn.order_initiation_date).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#1A1A1A' }}>INR {txn.order_amount}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4B5563' }}>{txn.payment_mode || 'UPI / QR Code'}</td>
                  <td style={{ padding: '14px 16px' }}>
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

        {/* Driver Payout Status */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
          <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>Driver Payout Status</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E8E0D5' }}>
                {['Vehicle', 'Driver', 'Phone', 'Daily Rent', 'Paid Today', 'Status'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', fontSize: '14px', color: '#9CA3AF' }}>No data found</td>
                </tr>
              ) : transactions.map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #E8E0D5' }}>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6B6B6B' }}>{t.vehicle_number}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1A1A1A' }}>{t.driver_name}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6B6B6B' }}>{t.driver_phone}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#1A1A1A' }}>₹{t.daily_rent}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1A1A1A' }}>₹{t.amount_paid_today}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: t.payout_status === 'Paid' ? '#DCFCE7' : '#FEF3C7', color: t.payout_status === 'Paid' ? '#16A34A' : '#D97706' }}>
                      {t.payout_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}