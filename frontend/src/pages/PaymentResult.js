import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import api from '../api';
export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(60); // Print click hone par isko rok denge
  const [stopTimer, setStopTimer] = useState(false); // Timer rokne ke liye state
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState(null);
  // Print ke liye reference
  const componentRef = useRef();
  const orderId = searchParams.get('ref') || searchParams.get('orderId');
  const statusParam = searchParams.get('status');
  const queryDetails = Object.fromEntries(searchParams.entries());
  const goToDashboard = useCallback(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'owner') {
      navigate('/owner/dashboard');
    } else {
      navigate('/driver/dashboard');
    }
  }, [navigate]);
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
        console.log("BACKEND SE AAYA DATA:", res.data);
        setOrderData(res.data);
      } catch (err) {
        console.error('Payment result fetch failed:', err.response?.data || err.message || err);
        setError(err.response?.data?.message || err.message || 'Failed to fetch payment result');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);
  //Timer Logic
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
  }, [loading, stopTimer, countdown, goToDashboard]);
  // ROBUST VARIABLE MAPPING
  // extract from backend response structure
  const local = orderData?.local || {};
  const external = orderData?.pyData || orderData?.external || orderData?.data || {}; 
  const raw = orderData?.raw || {};
  // Status Check
  const status = local.transaction_status || external.status || external.transactionStatus || statusParam || 'PENDING';
  const isSuccess = String(status).toUpperCase() === 'SUCCESS';
  // Amount & Currency
  const amount = local.order_amount || external.amount || 'N/A';
  const currency = local.currency || external.currency || 'INR';
  // IDs & References
  const localOrderUuid = local.order_id || 'N/A';
  const merchantRef = local.order_number || 'N/A';
  const payyantraOrderId = external.orderId || external.pspOrderId || 'N/A';
  const payyantraReferenceId = external.referenceId || 'N/A';  
  // Transaction IDs (Crucial Fix)
  const pspTxnId = local.pg_transaction_id || external.transactionId || external.transactionPublicId || raw.txnId || 'N/A';
  const gatewayMerchantOrderId = external.merchantOrderId || 'N/A';
  const statusCode = local.transaction_status_code || external.statusCode || 'N/A';
  // Bank details (UAT environment usually returns null/NA for these)
  const referenceNumber = local.bank_reference_no || external.rrn || external.bankReferenceNo || raw.rrn || 'N/A';
  const utrNumber = local.bank_utr_no || external.bankUTRNo || raw.utr || 'N/A';
  // Customer Details
  const payerName = local.payer_name || external.customerDetails?.name || 'N/A';
  const payerEmail = local.payer_email || external.customerDetails?.email || 'N/A';
  const payerPhone = local.payer_mobile || external.customerDetails?.phone || 'N/A';
  // Timestamps
  const createdAt = local.order_initiation_date || local.created_at || 'N/A';
  const completedAt = local.order_completion_date || local.updated_at || 'N/A';
  // URLs & Methods
  const paymentUrl = external.checkoutUrl || local.payment_url || 'N/A';
  const notifyUrl = external.notifyUrl || 'N/A';
  const returnUrl = external.returnUrl || 'N/A';
  const paymentMethod = external.paymentMode || raw.payment_method || 'N/A';  
  const rawJSON = JSON.stringify(orderData, null, 2);
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
                {fieldRow('Query Params', JSON.stringify(queryDetails) || 'N/A')}
                {fieldRow('Note', 'This usually means the local backend DB did not find this order.')}
              </div>
              {!stopTimer ? (
                <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '16px' }}>Redirecting to dashboard in {countdown} seconds...</p>
              ) : (
                <p style={{ fontSize: '13px', color: '#8B5E3C', marginBottom: '16px' }}>Auto-redirect paused. You can safely print or inspect this error.</p>
              )}
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
                <div style={{ display: 'grid', gap: '20px', marginBottom: '24px' }}>
                  <div style={{ backgroundColor: '#F8F5EF', borderRadius: '16px', padding: '24px' }}>
                    <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: '#1A1A1A' }}>Local DB values</h2>
                    {fieldRow('Order UUID', localOrderUuid)}
                    {fieldRow('Order Number', merchantRef)}
                    {fieldRow('Transaction Status', local.transaction_status || 'N/A')}
                    {fieldRow('Status Code', local.transaction_status_code || 'N/A')}
                    {fieldRow('PG Txn ID', local.pg_transaction_id || 'N/A')}
                    {fieldRow('Amount', `${local.currency || 'INR'} ${local.order_amount || 'N/A'}`)}
                    {fieldRow('Payer Name', local.payer_name || 'N/A')}
                    {fieldRow('Payer Email', local.payer_email || 'N/A')}
                    {fieldRow('Payer Mobile', local.payer_mobile || 'N/A')}
                    {fieldRow('Bank Reference / RRN', local.bank_reference_no || 'N/A')}
                    {fieldRow('Bank UTR', local.bank_utr_no || 'N/A')}
                    {fieldRow('Created At', local.order_initiation_date || local.created_at || 'N/A')}
                    {fieldRow('Completed At', local.order_completion_date || local.updated_at || 'N/A')}
                  </div>
                  <div style={{ backgroundColor: '#F8F5EF', borderRadius: '16px', padding: '24px' }}>
                    <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: '#1A1A1A' }}>PayYantra / Gateway values</h2>
                    {fieldRow('PayYantra Ref ID', payyantraReferenceId)}
                    {fieldRow('Payment Order ID', payyantraOrderId)}
                    {fieldRow('PG Txn ID', pspTxnId)}
                    {fieldRow('Status', status)}
                    {fieldRow('Amount', `${currency} ${amount}`)}
                    {fieldRow('Customer Name', payerName)}
                    {fieldRow('Customer Email', payerEmail)}
                    {fieldRow('Customer Phone', payerPhone)}
                    {fieldRow('Payment Mode', paymentMethod)}
                    {fieldRow('Gateway Order ID', gatewayMerchantOrderId)}
                    {fieldRow('Payment URL', paymentUrl)}
                    {fieldRow('Notify URL', notifyUrl)}
                    {fieldRow('Return URL', returnUrl)}
                    {fieldRow('Bank Reference / RRN', referenceNumber)}
                    {fieldRow('Bank UTR', utrNumber)}
                  </div>
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
              <div style={{ marginTop: '24px', backgroundColor: '#F3F4F6', borderRadius: '16px', padding: '20px' }}>
                <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: '#1F2937' }}>Developer Details</h2>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px', color: '#111827', background: '#FFFFFF', borderRadius: '12px', padding: '16px', overflowX: 'auto', maxHeight: '320px' }}>
{rawJSON}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}