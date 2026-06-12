import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api';
import AppShell from '../../components/AppShell';
import Card from '../../components/Card';
import Button from '../../components/Button';

const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ENTRY_LABEL = {
  PAYMENT:        { label: 'Payment',        color: '#16A34A' },
  CASH_PAYMENT:   { label: 'Cash Payment',   color: '#16A34A' },
  ADVANCE_CREDIT: { label: 'Advance Credit', color: '#16A34A' },
  REPAIR_CREDIT:  { label: 'Repair Credit',  color: '#16A34A' },
  INCENTIVE:      { label: 'Incentive',      color: '#16A34A' },
  REFUND:         { label: 'Refund',         color: '#16A34A' },
  DAILY_RENT:     { label: 'Daily Rent',     color: '#DC2626' },
  DAMAGE_CHARGE:  { label: 'Damage Charge',  color: '#DC2626' },
  PENALTY:        { label: 'Penalty',        color: '#DC2626' },
  DEPOSIT_CHARGE: { label: 'Deposit',        color: '#D97706' },
};

export default function DriverWalletTab() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const navigate              = useNavigate();
  const [params]              = useSearchParams();

  const payStatus = params.get('status');
  const payOrder  = params.get('orderId');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await api.get('/api/driver/wallet');
      const body = res.data?.data ?? res.data;
      setData(body);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex flex-col gap-3 p-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
      ))}
    </div>
  );

  if (error) return (
    <div className="p-4 text-center">
      <p className="text-red-500 text-sm mb-3">{error}</p>
      <button onClick={load}
        className="action-button rounded-xl px-4 py-2 text-sm font-semibold">
        Retry
      </button>
    </div>
  );

  const { wallet_balance, vehicle, paid_today, kyc_status, ledger = [] } = data || {};
  const rentDue     = vehicle ? parseFloat(vehicle.rent_amount || 0) : 0;
  const isPaid      = paid_today >= rentDue && rentDue > 0;
  const outstanding = Math.max(0, rentDue - (paid_today || 0));

  return (
    <AppShell title="Wallet Overview" subtitle="Everything you need to track payments, vehicle and KYC">
      <div className="page-section p-4 pb-24">

      {/* Payment return banner */}
      {payStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-2">
          <span className="text-lg">✅</span>
          <div>
            <p className="text-sm font-bold text-green-700">Payment successful!</p>
            {payOrder && <p className="text-xs text-green-600">Order #{payOrder}</p>}
          </div>
        </div>
      )}
      {payStatus === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-2">
          <span className="text-lg">❌</span>
          <p className="text-sm font-semibold text-red-700">Payment failed. Please try again.</p>
        </div>
      )}

      {/* Balance card */}
      <Card className="hero-card hero-card--wallet">
        <p className="hero-card__label">WALLET BALANCE</p>
        <p className="hero-card__amount">{fmt(wallet_balance)}</p>

        <div className="metric-grid">
          <div className="metric-card">
            <p className="metric-card__label">Today's Rent</p>
            <p className="metric-card__value">{fmt(rentDue)}</p>
          </div>
          <div className="metric-card">
            <p className="metric-card__label">Paid Today</p>
            <p className={`metric-card__value ${isPaid ? 'entry-amount--positive' : 'entry-amount--negative'}`}>
              {fmt(paid_today)}
            </p>
          </div>
          {outstanding > 0 && (
            <div className="metric-card">
              <p className="metric-card__label">Due</p>
              <p className="metric-card__value entry-amount--negative">{fmt(outstanding)}</p>
            </div>
          )}
        </div>
      </Card>

      {/* KYC nudge */}
      {kyc_status !== 'APPROVED' && (
        <div className="wallet-banner wallet-banner--clickable" onClick={() => navigate('/driver/kyc')}>
          <div className="wallet-banner__body">
            <span>⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">KYC {kyc_status}</p>
              <p className="wallet-banner__note">Tap to upload your documents</p>
            </div>
          </div>
          <span className="text-amber-600 font-bold text-lg">›</span>
        </div>
      )}

      {/* Vehicle */}
      {vehicle ? (
        <div className="vehicle-card">
          <div className="vehicle-card__head">
            <div>
              <p className="text-sm font-bold text-gray-800">Your Vehicle</p>
              <span className="status-pill status-pill--approved">ASSIGNED</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="vehicle-card__icon">🚗</div>
            <div className="vehicle-card__info">
              <p className="vehicle-card__title">{vehicle.reg_number}</p>
              <p className="vehicle-card__meta">
                {vehicle.type}{vehicle.model ? ` • ${vehicle.model}` : ''}
              </p>
            </div>
            <div className="vehicle-card__price">
              <p className="text-sm font-bold text-brand">{fmt(vehicle.rent_amount)}</p>
              <p className="text-[10px] text-gray-400">/{vehicle.rent_type?.toLowerCase()}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center">
          <p className="text-2xl mb-1">🚗</p>
          <p className="text-sm text-gray-400">No vehicle assigned yet</p>
        </div>
      )}

      {/* Pay CTA */}
      {outstanding > 0 && (
        <button onClick={() => navigate('/driver/pay')}
          className="action-button action-button--full rounded-2xl py-4 font-black text-base shadow-md">
          Pay {fmt(outstanding)} Now
        </button>
      )}

      {/* Ledger */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-bold text-gray-800 mb-3">Recent Transactions</p>

        {ledger.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No transactions yet</p>
        ) : ledger.map((entry) => {
          const meta  = ENTRY_LABEL[entry.entry_type] || { label: entry.entry_type, color: '#6B7280' };
          const isPos = parseFloat(entry.amount) > 0;
          return (
            <div key={entry.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-2.5">
                <div className={`entry-icon ${isPos ? 'entry-icon--positive' : 'entry-icon--negative'}`}>
                  {isPos ? '↑' : '↓'}
                </div>
                <div>
                  <p className="entry-label">{meta.label}</p>
                  {entry.description && (
                    <p className="entry-note">{entry.description}</p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`entry-amount ${isPos ? 'entry-amount--positive' : 'entry-amount--negative'}`}>
                  {isPos ? '+' : ''}{fmt(entry.amount)}
                </p>
                <p className="text-[10px] text-gray-400">
                  {new Date(entry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      </div>
    </AppShell>
  );
}
