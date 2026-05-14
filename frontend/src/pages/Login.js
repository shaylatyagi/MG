import React, { useState } from 'react';
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
  const sendOtp = async () => {
    if (phone.length !== 10) {
    setError('Enter a valid 10 digit phone number');
    return;
  }
  setStep('otp');
};
const verifyOtp = async () => {
  if (otp.length !== 6) {
    setError('Enter the 6 digit OTP');
    return;
  }
  if (role === 'owner') {
    navigate('/owner/dashboard');
  } else {
    navigate('/driver/dashboard');
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
            onClick={() => setRole('driver')}
          >
            Driver
          </button>
          <button
            style={{ ...styles.toggleBtn, ...(role === 'owner' ? styles.toggleActive : {}) }}
            onClick={() => setRole('owner')}
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
                type="number"
                placeholder="9999999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
              />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.btn} onKeyDown={(e) => e.key === 'Enter' && verifyOtp()} disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </>
        ) : (
          <>
            <p style={styles.label}>Enter the OTP sent to +91 {phone}</p>
            <input
              style={styles.otpInput}
              type="number"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.btn} onClick={verifyOtp} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <p style={styles.resend} onClick={() => setStep('phone')}>
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
  },
  card: {
    backgroundColor: 'var(--white)',
    borderRadius: '16px',
    padding: '40px',
    width: '380px',
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
  },
  otpInput: {
    width: '100%',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '24px',
    letterSpacing: '8px',
    textAlign: 'center',
    backgroundColor: 'var(--bg)',
    color: 'var(--text-primary)',
    marginBottom: '16px',
  },
  btn: {
    width: '100%',
    padding: '14px',
    backgroundColor: 'var(--bronze)',
    color: 'var(--white)',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
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