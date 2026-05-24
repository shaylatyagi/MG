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

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Receipt_${orderId || 'Payment'}`,
    onBeforeGetContent: () => {
      setStopTimer(true); // Print dabte hi timer ruk jayega
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
        setError(err.response?.data?.message || err.message || 'Failed to fetch payment result');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

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
  const local = orderData?.local || {};
  const external = orderData?.pyData || orderData?.external || orderData?.data || {}; 
  const raw = orderData?.raw || {};
  
  const status = local.transaction_status || external.status || external.transactionStatus || statusParam || 'PENDING';
  const isSuccess = String(status).trim().toLowerCase() === 'success';
  
  const amount = local.order_amount || external.amount;
  const currency = local.currency || external.currency || 'INR';
  
  const pspTxnId = local.pg_transaction_id || external.transactionId || external.transactionPublicId || raw.txnId || 'N/A';
  const referenceNumber = local.bank_reference_no || external.rrn || external.bankReferenceNo || raw.rrn || 'N/A';
  
  const rawJSON = JSON.stringify(orderData, null, 2);

  // Mobile App Styled Field Row
  const fieldRow = (label, value) => (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-slate-500 text-xs font-medium">{label}</span>
      <span className="text-slate-800 text-xs font-bold text-right max-w-[60%] truncate">{value || 'N/A'}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        
        {loading ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-sm font-bold text-slate-500 tracking-widest">VERIFYING PAYMENT...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
            </div>
            <p className="text-red-600 text-center font-bold mb-6">{error}</p>
            <div className="bg-red-50 rounded-2xl p-4 mb-6">
              {fieldRow('Order Ref', orderId)}
              {fieldRow('Status', statusParam || 'UNKNOWN')}
            </div>
            <button onClick={goToDashboard} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl text-sm transition">
              BACK TO DASHBOARD
            </button>
          </div>
        ) : (
          <div className="w-full">
            
            {/* PRINTABLE RECEIPT AREA */}
            <div ref={componentRef} className="bg-white rounded-3xl p-6 shadow-sm mb-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-emerald-400"></div>
              
              <div className="text-center mt-4 mb-6">
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 shadow-md ${isSuccess ? 'bg-emerald-100 text-emerald-500' : 'bg-red-100 text-red-500'}`}>
                  {isSuccess ? (
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  ) : (
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                  )}
                </div>
                <h1 className="text-2xl font-black text-slate-800">
                  {isSuccess ? 'Payment Completed' : 'Payment Status'}
                </h1>
                <p className={`text-sm font-bold tracking-widest mt-1 ${isSuccess ? 'text-emerald-600' : 'text-red-600'}`}>{status}</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                <p className="text-[10px] font-bold text-slate-400 mb-2 tracking-wider">TRANSACTION DETAILS</p>
                {fieldRow('Amount', `${currency} ${amount}`)}
                {fieldRow('Order ID', local.order_id || orderId)}
                {fieldRow('PG Txn ID', pspTxnId)}
                {fieldRow('Bank Ref / RRN', referenceNumber)}
                {fieldRow('Date', local.order_completion_date || local.created_at || 'N/A')}
              </div>

              {/* Developer Dropdown (Collapsed by default taaki app clean dikhe) */}
              <details className="group">
                <summary className="text-[10px] font-bold text-slate-400 tracking-wider cursor-pointer outline-none flex items-center gap-1">
                  SHOW FULL DEVELOPER LOGS 
                  <span className="transition group-open:rotate-180">▼</span>
                </summary>
                <div className="mt-3 bg-slate-900 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-[10px] text-emerald-400 font-mono whitespace-pre-wrap">{rawJSON}</pre>
                </div>
              </details>
            </div>

            {/* ACTION BUTTONS & TIMER */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <button onClick={handlePrint} className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold py-4 rounded-xl text-sm transition flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                  PRINT
                </button>
                <button onClick={goToDashboard} className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl text-sm transition shadow-lg">
                  DONE
                </button>
              </div>

              <div className="text-center h-5">
                {!stopTimer ? (
                  <p className="text-xs text-slate-500 font-medium animate-pulse">Auto-redirecting in {countdown}s...</p>
                ) : (
                  <p className="text-xs text-amber-600 font-bold">Timer paused for printing.</p>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}