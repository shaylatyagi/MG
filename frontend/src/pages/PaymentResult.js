import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const orderId = searchParams.get('orderId');
  const statusParam = searchParams.get('status');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await api.get(`/api/payment/status/${orderId}`);
        setStatus(res.data.transactionStatus || statusParam);
      } catch (err) {
        setStatus(statusParam);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      checkStatus();
    } else {
      setStatus(statusParam);
      setLoading(false);
    }
  }, [orderId, statusParam]);

  const isSuccess = status === 'Success' || status === 'SUCCESS';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '48px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: '400px', width: '100%' }}>
        {loading ? (
          <p style={{ fontSize: '16px', color: '#6B6B6B' }}>Checking payment status...</p>
        ) : (
          <>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>
              {isSuccess ? '✅' : '❌'}
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', marginBottom: '8px' }}>
              {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
            </h1>
            <p style={{ fontSize: '14px', color: '#6B6B6B', marginBottom: '8px' }}>
              Order ID: {orderId}
            </p>
            <p style={{ fontSize: '14px', color: isSuccess ? '#16A34A' : '#DC2626', fontWeight: '600', marginBottom: '32px' }}>
              {status}
            </p>
            <button
              onClick={() => navigate('/driver/dashboard')}
              style={{ width: '100%', padding: '14px', backgroundColor: '#8B5E3C', color: 'white', borderRadius: '8px', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
            >
              Back to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}