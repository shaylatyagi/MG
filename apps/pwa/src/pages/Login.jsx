// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import AppShell from '../components/AppShell';
import Card from '../components/Card';
import Button from '../components/Button';

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
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await api.post('/api/auth/verify-otp', { phone_number: phone, otp });
      if (res.data.token) {
        login(res.data.token);
        navigate('/driver');
      }
    } catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  const s = {
    wrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 },
    mark: { width: 72, height: 72, borderRadius: 16, background: '#0f172a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' },
    card: { padding: 20, borderRadius: 16, background: '#fff', boxShadow: '0 6px 18px rgba(2,6,23,0.12)', color: '#0f172a' },
    input: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e6edf3', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
    btn: { width: '100%', padding: '14px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
    btnDisabled: { width: '100%', padding: '14px', background: '#c7d2fe', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700, cursor: 'not-allowed', fontFamily: 'inherit' }
  };

  return (
    <AppShell>
      <div style={s.wrap}>
        <div style={{
          position: 'fixed', inset: 0, opacity: 0.03,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px', pointerEvents: 'none'
        }} />

        <Card style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={s.mark}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>M</span>
            </div>
            <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>MobilityGrid</h1>
            <p style={{ color: 'rgba(148,163,184,0.8)', fontSize: 12, marginTop: 6, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              Driver Experience
            </p>
          </div>

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
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  style={s.input}
                />
              </div>

              <Button type="submit" disabled={loading || phone.length < 10}>
                {loading ? 'Sending…' : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyOtp}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Enter OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  placeholder="• • • • • •"
                  maxLength={6}
                  style={{ ...s.input, fontSize: 24, textAlign: 'center', letterSpacing: '0.4em', fontFamily: 'monospace', padding: '14px' }}
                />
              </div>

              <Button type="submit" disabled={loading || otp.length < 6}>
                {loading ? 'Verifying…' : 'Verify & Login'}
              </Button>
              <Button type="button" variant="secondary" className="mt-3" onClick={() => { setStep(1); setOtp(''); setSuccess(''); }}>
                ← Change Number
              </Button>
            </form>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

