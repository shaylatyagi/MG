// frontend/src/pages/PaymentLinkPage.jsx
// Public payment page — driver opens link sent by owner
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const API = 'https://mg-qw5s.onrender.com';

export default function PaymentLinkPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const returnStatus = searchParams.get('status'); // 'success' after PG redirect

  const [link, setLink]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying]   = useState(false);
  const [showQR, setShowQR]   = useState(null); // { qrLink, intentURL, amount }
  const [screen, setScreen]   = useState('loading'); // loading | pay | success | paid | expired | error
  const [phone, setPhone]     = useState('');
  const [name, setName]       = useState('');

  useEffect(() => {
    if (returnStatus === 'success') { setScreen('success'); setLoading(false); return; }
    fetch(`${API}/api/payment-links/${token}`)
      .then(r => r.json())
      .then(data => {
        setLoading(false);
        if (!data.success) { setScreen('error'); return; }
        setLink(data.link);
        if (data.alreadyPaid) setScreen('paid');
        else if (data.expired) setScreen('expired');
        else setScreen('pay');
      })
      .catch(() => { setLoading(false); setScreen('error'); });
  }, [token, returnStatus]);

  const handlePay = async (e) => {
    e.preventDefault();
    setPaying(true);
    try {
      const res = await fetch(`${API}/api/payment-links/${token}/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerPhone: phone, customerName: name }),
      });
      const data = await res.json();
      if (data.demo) { setScreen('success'); return; }
      const intentURL = data.intentURL;
      const qrLink    = data.upiQrLink;
      const isAndroid = /android/i.test(navigator.userAgent);
      if (isAndroid && intentURL) { window.location.href = intentURL; return; }
      if (qrLink || intentURL) { setShowQR({ qrLink, intentURL, amount: link?.amount }); return; }
      if (data.paymentUrl) { window.location.href = data.paymentUrl; return; }
      alert(data.message || 'Payment initiation failed');
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally { setPaying(false); }
  };

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  if (showQR) return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F4C81] to-[#0a3460] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl">
        <div className="w-10 h-10 bg-[#0F4C81] rounded-full flex items-center justify-center mx-auto mb-3">
          <span style={{color:'white',fontSize:18,fontWeight:900}}>₹</span>
        </div>
        <h3 className="font-black text-slate-800 text-base mb-1">Scan to Pay</h3>
        <p className="text-xs text-slate-500 mb-4">Open any UPI app and scan this QR code</p>
        {showQR.qrLink ? (
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(showQR.intentURL || showQR.qrLink)}`}
            alt="UPI QR Code"
            className="mx-auto rounded-xl border border-slate-100 mb-3"
            style={{width:200,height:200}}
          />
        ) : (
          <div className="bg-slate-100 rounded-xl p-3 text-xs text-slate-500 break-all mb-3">{showQR.intentURL}</div>
        )}
        {showQR.amount && (
          <p className="text-xs text-slate-500 mb-4">Amount: <span className="font-black text-slate-800">₹{Number(showQR.amount).toLocaleString('en-IN')}</span></p>
        )}
        <button onClick={() => setShowQR(null)} className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">
          Back
        </button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin w-8 h-8 border-4 border-[#0F4C81] border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F4C81] to-[#0a3460] flex flex-col items-center justify-center px-4 py-10">
      {/* Brand + Back */}
      <div className="w-full max-w-sm flex items-center mb-6 gap-3">
        <button onClick={() => window.history.length > 1 ? window.history.back() : window.close()}
          className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition text-white text-lg font-black">
          ←
        </button>
        <div className="flex items-center gap-2 flex-1 justify-center">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <span className="text-[#0F4C81] font-black text-lg">M</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">MobilityGrid</span>
        </div>
        <div className="w-9"/>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* SUCCESS */}
        {(screen === 'success') && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-500 text-sm">Your payment has been received. The fleet owner will be notified.</p>
          </div>
        )}

        {/* ALREADY PAID */}
        {screen === 'paid' && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✔️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Already Paid</h2>
            <p className="text-gray-500 text-sm">This payment link has already been settled.</p>
          </div>
        )}

        {/* EXPIRED */}
        {screen === 'expired' && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">⏰</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Link Expired</h2>
            <p className="text-gray-500 text-sm">This payment link has expired. Ask your fleet owner to send a new one.</p>
          </div>
        )}

        {/* ERROR */}
        {screen === 'error' && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">❌</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h2>
            <p className="text-gray-500 text-sm">This payment link does not exist or has been cancelled.</p>
          </div>
        )}

        {/* PAYMENT FORM */}
        {screen === 'pay' && link && (
          <>
            <div className="bg-[#0F4C81] px-6 py-5">
              <p className="text-blue-200 text-xs font-medium uppercase tracking-widest mb-1">Amount Due</p>
              <p className="text-4xl font-black text-white">{fmt(link.amount)}</p>
              <p className="text-blue-100 text-sm mt-1 truncate">{link.description}</p>
            </div>

            <form onSubmit={handlePay} className="p-6 space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-3 text-center">
                  Paying to <span className="font-semibold text-gray-600">Fleet Owner</span> via MobilityGrid
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Your Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  required placeholder={link.driver_name || 'Full Name'}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C81]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Mobile Number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  required maxLength={10} placeholder="10-digit mobile number"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C81]" />
              </div>

              <button type="submit" disabled={paying}
                className="w-full bg-[#0F4C81] text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 transition active:scale-95">
                {paying ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing…
                  </span>
                ) : `Pay ${fmt(link.amount)}`}
              </button>

              <p className="text-center text-xs text-gray-400">
                🔒 Secured by <span className="font-semibold text-gray-600">PayYantra</span>
              </p>
            </form>
          </>
        )}
      </div>

      <p className="text-blue-200 text-xs mt-6 opacity-70">MobilityGrid Fleet Management · Powered by PayYantra</p>
    </div>
  );
}
