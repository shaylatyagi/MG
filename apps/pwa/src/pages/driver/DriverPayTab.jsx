import { useState, useEffect } from 'react';
import api from '../../api';

const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// stages: idle | loading_wallet | confirm | paying | error
export default function DriverPayTab() {
  const [stage, setStage]     = useState('loading_wallet');
  const [wallet, setWallet]   = useState(null);
  const [amount, setAmount]   = useState('');
  const [error, setError]     = useState('');
  const [paying, setPaying]   = useState(false);

  const loadWallet = async () => {
    setStage('loading_wallet');
    setError('');
    try {
      const res  = await api.get('/api/driver/wallet');
      const body = res.data?.data ?? res.data;
      setWallet(body);
      // Pre-fill with outstanding dues
      const rent = parseFloat(body?.vehicle?.rent_amount || 0);
      const paid = parseFloat(body?.paid_today || 0);
      const due  = Math.max(0, rent - paid);
      setAmount(due > 0 ? String(due) : '');
      setStage('idle');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load dues');
      setStage('error');
    }
  };

  useEffect(() => { loadWallet(); }, []);

  const initiatePayment = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setPaying(true);
    setError('');
    try {
      const res  = await api.post('/api/driver/pay/initiate', { amount: numAmount });
      const body = res.data;
      if (!body.success || !body.payment_url) {
        throw new Error(body.message || 'No payment URL returned');
      }
      // Redirect to PayYantra payment page
      window.location.href = body.payment_url;
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Payment failed to start');
      setPaying(false);
    }
  };

  const rentDue    = wallet?.vehicle ? parseFloat(wallet.vehicle.rent_amount || 0) : 0;
  const paidToday  = parseFloat(wallet?.paid_today || 0);
  const outstanding = Math.max(0, rentDue - paidToday);

  // Loading state
  if (stage === 'loading_wallet') return (
    <div className="flex flex-col gap-3 p-4">
      {[...Array(2)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">

      {/* Header */}
      <div className="rounded-2xl p-5 text-white shadow-lg"
           style={{ background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)' }}>
        <p className="text-xs font-semibold tracking-wide mb-1" style={{ opacity: 0.8 }}>PAY RENT</p>
        <p className="text-3xl font-black mb-1">{fmt(outstanding)}</p>
        <p className="text-xs" style={{ opacity: 0.75 }}>
          {outstanding > 0 ? 'Outstanding balance' : 'All paid for today ✓'}
        </p>

        {wallet?.vehicle && (
          <div className="mt-3 pt-3 border-t border-white/20 flex justify-between text-xs">
            <span style={{ opacity: 0.8 }}>Vehicle: <strong>{wallet.vehicle.reg_number}</strong></span>
            <span style={{ opacity: 0.8 }}>Daily: <strong>{fmt(rentDue)}</strong></span>
          </div>
        )}
      </div>

      {/* Amount input */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-bold text-gray-700 mb-3">Enter Amount</p>

        {/* Quick amount chips */}
        {outstanding > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {[outstanding, outstanding / 2, 100, 200, 500]
              .filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
              .slice(0, 4)
              .map((v) => (
                <button key={v}
                  onClick={() => setAmount(String(v))}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    backgroundColor: parseFloat(amount) === v ? '#8B5E3C' : 'white',
                    color:           parseFloat(amount) === v ? 'white'    : '#8B5E3C',
                    borderColor:     '#8B5E3C',
                  }}>
                  {fmt(v)}
                </button>
              ))}
          </div>
        )}

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400">₹</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-xl font-black text-gray-900 focus:outline-none focus:border-amber-700"
          />
        </div>

        {error && (
          <div className="mt-2 bg-red-50 text-red-600 text-xs p-2 rounded-lg">{error}</div>
        )}
      </div>

      {/* Wallet info */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex justify-between">
        <div className="text-center">
          <p className="text-[10px] text-amber-600 mb-0.5">Wallet Balance</p>
          <p className="text-sm font-black text-amber-800">{fmt(wallet?.wallet_balance)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-amber-600 mb-0.5">Paid Today</p>
          <p className="text-sm font-black text-amber-800">{fmt(paidToday)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-amber-600 mb-0.5">Outstanding</p>
          <p className="text-sm font-black" style={{ color: outstanding > 0 ? '#DC2626' : '#16A34A' }}>
            {fmt(outstanding)}
          </p>
        </div>
      </div>

      {/* Pay button */}
      <button
        onClick={initiatePayment}
        disabled={paying || !amount || parseFloat(amount) <= 0}
        className="w-full py-4 rounded-2xl font-black text-base text-white shadow-md transition-opacity"
        style={{
          backgroundColor: '#16A34A',
          opacity: (paying || !amount || parseFloat(amount) <= 0) ? 0.6 : 1,
          cursor:  (paying || !amount || parseFloat(amount) <= 0) ? 'not-allowed' : 'pointer',
        }}>
        {paying
          ? '⏳ Opening Payment…'
          : `Pay ${amount ? fmt(parseFloat(amount)) : '₹0.00'} via UPI / Card`}
      </button>

      <div className="flex items-center justify-center gap-2 opacity-50">
        <span className="text-xs text-gray-500">Secured by</span>
        <span className="text-xs font-bold text-gray-600">PayYantra</span>
        <span className="text-xs text-gray-500">🔒</span>
      </div>

    </div>
  );
}
