import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api';

function DriverDashboard() {
  const [loading, setLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handlePayment = async (amount) => {
    setLoading(true);
    try {
      const res = await api.post('/api/payment/create-order', {
        amount: amount,
        customerName: user.name || 'Driver',
        customerPhone: user.phone_number || '',
        customerEmail: user.email || 'driver@mobilitygrid.in',
      });
      const checkoutUrl = res.data.data.data.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        alert('Payment initiation failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A' }}>Driver Console</h1>
            <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>Track your daily earnings and asset health.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', backgroundColor: 'white', color: '#1A1A1A', border: '1px solid #E8E0D5' }}>
              Download Report
            </button>
            <button
              onClick={() => handlePayment(2)}
              disabled={loading}
              style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', backgroundColor: '#8B5E3C', color: 'white', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Processing...' : 'Quick Pay Rent'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 1, backgroundColor: '#7D5235', borderRadius: '16px', padding: '28px', color: 'white' }}>
            <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '8px' }}>Wallet Balance</p>
            <p style={{ fontSize: '36px', fontWeight: '700', marginBottom: '20px' }}>₹1,240</p>
            <button style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>
              Withdraw to Bank
            </button>
          </div>

          <div style={{ flex: 2, backgroundColor: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #E8E0D5' }}>
            <p style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Today's Progress</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ fontSize: '28px', fontWeight: '700' }}>₹0 / ₹1</p>
              <span style={{ color: '#D97706', fontSize: '13px', fontWeight: '600' }}>₹100 Due</span>
            </div>
            <div style={{ backgroundColor: '#F3EDE5', borderRadius: '4px', height: '8px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#8B5E3C', borderRadius: '4px', height: '8px', width: '78%' }} />
            </div>
            <button
              onClick={() => handlePayment(10)}
              disabled={loading}
              style={{ width: '100%', padding: '14px', backgroundColor: '#C49A6C', color: 'white', borderRadius: '8px', fontSize: '15px', fontWeight: '600', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Processing...' : 'Pay Balance'}
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
              <span style={{ backgroundColor: '#DCFCE7', color: '#16A34A', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>UP-14-EA-2201</span>
            </div>
            <div style={{ display: 'flex', gap: '32px' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Battery Level</p>
                <p style={{ fontSize: '24px', fontWeight: '700' }}>68%</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>KMs Driven</p>
                <p style={{ fontSize: '24px', fontWeight: '700' }}>42.5 km</p>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '20px' }}>Recent Transactions</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F3EDE5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ backgroundColor: '#DCFCE7', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>↓</span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500' }}>Daily Rent Paid</p>
                  <p style={{ fontSize: '12px', color: '#9CA3AF' }}>May 17, 10:15 AM</p>
                </div>
              </div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#16A34A' }}>₹0.00</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DriverDashboard;