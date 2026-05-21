import { useState, useEffect, createElement } from 'react';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import api from '../api';

const thStyle = { textAlign: 'left', padding: '12px 16px', fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' };
const tdStyle = { padding: '14px 16px', fontSize: '14px', color: '#1A1A1A' };

export default function MyWallet() {
  const [transactions, setTransactions] = useState([]);
  const [walletBalance, setWalletBalance] = useState(42.00);
  const [totalPaid, setTotalPaid] = useState(54.00);
  const [paidToday, setPaidToday] = useState(42.00);
  const [pendingDues, setPendingDues] = useState(58);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchDriverTransactions();
  }, []);

  const fetchDriverTransactions = async () => {
    setSyncing(true);
    try {
      const res = await api.get('/api/payment/my-transactions?phone=9876542345');
      setTransactions(res.data);
    } catch (err) {
      console.error("Error fetching driver wallet transactions:", err);
    } finally {
      setSyncing(false);
    }
  };

  return createElement('div', { style: { display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' } }, [
    createElement(Sidebar, { key: 'sidebar' }),
    createElement('div', { key: 'main-content', style: { marginLeft: '220px', flex: 1, padding: '32px' } }, [
      
      // Top Title Header
      createElement('div', { style: { marginBottom: '24px' } }, [
        createElement('h1', { style: { fontSize: '24px', fontWeight: '700', color: '#1A1A1A', margin: 0 } }, 'My Wallet'),
        createElement('p', { style: { fontSize: '13px', color: '#6B6B6B', marginTop: '4px', margin: 0 } }, 'Manage your earnings and rent withdrawals.')
      ]),

      // Financial StatCards Row
      createElement('div', { style: { display: 'flex', gap: '16px', marginBottom: '32px' } }, [
        createElement(StatCard, { label: 'Wallet Balance', value: `₹${walletBalance.toFixed(2)}`, sub: 'Withdraw to Bank', subColor: '#8B5E3C' }),
        createElement(StatCard, { label: 'Total Paid', value: `₹${totalPaid.toFixed(2)}`, sub: 'All time rent payments' }),
        createElement(StatCard, { label: 'Paid Today', value: `₹${paidToday.toFixed(2)}`, sub: 'Daily rent: ₹100.00' }),
        
        // CHANGED: Label to 'Pay' and subtext cleared out entirely. Keeping same data stream amount setup.
        createElement(StatCard, { label: 'Pay', value: `₹${pendingDues}`, sub: '', subColor: '#EF4444' })
      ]),

      // Transactions Ledger Card Block
      createElement('div', { style: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' } }, [
        createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } }, [
          createElement('p', { style: { fontSize: '16px', fontWeight: '600', color: '#1A1A1A', margin: 0 } }, 'Recent Transactions'),
          createElement('button', { 
            onClick: fetchDriverTransactions,
            disabled: syncing,
            style: { padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', backgroundColor: '#F3EDE5', color: '#8B5E3C', border: 'none', cursor: 'pointer', opacity: syncing ? 0.6 : 1 } 
          }, syncing ? 'Syncing...' : 'Bulk Sync (28)')
        ]),

        // Table Structure
        createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } }, [
          createElement('thead', null, 
            createElement('tr', { style: { borderBottom: '1px solid #E8E0D5' } }, [
              createElement('th', { style: thStyle }, 'Your Order ID'),
              createElement('th', { style: thStyle }, 'Date & Time'),
              createElement('th', { style: thStyle }, 'Mobile'),
              createElement('th', { style: thStyle }, 'Amount'),
              createElement('th', { style: thStyle }, 'Payment Mode'),
              createElement('th', { style: thStyle }, 'Status')
            ])
          ),
          createElement('tbody', null, 
            transactions.length === 0 
              ? createElement('tr', null, createElement('td', { colSpan: 6, style: { padding: '24px', textAlign: 'center', fontSize: '14px', color: '#9CA3AF' } }, 'No transactions found.'))
              : transactions.map((txn, index) => 
                  createElement('tr', { key: index, style: { borderBottom: '1px solid #E8E0D5' } }, [
                    createElement('td', { style: { ...tdStyle, fontFamily: 'monospace', fontSize: '12px' } }, txn.order_id),
                    createElement('td', { style: tdStyle }, new Date(txn.order_initiation_date).toLocaleString('en-IN')),
                    createElement('td', { style: tdStyle }, txn.payer_mobile || '9876542345'),
                    createElement('td', { style: { ...tdStyle, fontWeight: '600' } }, `INR ${txn.order_amount}`),
                    createElement('td', { style: tdStyle }, 
                      createElement('span', { style: { fontWeight: '500', color: '#4B5563', fontSize: '13px' } }, txn.payment_mode || 'NetBanking / Gateway Sync')
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

    ])
  ]);
}