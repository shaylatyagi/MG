import { useState, useEffect } from 'react';
import api from '../../api';
import AppShell from '../../components/AppShell';
import Card from '../../components/Card';
import Button from '../../components/Button';

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
    <AppShell title="Pay Rent" subtitle="Quickly settle dues with secure payment flows">
      <div className="flex flex-col gap-4 p-4 pb-24">

      {/* Header */}
      <div className="hero-card hero-card--pay">
        <p className="hero-card__label">PAY RENT</p>
        <p className="text-3xl font-black mb-1">{fmt(outstanding)}</p>
        <p className="hero-card__footnote">
          {outstanding > 0 ? 'Outstanding balance' : 'All paid for today ✓'}
        </p>

        {wallet?.vehicle && (
          <div className="mt-3 pt-3 border-t border-white/20 flex justify-between text-xs opacity-75">
            <span>Vehicle: <strong>{wallet.vehicle.reg_number}</strong></span>
            <span>Daily: <strong>{fmt(rentDue)}</strong></span>
          </div>
        )}
      </div>

      {/* Amount input */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-bold text-gray-700 mb-3">Enter Amount</p>

        {/* Quick amount chips */}
        {outstanding > 0 && (
          <div className="chip-group">
            {[outstanding, outstanding / 2, 100, 200, 500]
              .filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
              .slice(0, 4)
              .map((v) => (
                <button key={v}
                  onClick={() => setAmount(String(v))}
                  className={`chip ${parseFloat(amount) === v ? 'chip--active' : ''}`}>
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
            className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-xl font-black text-gray-900 focus:outline-none focus:border-indigo-600"
          />
        </div>

        {error && (
          <div className="mt-2 bg-red-50 text-red-600 text-xs p-2 rounded-lg">{error}</div>
        )}
      </div>

      {/* Wallet info */}
      <div className="pay-summary">
        <div className="pay-summary__item">
          <p className="pay-summary__label">Wallet Balance</p>
          <p className="pay-summary__value">{fmt(wallet?.wallet_balance)}</p>
        </div>
        <div className="pay-summary__item">
          <p className="pay-summary__label">Paid Today</p>
          <p className="pay-summary__value">{fmt(paidToday)}</p>
        </div>
        <div className="pay-summary__item">
          <p className="pay-summary__label">Outstanding</p>
          <p className={`pay-summary__value ${outstanding > 0 ? 'pay-summary__value--negative' : 'pay-summary__value--positive'}`}>
            {fmt(outstanding)}
          </p>
        </div>
      </div>

      {/* Pay button */}
      <Button
        onClick={initiatePayment}
        disabled={paying || !amount || parseFloat(amount) <= 0}
        className="w-full"
        variant="primary"
      >
        {paying ? '⏳ Opening Payment…' : `Pay ${amount ? fmt(parseFloat(amount)) : '₹0.00'} via UPI / Card`}
      </Button>

      <div className="flex items-center justify-center gap-2 opacity-50">
        <span className="text-xs text-gray-500">Secured by</span>
        <span className="text-xs font-bold text-gray-600">PayYantra</span>
        <span className="text-xs text-gray-500">🔒</span>
      </div>

      </div>
    </AppShell>
  );
}
