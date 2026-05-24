import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('9876542345');
  const [otp, setOtp] = useState('');
  const [role, setRole] = useState('driver');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/auth/send-otp', { phone_number: phone });
      setStep(2);
    } catch (err) {
      alert("Failed to send OTP. Please check your network.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/auth/verify-otp', { phone_number: phone, otp });
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      if (res.data.user.role === 'owner') {
        navigate('/owner/dashboard');
      } else {
        navigate('/driver/dashboard');
      }
    } catch (err) {
      alert("Verification failed: Check OTP or Server status.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px' }}>
      <div style={{ background: '#ffffff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', width: '100%', maxWidth: '360px', border: '1px solid #E6DFD5', boxSizing: 'border-box' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontWeight: '700', color: '#8B5E3C', margin: '0 0 6px 0', fontSize: '24px' }}>
            ⚡ Mobility Grid
          </h2>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
            {step === 1 ? 'Welcome back! Please enter your details.' : 'Enter the 6-digit code sent to your mobile.'}
          </p>
        </div>

        {step === 1 && (
          <div style={{ display: 'flex', backgroundColor: '#F3F4F6', padding: '3px', borderRadius: '6px', marginBottom: '20px' }}>
            <button 
              type="button"
              onClick={() => setRole('driver')}
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '13px', backgroundColor: role === 'driver' ? '#8B5E3C' : 'transparent', color: role === 'driver' ? '#ffffff' : '#4B5563', transition: 'all 0.15s' }}
            >
              Driver Mode
            </button>
            <button 
              type="button"
              onClick={() => setRole('owner')}
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '13px', backgroundColor: role === 'owner' ? '#8B5E3C' : 'transparent', color: role === 'owner' ? '#ffffff' : '#4B5563', transition: 'all 0.15s' }}
            >
              Owner Mode
            </button>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOTP}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B5E3C', marginBottom: '4px' }}>Phone Number</label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '15px', boxSizing: 'border-box' }}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              style={{ width: '100%', padding: '12px', backgroundColor: '#8B5E3C', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Sending OTP...' : 'Request OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#8B5E3C', marginBottom: '4px' }}>One-Time Password (OTP)</label>
              <input 
                type="text" 
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '16px', letterSpacing: '2px', textAlign: 'center', boxSizing: 'border-box' }}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              style={{ width: '100%', padding: '12px', backgroundColor: '#8B5E3C', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Verifying...' : 'Verify & Log In'}
            </button>
            <button 
              type="button" 
              onClick={() => setStep(1)}
              style={{ width: '100%', background: 'none', border: 'none', color: '#4B5563', fontSize: '12px', marginTop: '12px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}