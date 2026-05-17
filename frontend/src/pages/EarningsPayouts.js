import Sidebar from '../components/Sidebar';
import Chart from '../components/Chart';

const monthlyData = [
  { name: 'Jan', value: 32000 },
  { name: 'Feb', value: 28000 },
  { name: 'Mar', value: 35000 },
  { name: 'Apr', value: 41000 },
  { name: 'May', value: 38000 },
  { name: 'Jun', value: 42500 },
];

const transactions = [
  { id: 'TXN001', driver: 'Amit Sharma', vehicle: 'UP-14-EA-2201', amount: '₹450', date: 'May 17, 2026', status: 'Paid' },
  { id: 'TXN002', driver: 'Suresh Yadav', vehicle: 'UP-14-EA-2005', amount: '₹450', date: 'May 17, 2026', status: 'Pending' },
  { id: 'TXN003', driver: 'Amit Sharma', vehicle: 'UP-14-EA-2201', amount: '₹450', date: 'May 16, 2026', status: 'Paid' },
  { id: 'TXN004', driver: 'Suresh Yadav', vehicle: 'UP-14-EA-2005', amount: '₹450', date: 'May 16, 2026', status: 'Paid' },
  { id: 'TXN005', driver: 'Amit Sharma', vehicle: 'UP-14-EA-2201', amount: '₹450', date: 'May 15, 2026', status: 'Paid' },
];

export default function EarningsPayouts() {
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
            { label: 'Total Earnings', value: '₹2,16,500', sub: 'All time', color: '#1A1A1A' },
            { label: 'This Month', value: '₹42,500', sub: '▲ 12% vs last month', color: '#16A34A' },
            { label: 'Pending Dues', value: '₹450', sub: '1 payment pending', color: '#D97706' },
            { label: 'Withdrawn', value: '₹1,80,000', sub: 'To bank account', color: '#1A1A1A' },
          ].map((card, i) => (
            <div key={i} style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #E8E0D5' }}>
              <p style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{card.label}</p>
              <p style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', marginBottom: '4px' }}>{card.value}</p>
              <p style={{ fontSize: '12px', color: card.color }}>{card.sub}</p>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <Chart data={monthlyData} title="Monthly Earnings Trend" />
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A' }}>Transaction History</p>
            <button style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', backgroundColor: '#8B5E3C', color: 'white' }}>Download Report</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E8E0D5' }}>
                {['Transaction ID', 'Driver', 'Vehicle', 'Amount', 'Date', 'Status'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #E8E0D5' }}>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6B6B6B', fontFamily: 'monospace' }}>{t.id}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1A1A1A' }}>{t.driver}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1A1A1A' }}>{t.vehicle}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#1A1A1A' }}>{t.amount}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6B6B6B' }}>{t.date}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: t.status === 'Paid' ? '#DCFCE7' : '#FEF3C7', color: t.status === 'Paid' ? '#16A34A' : '#D97706' }}>{t.status}</span>
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