import { useState } from 'react';
import Sidebar from '../components/Sidebar';

const transactions = [
  { type: 'debit', label: 'Daily Rent Paid', date: 'May 17, 2026, 10:15 AM', amount: '₹450', status: 'Success' },
  { type: 'credit', label: 'Refund Received', date: 'May 16, 2026, 3:00 PM', amount: '₹100', status: 'Success' },
  { type: 'debit', label: 'Daily Rent Paid', date: 'May 16, 2026, 9:45 AM', amount: '₹450', status: 'Success' },
  { type: 'debit', label: 'Daily Rent Paid', date: 'May 15, 2026, 10:00 AM', amount: '₹450', status: 'Success' },
  { type: 'debit', label: 'Late Fine', date: 'May 14, 2026, 11:00 AM', amount: '₹50', status: 'Success' },
];

export default function MyWallet() {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawn, setWithdrawn] = useState(false);

  const handleWithdraw = () => {
    if (!withdrawAmount) { alert('Enter an amount'); return; }
    setWithdrawn(true);
    setShowWithdraw(false);
    setWithdrawAmount('');
    setTimeout(() => setWithdrawn(false), 4000);
  };

  return (
    <div style={{ display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '32px' }}>

        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A' }}>My Wallet</h1>
          <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>Manage your earnings and withdrawals.</p>
        </div>

        {withdrawn && (
          <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #16A34A', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '14px', color: '#16A34A', fontWeight: '500' }}>
            ✓ Withdrawal request submitted successfully. Amount will be credited in 1-2 business days.
          </div>
        )}

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 1, backgroundColor: '#7D5235', borderRadius: '16px', padding: '28px', color: 'white' }}>
            <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '8px' }}>Wallet Balance</p>
            <p style={{ fontSize: '40px', fontWeight: '700', marginBottom: '24px' }}>₹1,240</p>
            <button
              onClick={() => setShowWithdraw(true)}
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}
            >
              Withdraw to Bank
            </button>
          </div>

          <div style={{ flex: 2, display: 'flex', gap: '16px' }}>
            {[
              { label: 'Total Earned', value: '₹18,500', sub: 'All time' },
              { label: 'Total Paid', value: '₹17,260', sub: 'Rent + fines' },
              { label: 'Pending Dues', value: '₹100', sub: 'Due today', color: '#D97706' },
            ].map((card, i) => (
              <div key={i} style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #E8E0D5' }}>
                <p style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{card.label}</p>
                <p style={{ fontSize: '22px', fontWeight: '700', color: '#1A1A1A', marginBottom: '4px' }}>{card.value}</p>
                <p style={{ fontSize: '12px', color: card.color || '#6B6B6B' }}>{card.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
          <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>Transaction History</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {transactions.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F3EDE5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: t.type === 'credit' ? '#DCFCE7' : '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                    {t.type === 'credit' ? '↑' : '↓'}
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A' }}>{t.label}</p>
                    <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{t.date}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: t.type === 'credit' ? '#16A34A' : '#DC2626' }}>
                    {t.type === 'credit' ? '+' : '-'}{t.amount}
                  </p>
                  <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{t.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {showWithdraw && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>Withdraw to Bank</h2>
              <button onClick={() => setShowWithdraw(false)} style={{ fontSize: '20px', color: '#6B6B6B', backgroundColor: 'transparent' }}>✕</button>
            </div>
            <div style={{ backgroundColor: '#F3EDE5', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#6B6B6B' }}>Available Balance</p>
              <p style={{ fontSize: '24px', fontWeight: '700', color: '#8B5E3C' }}>₹1,240</p>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '6px', fontWeight: '500' }}>Withdraw Amount (₹)</p>
              <input
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '14px', backgroundColor: '#FAF7F2', color: '#1A1A1A' }}
                type="number"
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleWithdraw()}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '6px', fontWeight: '500' }}>Bank Account</p>
              <div style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E8E0D5', backgroundColor: '#FAF7F2' }}>
                <p style={{ fontSize: '14px', color: '#1A1A1A' }}>HDFC Bank — XXXX7890</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowWithdraw(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#F3EDE5', color: '#8B5E3C' }}>Cancel</button>
              <button onClick={handleWithdraw} style={{ flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: '#8B5E3C', color: 'white' }}>Withdraw</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}