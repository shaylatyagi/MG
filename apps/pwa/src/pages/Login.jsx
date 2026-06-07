// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [phone, setPhone]   = useState('');
  const [otp,   setOtp]     = useState('');
  const [step,  setStep]    = useState(1);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await api.post('/api/auth/send-otp', { phone });
      setStep(2);
    } catch (err) { setError(err.response?.data?.error?.message || err.message); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data } = await api.post('/api/auth/verify-otp', { phone, otp });
      login(data.token, data.user);
      navigate(data.user.role === 'manager' ? '/manager' : '/driver/wallet');
    } catch (err) { setError(err.response?.data?.error?.message || err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0F4C81] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#0F4C81] rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">M</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">MobilityGrid</h1>
          <p className="text-gray-400 text-sm mt-1">Driver & Manager App</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {step === 1 ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              required placeholder="Mobile number" maxLength={10}
              className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C81]" />
            <button type="submit" disabled={loading}
              className="w-full bg-[#0F4C81] text-white py-3 rounded-xl font-medium disabled:opacity-50">
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <p className="text-sm text-center text-gray-500">OTP sent to +91 {phone}</p>
            <input type="text" value={otp} onChange={e => setOtp(e.target.value)}
              required placeholder="Enter OTP" maxLength={6}
              className="w-full px-4 py-3 border rounded-xl text-sm text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-[#0F4C81]" />
            <button type="submit" disabled={loading}
              className="w-full bg-[#0F4C81] text-white py-3 rounded-xl font-medium disabled:opacity-50">
              {loading ? 'Verifying…' : 'Login'}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-400">← Back</button>
          </form>
        )}
      </div>
    </div>
  );
}
