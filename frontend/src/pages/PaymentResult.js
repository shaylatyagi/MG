import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(60);
  const [stopTimer, setStopTimer] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState(null);

  const componentRef = useRef();
  
  // Get params from URL
  const orderId = searchParams.get('orderId') || searchParams.get('ref');
  const statusParam = searchParams.get('status'); // Sirf display ke liye rakh rahe hain

  const goToDashboard = useCallback(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.userType === 'VEHICLE_OWNER_USER') {
      navigate('/owner/dashboard');
    } else {
      // Refresh flag ke sath bhej rahe hain taaki recent transactions update ho jaye
      navigate('/driver/dashboard?refresh=true');
    }
  }, [navigate]);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Receipt_${orderId || 'Payment'}`,
    onBeforeGetContent: () => setStopTimer(true),
  });

  // Fetch order details from msorders table via backend
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError('Order ID missing');
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`https://mg-qw5s.onrender.com/api/payment/order/${orderId}?status=${statusParam}`);
        const data = await res.json(); // Correctly parsed JSON
        
        console.log('📦 Real DB Order API Response:', data);
        
        // FIX: Used 'data' instead of 'res.data'
        // Aur backend (jo humne last step me banaya) 'data' key ke andar row bhejta hai
        if (data.success && data.data) {
          setOrderData(data.data);
        } else {
          setError('Order not found in records');
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to fetch payment details from server');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrder();
  }, [orderId]);

  // Auto redirect timer
  useEffect(() => {
    if (loading || stopTimer || error) return; // Error pe auto-redirect nahi karenge
    const timer = setTimeout(goToDashboard, countdown * 1000);
    const interval = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [loading, stopTimer, countdown, error, goToDashboard]);

  // STRICT DB CHECK: Fake verification hata di gayi hai
  const dbStatus = orderData?.transaction_status || orderData?.status;
  const isSuccess = dbStatus === 'SUCCESS' || dbStatus === 'Success';
  
  // Real DB amounts and refs
  const amount = orderData?.order_amount || orderData?.amount || 0;
  const referenceNumber = orderData?.bank_reference_no || orderData?.pg_transaction_id || orderId || 'N/A';
  const displayStatus = dbStatus || statusParam || 'PENDING'; // Fallback text if DB is slow

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        {loading ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-sm font-bold text-slate-500 tracking-widest">VERIFYING WITH DATABASE...</p>
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
          <div ref={componentRef} className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="flex justify-center mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-md ${
                isSuccess ? 'bg-emerald-100 text-emerald-500' : 'bg-red-100 text-red-500'
              }`}>
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
              {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
            </h1>
            <p className="text-center text-sm font-medium text-slate-500 mb-6 uppercase">
              {displayStatus}
            </p>

            <div className="bg-slate-50 rounded-2xl p-5 mb-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID</span>
                <span className="font-mono font-bold">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-bold">₹{amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reference No.</span>
                <span className="font-mono">{referenceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-mono">
                  {orderData?.order_completion_date 
                    ? new Date(orderData.order_completion_date).toLocaleString() 
                    : new Date().toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              {isSuccess && (
                <button onClick={handlePrint} className="flex-1 bg-blue-50 text-blue-700 font-bold py-4 rounded-2xl text-xs hover:bg-blue-100 transition">
                  PRINT RECEIPT
                </button>
              )}
              <button onClick={goToDashboard} className="flex-[2] bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl text-xs transition">
                DASHBOARD ({countdown}s)
              </button>
            </div>

            {!isSuccess && (
              <button 
                onClick={() => window.location.href = '/driver/dashboard'}
                className="w-full mt-3 text-center text-sm text-blue-600 font-medium"
              >
                ← Try Again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}