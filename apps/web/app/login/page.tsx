'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveAdminToken, getAdminToken } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://mg-qw5s.onrender.com';
const DEV = process.env.NODE_ENV !== 'production';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [phone, setPhone] = useState('');
  const [secret, setSecret] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-redirect if already logged in
  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role === 'admin' && payload.exp * 1000 > Date.now()) {
        router.replace('/admin/dashboard');
      }
    } catch { /* invalid token — stay on login */ }
  }, [router]);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/admin-send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, admin_secret: secret }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to send OTP');
      // Dev: auto-fill bypass OTP
      if (DEV) setOtp('000000');
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/admin-verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, otp, admin_secret: secret }),
      });
      const data = await res.json();
      if (!data.success || !data.token) throw new Error(data.message || 'Verification failed');
      saveAdminToken(data.token, secret);
      router.push('/admin/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-white text-2xl font-bold tracking-tight">MobilityGrid</h1>
          <p className="text-slate-400 text-sm mt-1">Platform Admin Access</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl">
          {step === 'credentials' ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <h2 className="text-slate-900 text-lg font-semibold">Sign in</h2>
                <p className="text-slate-500 text-sm mt-0.5">Enter your admin credentials</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Admin Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  required
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Admin Secret Key
                </label>
                <input
                  type="password"
                  value={secret}
                  onChange={e => setSecret(e.target.value)}
                  placeholder="Admin secret key"
                  required
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || phone.length !== 10 || !secret}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Sending OTP…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div>
                <h2 className="text-slate-900 text-lg font-semibold">Enter OTP</h2>
                <p className="text-slate-500 text-sm mt-0.5">
                  Sent to +91 {phone}
                  {DEV && <span className="ml-1 text-xs text-green-600">(dev: use 000000)</span>}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">6-digit OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
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
                onClick={() => { setStep('credentials'); setOtp(''); setError(''); }}
                className="w-full text-sm text-slate-500 hover:text-slate-700"
              >
                ← Back
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
