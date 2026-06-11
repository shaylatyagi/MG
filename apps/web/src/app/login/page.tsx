'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAdminToken } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://newmg.onrender.com';

type Step = 'login' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep]         = useState<Step>('login');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPass, setShowPass] = useState(false);

  // ── Primary login: phone + password ───────────────────────────────────────
  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, password }),
      });
      const data = await res.json();
      if (!data.success || !data.token) throw new Error(data.message || data.error?.message || 'Login failed');
      saveAdminToken(data.token);
      router.push('/admin/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password: send OTP ──────────────────────────────────────────────
  const sendOtp = async () => {
    if (phone.length !== 10) { setError('Enter your phone number first'); return; }
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/admin-send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to send OTP');
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP verify ────────────────────────────────────────────────────────────
  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/admin-verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, otp }),
      });
      const data = await res.json();
      if (!data.success || !data.token) throw new Error(data.message || 'Verification failed');
      saveAdminToken(data.token);
      router.push('/admin/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: '#4f46e5', boxShadow: '0 6px 20px rgba(79,70,229,0.4)' }}
          >
            <span className="text-white font-black text-xl">M</span>
          </div>
          <h1 className="text-white text-xl font-black tracking-tight">MobilityGrid</h1>
          <p className="text-slate-400 text-xs mt-1 tracking-widest uppercase">Platform Admin</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          {step === 'login' ? (
            <form onSubmit={login} className="space-y-4">
              <div>
                <h2 className="text-slate-900 text-lg font-semibold">Sign in</h2>
                <p className="text-slate-500 text-sm mt-0.5">Admin access only</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    tabIndex={-1}
                  >
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || phone.length !== 10 || !password}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

              <button
                type="button"
                onClick={sendOtp}
                disabled={loading}
                className="w-full text-xs text-indigo-500 hover:text-indigo-700 mt-1 py-1"
              >
                Forgot password? Sign in with OTP →
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div>
                <h2 className="text-slate-900 text-lg font-semibold">Enter OTP</h2>
                <p className="text-slate-500 text-sm mt-0.5">Sent to +91 {phone}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">6-digit OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Verifying…' : 'Verify & Sign In'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('login'); setOtp(''); setError(''); }}
                className="w-full text-sm text-slate-500 hover:text-slate-700"
              >
                ← Back to password login
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          MobilityGrid by PayYantra · Confidential
        </p>
      </div>
    </div>
  );
}
