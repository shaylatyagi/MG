import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Chart from '../components/Chart';
import api from '../api';

export default function EarningsPayouts() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ total_vehicles: 0, total_earnings: 0, collection_efficiency: 0, revenue_chart: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, payoutsRes] = await Promise.all([
          api.get('/api/owner/stats'),
          api.get('/api/owner/driver-payouts'),
        ]);
        setStats(statsRes.data);
        setTransactions(payoutsRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const pendingCount = transactions.filter(t => t.payout_status === 'Pending').length;

  return (
    <div style={{ display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '32px' }}>

        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A' }}>Earnings & Payouts</h1>
          <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>Track all your rental income and transaction history.</p>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Earnings', value: `₹${stats.total_earnings}`, sub: 'All time', color: '#1A1A1A' },
            { label: 'Collection Efficiency', value: `${stats.collection_efficiency}%`, sub: 'Target: 98%', color: stats.collection_efficiency >= 98 ? '#16A34A' : '#D97706' },
            { label: 'Pending Dues', value: `${pendingCount} drivers`, sub: 'Payment pending today', color: pendingCount > 0 ? '#D97706' : '#16A34A' },
            { label: 'Active Fleet', value: `${stats.total_vehicles} vehicles`, sub: 'Total vehicles', color: '#1A1A1A' },
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

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A' }}>Driver Payout Status</p>
          </div>
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