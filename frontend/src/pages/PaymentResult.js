import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print'; // Naya import
import api from '../api';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(10); // Print click hone par isko rok denge
  const [stopTimer, setStopTimer] = useState(false); // Timer rokne ke liye state
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState(null);

  // Print ke liye reference
  const componentRef = useRef();

  const orderId = searchParams.get('orderId') || searchParams.get('referenceId') || searchParams.get('orderNumber') || searchParams.get('reference_id');
  const statusParam = searchParams.get('status');

  const goToDashboard = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'owner') {
      navigate('/owner/dashboard');
    } else {
      navigate('/driver/dashboard');
    }
  };

  // Print Handle Function
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Receipt_${orderId || 'Payment'}`,
    onBeforeGetContent: () => {
      // Jaise hi Print dabega, countdown ruk jayega taaki page redirect na ho!
      setStopTimer(true); 
    }
  });

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError('Order ID missing');
        setLoading(false);
        return;
      }

      try {
        const res = await api.get(`/api/payment/order/${orderId}`);
        setOrderData(res.data);
      } catch (err) {
        console.error('Payment result fetch failed:', err.response?.data || err.message || err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  // Updated Timer Logic
  useEffect(() => {
    if (!loading && !stopTimer) {
      const timer = setTimeout(goToDashboard, countdown * 1000);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [loading, stopTimer, countdown]); // stopTimer add kiya dependency mein

  const local = orderData?.local || {};
  const external = orderData?.external || {};
  const raw = orderData?.raw || {};
  const status = external?.transactionStatus || external?.status || local.transaction_status || statusParam || 'PENDING';
  const isSuccess = String(status).toUpperCase() === 'SUCCESS';
  const amount = local.order_amount || external?.amount || raw?.amount || 'N/A';
  const currency = local.currency || external?.currency || raw?.currency || 'INR';
  const referenceNumber = local.bank_reference_no || external?.bankReferenceNo || external?.rrn || raw?.bankReferenceNo || raw?.rrn || 'N/A';
  const utrNumber = local.bank_utr_no || external?.bankUTRNo || raw?.bankUTRNo || 'N/A';
  const pspTxnId = local.pg_transaction_id || external?.transactionId || raw?.transactionId || 'N/A';
  const payyantraOrderId = external?.orderId || external?.pspOrderId || raw?.orderId || raw?.pspOrderId || 'N/A';
  const payyantraReferenceId = external?.referenceId || raw?.referenceId || 'N/A';
  const localOrderUuid = local.order_id || 'N/A';
  const statusCode = local.transaction_status_code || external?.statusCode || raw?.statusCode || 'N/A';
  const merchantRef = local.order_number || 'N/A';

  const fieldRow = (label, value) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
      <span style={{ color: '#6B6B6B', fontSize: '13px' }}>{label}</span>
      <span style={{ color: '#1A1A1A', fontSize: '13px', fontWeight: '600', textAlign: 'right', maxWidth: '220px' }}>{value || 'N/A'}</span>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', padding: '32px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 24px 60px rgba(0,0,0,0.08)' }}>
          {loading ? (
            <p style={{ fontSize: '16px', color: '#6B6B6B' }}>Loading payment result...</p>
          ) : error ? (
            <>
              <p style={{ fontSize: '16px', color: '#DC2626', marginBottom: '16px' }}>{error}</p>
              <div style={{ backgroundColor: '#F8F5EF', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                {fieldRow('Order Reference', orderId)}
                {fieldRow('Status', statusParam || 'UNKNOWN')}
              </div>
              <button
                onClick={goToDashboard}
                style={{ width: '100%', padding: '14px', backgroundColor: '#8B5E3C', color: 'white', borderRadius: '10px', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
              >
                Back to Dashboard
              </button>
            </>
          ) : (
            <>
              {/* Jisko print karna hai usko Ref de diya */}
              <div ref={componentRef} style={{ padding: '20px', backgroundColor: 'white' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>{isSuccess ? '✅' : '❌'}</div>
                  <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1A1A1A', marginBottom: '8px' }}>
                    {isSuccess ? 'Payment Completed' : 'Payment Status'}
                  </h1>
                  <p style={{ color: isSuccess ? '#16A34A' : '#DC2626', fontWeight: '700', marginBottom: '8px' }}>{status}</p>
                  
                  {/* Agar timer ruk gaya hai, toh user ko message dikhao ki timer paused hai */}
                  {!stopTimer ? (
                    <p style={{ fontSize: '13px', color: '#9CA3AF' }}>Redirecting to dashboard in {countdown} seconds...</p>
                  ) : (
                    <p style={{ fontSize: '13px', color: '#8B5E3C' }}>Auto-redirect paused. You can safely print the receipt.</p>
                  )}
                </div>

                <div style={{ backgroundColor: '#F8F5EF', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                  {fieldRow('Order Reference', merchantRef)}
                  {fieldRow('Order UUID', localOrderUuid)}
                  {fieldRow('PayYantra Ref ID', payyantraReferenceId)}
                  {fieldRow('Payment Order ID', payyantraOrderId)}
                  {fieldRow('PG Txn ID', pspTxnId)}
                  {fieldRow('PayYantra Status Code', statusCode)}
                  {fieldRow('Amount', `${currency} ${amount}`)}
                  {fieldRow('Payer Mobile', local.payer_mobile || external?.customerPhone || 'N/A')}
                  {fieldRow('Bank Reference / RRN', referenceNumber)}
                  {fieldRow('Bank UTR', utrNumber)}
                  {fieldRow('Status', status)}
                </div>
              </div>

              {/* Action Buttons Container */}
              <div style={{ display: 'flex', gap: '16px' }}>
                <button
                  onClick={handlePrint}
                  style={{ flex: 1, padding: '14px', backgroundColor: '#F8F5EF', color: '#8B5E3C', border: '2px solid #8B5E3C', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
                >
                  🖨️ Print Receipt
                </button>
                <button
                  onClick={goToDashboard}
                  style={{ flex: 1, padding: '14px', backgroundColor: '#8B5E3C', color: 'white', borderRadius: '10px', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
                >
                  Back to Dashboard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}