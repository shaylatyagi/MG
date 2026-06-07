import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api';

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
        className="px-4 py-2 text-white rounded-xl text-sm font-semibold"
        style={{ backgroundColor: '#8B5E3C' }}>
        Retry
      </button>
    </div>
  );

  const { wallet_balance, vehicle, paid_today, kyc_status, ledger = [] } = data || {};
  const rentDue     = vehicle ? parseFloat(vehicle.rent_amount || 0) : 0;
  const isPaid      = paid_today >= rentDue && rentDue > 0;
  const outstanding = Math.max(0, rentDue - (paid_today || 0));

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">

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
      <div className="rounded-2xl p-5 text-white shadow-lg"
           style={{ background: 'linear-gradient(135deg, #7D5235 0%, #5C3A1E 100%)' }}>
        <p className="text-xs font-semibold tracking-wide mb-1" style={{ opacity: 0.75 }}>WALLET BALANCE</p>
        <p className="text-4xl font-black mb-4">{fmt(wallet_balance)}</p>

        <div className="flex gap-2">
          <div className="flex-1 rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <p className="text-[10px] mb-0.5" style={{ opacity: 0.75 }}>Today's Rent</p>
            <p className="text-sm font-bold">{fmt(rentDue)}</p>
          </div>
          <div className="flex-1 rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <p className="text-[10px] mb-0.5" style={{ opacity: 0.75 }}>Paid Today</p>
            <p className="text-sm font-bold" style={{ color: isPaid ? '#86EFAC' : '#FCA5A5' }}>
              {fmt(paid_today)}
            </p>
          </div>
          {outstanding > 0 && (
            <div className="flex-1 rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <p className="text-[10px] mb-0.5" style={{ opacity: 0.75 }}>Due</p>
              <p className="text-sm font-bold" style={{ color: '#FCA5A5' }}>{fmt(outstanding)}</p>
            </div>
          )}
        </div>
      </div>

      {/* KYC nudge */}
      {kyc_status !== 'APPROVED' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between"
             onClick={() => navigate('/driver/kyc')} style={{ cursor: 'pointer' }}>
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">KYC {kyc_status}</p>
              <p className="text-xs text-amber-600">Tap to upload your documents</p>
            </div>
          </div>
          <span className="text-amber-600 font-bold text-lg">›</span>
        </div>
      )}

      {/* Vehicle */}
      {vehicle ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-gray-800">Your Vehicle</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}>
              ASSIGNED
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                 style={{ backgroundColor: '#FDF3E8' }}>🚗</div>
            <div>
              <p className="text-base font-black text-gray-900">{vehicle.reg_number}</p>
              <p className="text-xs text-gray-500">
                {vehicle.type}{vehicle.model ? ` • ${vehicle.model}` : ''}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm font-bold" style={{ color: '#8B5E3C' }}>{fmt(vehicle.rent_amount)}</p>
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
          className="w-full py-4 rounded-2xl font-black text-base text-white shadow-md"
          style={{ backgroundColor: '#16A34A' }}>
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
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                     style={{ backgroundColor: isPos ? '#DCFCE7' : '#FEE2E2', color: isPos ? '#16A34A' : '#DC2626' }}>
                  {isPos ? '↑' : '↓'}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800">{meta.label}</p>
                  {entry.description && (
                    <p className="text-[10px] text-gray-400 truncate max-w-40">{entry.description}</p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold" style={{ color: meta.color }}>
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
  );
}
