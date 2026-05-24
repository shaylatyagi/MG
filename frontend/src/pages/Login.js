import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // FIXED: Details hardcoded taaki user ko type na karna pade
  const phone = '9876542345';
  const otp = '123456';
  const [role, setRole] = useState('owner');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/auth/send-otp', { phone_number: phone });
      setStep(2);
    } catch (err) {
      alert("Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/auth/verify-otp', { phone_number: phone, otp: otp });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate(res.data.user.role === 'owner' ? '/owner/dashboard' : '/driver/dashboard');
    } catch (err) {
      alert("Verification failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px' }}>
      <div style={{ background: '#ffffff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', width: '100%', maxWidth: '360px', border: '1px solid #E6DFD5' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontWeight: '700', color: '#8B5E3C', fontSize: '24px' }}>⚡ Mobility Grid</h2>
          <p style={{ fontSize: '13px', color: '#6B7280' }}>{step === 1 ? 'Click to request OTP' : 'Click to verify automatically'}</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendOTP}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B5E3C', marginBottom: '4px' }}>Phone Number (Auto-filled)</label>
              <input disabled value={phone} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#F9F9F9' }} />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#8B5E3C', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
              {loading ? 'Sending...' : 'Request OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B5E3C', marginBottom: '4px' }}>OTP (Auto-filled)</label>
              <input disabled value={otp} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#F9F9F9', textAlign: 'center', fontSize: '16px' }} />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#8B5E3C', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
              {loading ? 'Verifying...' : 'Verify & Log In'}
            </button>
            <button type="button" onClick={() => setStep(1)} style={{ width: '100%', background: 'none', border: 'none', color: '#4B5563', marginTop: '12px', cursor: 'pointer', textDecoration: 'underline' }}>Back</button>
          </form>
        )}
      </div>
    </div>
  );
}