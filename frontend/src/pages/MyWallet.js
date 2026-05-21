import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation(); 
  // Language badalne ka function
  const switchLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  
  const [inquiryLogs, setInquiryLogs] = useState({});

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchData = async () => {
    try {
      const phone = "9876542345"; 
      
      if (!phone) return;

      const [txnRes, detailsRes] = await Promise.all([
        api.get('/api/payment/my-transactions', { params: { phone: phone } }),
        api.get('/api/payment/driver-details', { params: { phone: phone } }),
      ]);

      const sortedTransactions = txnRes.data
        .slice()
        .sort((a, b) => new Date(b.order_initiation_date) - new Date(a.order_initiation_date));

      setTransactions(sortedTransactions);
      setDriverDetails(detailsRes.data);
    } catch (err) {
      console.error("Fetch Data Error:", err.response?.data || err.message);
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
  
  const filteredTxns = transactions.filter(t => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      t.order_number?.toLowerCase().includes(s) ||
      t.transaction_status?.toLowerCase().includes(s) ||
      t.pg_transaction_id?.toLowerCase().includes(s) ||
      t.order_id?.toLowerCase().includes(s)
    );
  });

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
      alert('Unable to refresh pending inquiries. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshSingle = async (orderId, e) => {
    if(e) e.stopPropagation(); 
    setRefreshing(true);

    try {
      const response = await api.get(`/api/payment/status/${orderId}`);
      setInquiryLogs(prev => ({
        ...prev,
        [orderId]: JSON.stringify(response.data, null, 2)
      }));
      await fetchData();
    } catch (err) {
      setInquiryLogs(prev => ({
        ...prev,
        [orderId]: JSON.stringify(err.response?.data || { error: err.message }, null, 2)
      }));
      alert('Unable to refresh this inquiry. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div style={{ display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '24px 32px' }}>

        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1A1A1A' }}>My Wallet</h1>
          <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>Manage your earnings and withdrawals.</p>
        </div>

        {withdrawn && (
          <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #16A34A', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: '#16A34A', fontWeight: '500' }}>
            ✓ Withdrawal request submitted successfully. Amount will be credited in 1-2 business days.
          </div>
        )}

        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          <div style={{ flex: 1, backgroundColor: '#7D5235', borderRadius: '12px', padding: '20px', color: 'white' }}>
            <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '6px' }}>Wallet Balance</p>
            <p style={{ fontSize: '32px', fontWeight: '700', marginBottom: '16px' }}>₹{driverDetails.wallet_balance}</p>
            <button
              onClick={() => setShowWithdraw(true)}
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
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
              <div key={i} style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #E8E0D5' }}>
                <p style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{card.label}</p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A', marginBottom: '4px' }}>{card.value}</p>
                <p style={{ fontSize: '11px', color: card.color || '#6B6B6B' }}>{card.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* --- COMPACT PAYYANTRA CLONE TABLE GRID --- */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #E8E0D5', overflow: 'hidden' }}>
          
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8E0D5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', margin: 0 }}>Transactions</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleRefreshAllPending}
                disabled={refreshing || pendingCount === 0}
                style={{ padding: '6px 12px', borderRadius: '4px', backgroundColor: pendingCount > 0 ? '#8B5E3C' : '#F3F4F6', color: pendingCount > 0 ? 'white' : '#9CA3AF', border: 'none', cursor: pendingCount > 0 ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: '600' }}
              >
                {refreshing ? 'Syncing...' : `Bulk Sync (${pendingCount})`}
              </button>
              <input
                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #D1D5DB', fontSize: '12px', width: '220px' }}
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                  <th style={{ padding: '10px 12px' }}>PY Txn ID</th>
                  <th style={{ padding: '10px 12px' }}>Your Order ID</th>
                  <th style={{ padding: '10px 12px' }}>Date & Time</th>
                  <th style={{ padding: '10px 12px' }}>Mobile</th>
                  <th style={{ padding: '10px 12px' }}>Amount</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxns.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: '12px' }}>
                      No transactions found.
                    </td>
                  </tr>
                ) : filteredTxns.map((t) => {
                  
                  const dateObj = new Date(t.order_initiation_date);
                  const formattedDate = `${('0' + dateObj.getDate()).slice(-2)}-${('0' + (dateObj.getMonth()+1)).slice(-2)}-${dateObj.getFullYear()}, ${dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

                  return (
                    <React.Fragment key={t.order_id}>
                      {/* MAIN GRID ROW */}
                      <tr style={{ borderTop: '1px solid #F3F4F6', backgroundColor: 'white', color: '#374151', fontSize: '11.5px' }}>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px' }}>{t.pg_transaction_id || ''}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px' }}>{t.order_id}</td>
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{formattedDate}</td>
                        <td style={{ padding: '8px 12px' }}>{t.payer_mobile || "9876542345"}</td>
                        <td style={{ padding: '8px 12px', fontWeight: '600' }}>INR {parseFloat(t.order_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ 
                            padding: '3px 6px', 
                            borderRadius: '4px', 
                            fontSize: '10px', 
                            fontWeight: '600',
                            backgroundColor: t.transaction_status === 'SUCCESS' ? '#DEF7EC' : t.transaction_status === 'FAILED' ? '#FDE8E8' : '#FEF08A', 
                            color: t.transaction_status === 'SUCCESS' ? '#03543F' : t.transaction_status === 'FAILED' ? '#9B1C1C' : '#9CA3AF',
                          }}>
                            {t.transaction_status}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          {!inquiryLogs[t.order_id] && t.transaction_status !== 'SUCCESS' ? (
                            <button
                              onClick={(e) => handleRefreshSingle(t.order_id, e)}
                              disabled={refreshing}
                              style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#374151', color: 'white', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: '500' }}
                            >
                              Sync
                            </button>
                          ) : (
                            <span style={{ fontSize: '10px', color: '#10B981', fontWeight: '600' }}>Synced</span>
                          )}
                        </td>
                      </tr>

                      {/* COMPACT JSON PAYLOAD ROW */}
                      <tr style={{ backgroundColor: '#F9FAFB' }}>
                        <td colSpan="7" style={{ padding: '8px 20px 16px 20px', borderBottom: '1px solid #E5E7EB' }}>
                          <p style={{ color: '#6B7280', fontSize: '9px', textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px', marginTop: '4px' }}>
                          </p>
                          <pre style={{ 
                            backgroundColor: '#ffffff', 
                            color: '#000000', 
                            padding: '10px', 
                            borderRadius: '4px', 
                            fontSize: '10.5px', 
                            overflowX: 'auto',
                            maxHeight: '120px',
                            margin: 0,
                            fontFamily: 'monospace'
                          }}>
                            {inquiryLogs[t.order_id] || " "}
                          </pre>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {showWithdraw && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1A1A1A' }}>Withdraw to Bank</h2>
              <button onClick={() => setShowWithdraw(false)} style={{ fontSize: '18px', color: '#6B6B6B', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ backgroundColor: '#F3EDE5', borderRadius: '6px', padding: '10px 12px', marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', color: '#6B6B6B' }}>Available Balance</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#8B5E3C' }}>₹{driverDetails.wallet_balance}</p>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', color: '#6B6B6B', marginBottom: '6px', fontWeight: '500' }}>Withdraw Amount (₹)</p>
              <input
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E8E0D5', fontSize: '13px', backgroundColor: '#FAF7F2', color: '#1A1A1A' }}
                type="number"
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleWithdraw()}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', color: '#6B6B6B', marginBottom: '6px', fontWeight: '500' }}>Bank Account</p>
              <div style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E8E0D5', backgroundColor: '#FAF7F2' }}>
                <p style={{ fontSize: '13px', color: '#1A1A1A' }}>HDFC Bank — XXXX7890</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowWithdraw(false)} style={{ flex: 1, padding: '10px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', backgroundColor: '#F3EDE5', color: '#8B5E3C', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleWithdraw} style={{ flex: 1, padding: '10px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', backgroundColor: '#8B5E3C', color: 'white', border: 'none', cursor: 'pointer' }}>Withdraw</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}