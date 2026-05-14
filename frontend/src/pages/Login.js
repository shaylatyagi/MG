import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone');
  const [role, setRole] = useState('driver');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  // OTP input ke liye reference create kar rahe hain
  const otpInputRef = useRef(null);

  // Jaise hi step 'otp' hoga, apne aap OTP wale dabbe par focus chala jayega
  useEffect(() => {
    if (step === 'otp' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  const sendOtp = async () => {
    setError('');
    if (!/^\d{10}$/.test(phone)) {
      setError('Enter a valid 10 digit phone number');
      return;
    }

    setLoading(true);
    try {
      // API call yahan aayegi jab backend ready ho
      // await axios.post('/api/send-otp', { phone, role });
      await new Promise(resolve => setTimeout(resolve, 500)); 
      setStep('otp');
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError('');
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter a valid 6 digit OTP');
      return;
    }

    setLoading(true);
    try {
      // API call yahan aayegi jab backend ready ho
      // await axios.post('/api/verify-otp', { phone, otp, role });
      await new Promise(resolve => setTimeout(resolve, 500)); 
      
      if (role === 'owner') {
        navigate('/owner/dashboard');
      } else {
        navigate('/driver/dashboard');
      }
    } catch (err) {
      setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNumericInput = (e, setter, max) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= max) {
      setter(value);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>Mobility Grid</div>
        <p style={styles.tagline}>Smart EV Fleet Management</p>

        <div style={styles.toggle}>
          <button
            style={{ ...styles.toggleBtn, ...(role === 'driver' ? styles.toggleActive : {}) }}
            onClick={() => { setRole('driver'); setError(''); }}
          >
            Driver
          </button>
          <button
            style={{ ...styles.toggleBtn, ...(role === 'owner' ? styles.toggleActive : {}) }}
            onClick={() => { setRole('owner'); setError(''); }}
          >
            Owner
          </button>
        </div>

        {step === 'phone' ? (
          <>
            <p style={styles.label}>Enter your phone number</p>
            <div style={styles.inputWrapper}>
              <span style={styles.prefix}>+91</span>
              <input
                style={styles.input}
                type="tel"
                placeholder="9999999999"
                value={phone}
                onChange={(e) => handleNumericInput(e, setPhone, 10)}
                onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
                autoFocus
              />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.btn} onClick={sendOtp} disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </>
        ) : (
          <>
            <p style={styles.label}>Enter the OTP sent to +91 {phone}</p>
            <input
              ref={otpInputRef}
              style={styles.otpInput}
              type="tel"
              placeholder="123456"
              value={otp}
              onChange={(e) => handleNumericInput(e, setOtp, 6)}
              onKeyDown={(e) => e.key === 'Enter' && verifyOtp()}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.btn} onClick={verifyOtp} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <p style={styles.resend} onClick={() => { setStep('phone'); setOtp(''); setError(''); }}>
              Change number
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px', 
    boxSizing: 'border-box',
  },
  card: {
    backgroundColor: 'var(--white)',
    borderRadius: '16px',
    padding: '32px 24px', 
    width: '100%', 
    maxWidth: '400px', 
    boxSizing: 'border-box', 
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  logo: {
    fontSize: '28px',
    fontWeight: '800',
    color: 'var(--bronze)',
    letterSpacing: '2px',
    marginBottom: '4px',
  },
  tagline: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '28px',
  },
  toggle: {
    display: 'flex',
    backgroundColor: '#F3EDE5',
    borderRadius: '8px',
    padding: '4px',
    marginBottom: '24px',
  },
  toggleBtn: {
    flex: 1,
    padding: '8px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  toggleActive: {
    backgroundColor: 'var(--bronze)',
    color: 'var(--white)',
  },
  label: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '10px',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    backgroundColor: 'var(--bg)',
    boxSizing: 'border-box', 
  },
  prefix: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginRight: '8px',
  },
  input: {
    flex: 1,
    fontSize: '16px', 
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    border: 'none',
    outline: 'none',
    width: '100%',
  },
  otpInput: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '22px', 
    letterSpacing: '6px', 
    textAlign: 'center',
    backgroundColor: 'var(--bg)',
    color: 'var(--text-primary)',
    marginBottom: '16px',
    outline: 'none',
  },
  btn: {
    width: '100%',
    padding: '14px',
    backgroundColor: 'var(--bronze)',
    color: 'var(--white)',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  error: {
    color: 'var(--danger)',
    fontSize: '13px',
    marginBottom: '12px',
  },
  resend: {
    textAlign: 'center',
    marginTop: '16px',
    fontSize: '13px',
    color: 'var(--bronze)',
    cursor: 'pointer',
  },
};