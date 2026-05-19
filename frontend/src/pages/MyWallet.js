import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api';

export default function MyWallet() {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawn, setWithdrawn] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [driverDetails, setDriverDetails] = useState({
    wallet_balance: 0,
    daily_rent: 0,
    amount_paid_today: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchData = async () => {
    try {
      const [txnRes, detailsRes] = await Promise.all([
        api.get('/api/payment/my-transactions', { params: { phone: user.phone_number } }),
        api.get('/api/payment/driver-details'),
      ]);
      const sortedTransactions = txnRes.data
        .slice()
        .sort((a, b) => new Date(b.order_initiation_date) - new Date(a.order_initiation_date));
      setTransactions(sortedTransactions);
      setDriverDetails(detailsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalPaid = transactions
    .filter(t => t.transaction_status === 'SUCCESS')
    .reduce((sum, t) => sum + parseFloat(t.order_amount), 0);

  const pendingDues = Number(driverDetails.daily_rent) - Number(driverDetails.amount_paid_today);
  const pendingCount = transactions.filter(t => t.transaction_status !== 'SUCCESS').length;

  const handleWithdraw = () => {
    if (!withdrawAmount) { alert('Enter an amount'); return; }
    setWithdrawn(true);
    setShowWithdraw(false);
    setWithdrawAmount('');
    setTimeout(() => setWithdrawn(false), 4000);
  };

  const handleRefreshAllPending = async () => {
    setRefreshing(true);
    try {
      await api.post('/api/payment/check-pending');
      await fetchData();
    } catch (err) {
      console.error('Failed to refresh pending inquiries', err);
      alert('Unable to refresh pending inquiries. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshSingle = async (orderId) => {
    setRefreshing(true);
    try {
      await api.get(`/api/payment/status/${orderId}`);
      await fetchData();
    } catch (err) {
      console.error('Failed to refresh order status', err);
      alert('Unable to refresh this inquiry. Please try again.');
    } finally {
      setRefreshing(false);
    }
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
            <p style={{ fontSize: '40px', fontWeight: '700', marginBottom: '24px' }}>₹{driverDetails.wallet_balance}</p>
            <button
              onClick={() => setShowWithdraw(true)}
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}
            >
              Withdraw to Bank
            </button>
          </div>

          <div style={{ flex: 2, display: 'flex', gap: '16px' }}>
            {[
              { label: 'Total Paid', value: `₹${totalPaid.toFixed(2)}`, sub: 'All time rent payments' },
              { label: 'Paid Today', value: `₹${driverDetails.amount_paid_today}`, sub: `Daily rent: ₹${driverDetails.daily_rent}` },
              { label: 'Pending Dues', value: `₹${pendingDues > 0 ? pendingDues : 0}`, sub: 'Due today', color: pendingDues > 0 ? '#D97706' : '#16A34A' },
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', margin: 0 }}>Transaction History</p>
            <button
              onClick={handleRefreshAllPending}
              disabled={refreshing || pendingCount === 0}
              style={{ padding: '10px 16px', borderRadius: '10px', backgroundColor: pendingCount > 0 ? '#8B5E3C' : '#E5E7EB', color: pendingCount > 0 ? 'white' : '#6B7280', border: 'none', cursor: pendingCount > 0 ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: '600' }}
            >
              {refreshing ? 'Refreshing…' : `Refresh ${pendingCount} Pending`}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {transactions.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#9CA3AF' }}>No transactions yet</p>
            ) : transactions.map((t, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '14px 0', borderBottom: '1px solid #F3EDE5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: t.transaction_status === 'SUCCESS' ? '#DCFCE7' : '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                      {t.transaction_status === 'SUCCESS' ? '✓' : '↻'}
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A' }}>{t.order_number}</p>
                      <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                        {new Date(t.order_initiation_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: t.transaction_status === 'SUCCESS' ? '#16A34A' : '#D97706' }}>
                      ₹{t.order_amount}
                    </p>
                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{t.transaction_status}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <p style={{ fontSize: '12px', color: '#6B6B6B', margin: 0 }}>Order UUID: {t.order_id || 'N/A'}</p>
                  <p style={{ fontSize: '12px', color: '#6B6B6B', margin: 0 }}>PG Txn ID: {t.pg_transaction_id || 'N/A'}</p>
                  <p style={{ fontSize: '12px', color: '#6B6B6B', margin: 0 }}>Bank Ref: {t.bank_reference_no || 'N/A'}</p>
                  <p style={{ fontSize: '12px', color: '#6B6B6B', margin: 0 }}>UTR: {t.bank_utr_no || 'N/A'}</p>
                </div>
                {t.transaction_status !== 'SUCCESS' && (
                  <button
                    onClick={() => handleRefreshSingle(t.order_id)}
                    disabled={refreshing}
                    style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#F3EDE5', color: '#8B5E3C', border: '1px solid #D6BFA8', cursor: 'pointer', alignSelf: 'flex-start', fontSize: '13px', fontWeight: '600' }}
                  >
                    {refreshing ? 'Refreshing…' : 'Refresh this pending inquiry'}
                  </button>
                )}
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
              <p style={{ fontSize: '24px', fontWeight: '700', color: '#8B5E3C' }}>₹{driverDetails.wallet_balance}</p>
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