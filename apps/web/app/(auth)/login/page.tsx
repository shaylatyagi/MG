// apps/web/app/(auth)/login/page.tsx — Unified OTP login per DevSpec §13.1
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api, { saveToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [phone,   setPhone]   = useState('');
  const [otp,     setOtp]     = useState('');
  const [step,    setStep]    = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/api/auth/send-otp', { phone });
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    } finally { setLoading(false); }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/api/auth/verify-otp', { phone, otp });
      saveToken(data.token);
      const role = data.user?.role;
      router.push(role === 'admin' ? '/admin/dashboard' : '/owner/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-xl font-bold">M</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MobilityGrid</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        {step === 1 ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                required placeholder="9876543210" maxLength={10}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-50">
              {loading ? 'Sending OTP…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <p className="text-sm text-gray-600 text-center">OTP sent to <strong>+91 {phone}</strong></p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
              <input
                type="text" value={otp} onChange={e => setOtp(e.target.value)}
                required maxLength={6} placeholder="6-digit OTP"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-center text-xl tracking-widest"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-50">
              {loading ? 'Verifying…' : 'Login'}
            </button>
            <button type="button" onClick={() => { setStep(1); setOtp(''); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700">
              ← Change number
            </button>
          </form>
        )}
        <p className="text-center text-xs text-gray-400 mt-6">MobilityGrid by PayYantra · Confidential</p>
      </div>
    </div>
  );
}
