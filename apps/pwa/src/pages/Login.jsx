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
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await api.post('/api/auth/send-otp', { phone_number: phone });
      if (res.data.otp) setSuccess(`OTP: ${res.data.otp}`);
      setStep(2);
    } catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data } = await api.post('/api/auth/verify-otp', { phone_number: phone, otp });
      login(data.token, data.user);
      const role = (data.user.role || '').toUpperCase();
      navigate(role === 'OWNER' ? '/manager' : '/driver/wallet');
    } catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  const s = {
    wrap: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', fontFamily: "'Inter', -apple-system, sans-serif"
    },
    card: {
      background: '#fff', borderRadius: '20px', padding: '28px 24px',
      width: '100%', maxWidth: '360px',
      boxShadow: '0 24px 64px rgba(0,0,0,0.3)'
    },
    mark: {
      width: 48, height: 48, background: '#4f46e5', borderRadius: '12px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 12px', boxShadow: '0 6px 20px rgba(79,70,229,0.4)'
    },
    input: {
      width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0',
      borderRadius: '10px', fontSize: '14px', color: '#0f172a',
      background: '#f8fafc', outline: 'none', boxSizing: 'border-box',
      fontFamily: 'inherit'
    },
    btn: {
      width: '100%', padding: '13px', background: '#4f46e5', color: '#fff',
      border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
      cursor: 'pointer', fontFamily: 'inherit'
    },
    btnDisabled: {
      width: '100%', padding: '13px', background: '#c7d2fe', color: '#fff',
      border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
      cursor: 'not-allowed', fontFamily: 'inherit'
    }
  };

  return (
    <div style={s.wrap}>
      {/* Subtle grid */}
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: 360, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={s.mark}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>M</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>MobilityGrid</h1>
          <p style={{ color: 'rgba(148,163,184,0.8)', fontSize: 11, marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Driver App
          </p>
        </div>

        <div style={s.card}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
            {step === 1 ? 'Sign in' : 'Verify OTP'}
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
            {step === 1 ? 'Enter your registered mobile number' : `OTP sent to +91 ${phone}`}
          </p>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600, marginBottom: 14 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#16a34a', fontWeight: 600, marginBottom: 14 }}>
              {success}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={sendOtp}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Mobile Number</label>
                <input
                  type="tel" inputMode="numeric" pattern="[0-9]*"
                  value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required placeholder="10-digit mobile number" maxLength={10}
                  style={s.input}
                />
              </div>
              <button type="submit" disabled={loading || phone.length < 10}
                style={loading || phone.length < 10 ? s.btnDisabled : s.btn}>
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Enter OTP</label>
                <input
                  type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required placeholder="• • • • • •" maxLength={6}
                  style={{ ...s.input, fontSize: 24, textAlign: 'center', letterSpacing: '0.4em', fontFamily: 'monospace', padding: '14px' }}
                />
              </div>
              <button type="submit" disabled={loading || otp.length < 6}
                style={loading || otp.length < 6 ? s.btnDisabled : s.btn}>
                {loading ? 'Verifying…' : 'Verify & Login'}
              </button>
              <button type="button" onClick={() => { setStep(1); setOtp(''); setSuccess(''); }}
                style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', fontSize: 13, color: '#94a3b8', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                ← Change Number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
