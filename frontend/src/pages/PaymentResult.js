import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import api from '../api';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(60);
  const [stopTimer, setStopTimer] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState(null);

  const componentRef = useRef();
  const orderId =
  localStorage.getItem('latest_order_number') ||
  searchParams.get('ref') ||
  searchParams.get('orderId');
  const statusParam = searchParams.get('status');

  const goToDashboard = useCallback(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'owner') {
      navigate('/owner/dashboard');
    } else {
      navigate('/driver/dashboard');
    }
  }, [navigate]);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Receipt_${orderId || 'Payment'}`,
    onBeforeGetContent: () => setStopTimer(true),
  });

  // Fetch Order Details
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
        console.error(err);
        setError('Failed to fetch payment details');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  // Auto Redirect Timer
  useEffect(() => {
    if (loading || stopTimer) return;

    const timer = setTimeout(goToDashboard, countdown * 1000);
    const interval = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [loading, stopTimer, countdown, goToDashboard]);

  // === ROBUST STATUS CHECK ===
  const rawStatus = orderData?.local?.transaction_status ||
                    orderData?.pyData?.status ||
                    orderData?.external?.status ||
                    statusParam ||
                    'PENDING';

  const isSuccess = ['success', 'succeeded', 'completed', 'paid'].includes(
    String(rawStatus).trim().toLowerCase()
  );

  const amount = orderData?.local?.order_amount || orderData?.pyData?.amount || '0';
  const referenceNumber = orderData?.local?.bank_reference_no || 
                         orderData?.pyData?.rrn || 
                         searchParams.get('rrn') || 'N/A';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">

        {loading ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-sm font-bold text-slate-500 tracking-widest">VERIFYING PAYMENT...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm text-center">
            <div className="text-red-500 text-6xl mb-4">✕</div>
            <p className="text-red-600 font-bold mb-6">{error}</p>
            <button onClick={goToDashboard} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl">
              BACK TO DASHBOARD
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 shadow-sm">

            {/* SUCCESS / FAILURE ICON */}
            <div className="flex justify-center mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-md
                ${isSuccess ? 'bg-emerald-100 text-emerald-500' : 'bg-red-100 text-red-500'}`}>
                {isSuccess ? (
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>

            <h1 className={`text-2xl font-black text-center mb-1 ${isSuccess ? 'text-emerald-600' : 'text-red-600'}`}>
              {isSuccess ? 'Payment Successful' : 'Payment Failed'}
            </h1>
            <p className="text-center text-sm font-medium text-slate-500 mb-6">{rawStatus}</p>

            <div className="bg-slate-50 rounded-2xl p-5 mb-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Order Reference</span>
                <span className="font-mono font-bold">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-bold">₹{amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bank Ref / RRN</span>
                <span className="font-mono">{referenceNumber}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handlePrint}
                className="flex-1 bg-blue-50 text-blue-700 font-bold py-4 rounded-2xl text-sm hover:bg-blue-100 transition"
              >
                PRINT RECEIPT
              </button>
              <button 
                onClick={goToDashboard}
                className="flex-[2] bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl text-sm transition"
              >
                BACK TO DASHBOARD
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}