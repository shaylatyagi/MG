import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api';
function DriverDashboard() {
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [activePayment, setActivePayment] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [expandedTxn, setExpandedTxn] = useState(null); // To track which row is clicked
  const [driverDetails, setDriverDetails] = useState({
    wallet_balance: 0,
    daily_rent: 0,
    amount_paid_today: 0,
    battery_level: 0,
    kms_driven: 0,
    vehicle_number: 'Not Assigned'
  });
  const [refreshing, setRefreshing] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const fetchTransactions = async () => {
    try {
      const res = await api.get('/api/payment/my-transactions', {
        params: { phone: user.phone_number || user.phone }
      });
      const sorted = res.data.slice().sort((a, b) => new Date(b.order_initiation_date) - new Date(a.order_initiation_date));
      setTransactions(sorted);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    fetchTransactions();
  }, [user.phone_number]);
  const handleOrderInquiry = async (orderId, e) => {
    e.stopPropagation(); // Prevents row expansion when clicking the button
    setRefreshing(true); 
    try {
      const response = await api.get(`/api/payment/status/${orderId}`);
      console.log("Inquiry API ka fresh response:", response.data);
      if (response.data && response.data.success) {
        const freshStatus = response.data.status;
        setTransactions(prevTransactions => 
          prevTransactions.map(txn => 
            txn.order_id === orderId
              ? { ...txn, transaction_status: freshStatus }
              : txn
          )
        );
        alert(`Status updated to: ${freshStatus}`);
      }
    } catch (err) {
      console.error('Frontend Inquiry Failed:', err);
      alert('Status check karne mein dikkat aayi. Please try again.');
    } finally {
      setRefreshing(false);
      fetchTransactions(); 
    }
  };
  const handleRefreshAllPending = async () => {
    setRefreshing(true);
    try {
      await api.post('/api/payment/check-pending');
      await fetchTransactions();
    } catch (err) {
      console.error('Failed to refresh pending inquiries', err);
      alert('Unable to refresh pending inquiries. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };
  const pendingCount = transactions.filter(txn => txn.transaction_status !== 'SUCCESS').length;
  const handlePayment = async (amount, type) => {
    setPaymentLoading(true);
    setActivePayment(type);
    try {
      const res = await api.post('/api/payment/create-order', {
        amount: amount,
        customerName: user.name || 'Driver',
        customerPhone: user.phone_number || user.phone || "9876542345",
        customerEmail: user.email || 'driver@mobilitygrid.in',
      });
      const checkoutUrl = res.data?.data?.data?.checkoutUrl || res.data?.data?.checkoutUrl || res.data?.paymentUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        alert('Payment initiation failed. No checkout URL received.');
      }
    } catch (err) {
      console.error('Payment Error:', err);
      alert('Something went wrong. Please try again.');
    }
    setPaymentLoading(false);
    setActivePayment('');
  };
  // Toggle row expansion
  const toggleExpand = (orderId) => {
    setExpandedTxn(prev => prev === orderId ? null : orderId);
  };
  return (
    <div style={{ display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '32px' }}>        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A' }}>Hello, {user.name || 'Driver'} 👋</h1>
            <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>Track your daily earnings and asset health.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', backgroundColor: 'white', color: '#1A1A1A', border: '1px solid #E8E0D5' }}>
              Download Report
            </button>
            <button
              onClick={() => handlePayment(2, 'quick')}
              disabled={paymentLoading}
              style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', backgroundColor: '#8B5E3C', color: 'white', opacity: paymentLoading ? 0.7 : 1 }}
            >
              {paymentLoading && activePayment === 'quick' ? 'Processing...' : 'Quick Pay Rent'}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
          <div style={{ flex: 1, backgroundColor: '#7D5235', borderRadius: '16px', padding: '28px', color: 'white' }}>
            <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '8px' }}>Wallet Balance</p>
            <p style={{ fontSize: '36px', fontWeight: '700', marginBottom: '20px' }}>₹{driverDetails.wallet_balance}</p>
            <button style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>
              Withdraw to Bank
            </button>
          </div>
          <div style={{ flex: 2, backgroundColor: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #E8E0D5' }}>
            <p style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Today's Progress</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ fontSize: '28px', fontWeight: '700' }}>₹{driverDetails.amount_paid_today} / ₹{driverDetails.daily_rent}</p>
              <span style={{ color: '#D97706', fontSize: '13px', fontWeight: '600' }}>₹{Number(driverDetails.daily_rent) - Number(driverDetails.amount_paid_today)} Due</span>
            </div>
            <div style={{ backgroundColor: '#F3EDE5', borderRadius: '4px', height: '8px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#8B5E3C', borderRadius: '4px', height: '8px', width: '78%' }} />
            </div>
            <button
              onClick={() => handlePayment(10, 'balance')}
              disabled={paymentLoading}
              style={{ width: '100%', padding: '14px', backgroundColor: '#C49A6C', color: 'white', borderRadius: '8px', fontSize: '15px', fontWeight: '600', opacity: paymentLoading ? 0.7 : 1 }}
            >
              {paymentLoading && activePayment === 'balance' ? 'Processing...' : 'Pay Balance'}
            </button>
          </div>
          <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #E8E0D5', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Your Trust Score</p>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <svg width="120" height="80" viewBox="0 0 120 80">
                <path d="M 10 70 A 50 50 0 0 1 110 70" fill="none" stroke="#F3EDE5" strokeWidth="12" strokeLinecap="round" />
                <path d="M 10 70 A 50 50 0 0 1 110 70" fill="none" stroke="#8B5E3C" strokeWidth="12" strokeLinecap="round" strokeDasharray="157" strokeDashoffset="40" />
              </svg>
            </div>
            <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '8px' }}>Excellent! Build 20 points more for interest-free financing.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <p style={{ fontSize: '15px', fontWeight: '600' }}>Active Vehicle Details</p>
              <span style={{ backgroundColor: '#DCFCE7', color: '#16A34A', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>{driverDetails.vehicle_number}</span>
            </div>
            <div style={{ display: 'flex', gap: '32px' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Battery Level</p>
                <p style={{ fontSize: '24px', fontWeight: '700' }}>{driverDetails.battery_level}%</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>KMs Driven</p>
                <p style={{ fontSize: '24px', fontWeight: '700' }}>{driverDetails.kms_driven} km</p>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <p style={{ fontSize: '15px', fontWeight: '600' }}>Recent Transactions</p>
              <button
                onClick={() => window.location.href = '/driver/wallet'}
                style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', backgroundColor: '#F3EDE5', color: '#8B5E3C', border: 'none', cursor: 'pointer' }}
              >
                View All →
              </button>
            </div>            
            {transactions.slice(0, 3).map((txn) => (
              <div key={txn.order_id} style={{ padding: '10px 0', borderBottom: '1px solid #F3EDE5' }}>
                <div 
                  onClick={() => toggleExpand(txn.order_id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ backgroundColor: txn.transaction_status === 'SUCCESS' ? '#DCFCE7' : '#FEE2E2', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                      {txn.transaction_status === 'SUCCESS' ? '✓' : '↻'}
                    </span>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '500' }}>{txn.order_number}</p>
                      <p style={{ fontSize: '11px', color: '#9CA3AF' }}>
                        {new Date(txn.order_initiation_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: txn.transaction_status === 'SUCCESS' ? '#16A34A' : '#D97706' }}>₹{txn.order_amount}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{txn.transaction_status}</p>
                      {txn.transaction_status !== 'SUCCESS' && (
                        <button 
                          onClick={(e) => handleOrderInquiry(txn.order_id, e)} 
                          disabled={refreshing}
                          style={{ padding: '4px 8px', fontSize: '10px', backgroundColor: '#E5E7EB', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          {refreshing ? '...' : 'Check Status'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {/* The Expanded Details Section */}
                {expandedTxn === txn.order_id && (
                  <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px dashed #D1D5DB' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', marginBottom: '12px', color: '#374151' }}>Transaction Details</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11px', color: '#4B5563' }}>
                      <div><span style={{ display: 'block', color: '#9CA3AF', fontSize: '10px', marginBottom: '2px' }}>Order UUID</span><span style={{ fontWeight: '600' }}>{txn.order_id}</span></div>
                      <div><span style={{ display: 'block', color: '#9CA3AF', fontSize: '10px', marginBottom: '2px' }}>PG Txn ID</span><span style={{ fontWeight: '600' }}>{txn.pg_transaction_id || 'N/A'}</span></div>
                      <div><span style={{ display: 'block', color: '#9CA3AF', fontSize: '10px', marginBottom: '2px' }}>Bank Reference</span><span style={{ fontWeight: '600' }}>{txn.bank_reference_no || 'N/A'}</span></div>
                      <div><span style={{ display: 'block', color: '#9CA3AF', fontSize: '10px', marginBottom: '2px' }}>Bank UTR</span><span style={{ fontWeight: '600' }}>{txn.bank_utr_no || 'N/A'}</span></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {transactions.length === 0 && <p style={{ fontSize: '13px', color: '#9CA3AF' }}>No transactions yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
export default DriverDashboard;