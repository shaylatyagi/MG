import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Login() {
  const navigate = useNavigate();
  const savedUser = JSON.parse(localStorage.getItem('user') || 'null');

  const [step, setStep] = useState(1);           // 1 = Phone, 2 = Name + OTP
  const [phone, setPhone] = useState(savedUser?.phone_number || '');
  const [name, setName] = useState(savedUser?.name || '');
  const [otp, setOtp] = useState('');
  const [role, setRole] = useState('driver');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const showMessage = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSendOTP = (e) => {
    e.preventDefault();
    if (phone.length !== 10) {
      showMessage("Please enter valid 10 digit phone number", true);
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setStep(2);
      setLoading(false);
    }, 800);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && savedUser) {
      if (savedUser.role === 'owner') {
        navigate('/owner/dashboard');
      } else {
        navigate('/driver/dashboard');
      }
    }
  }, [navigate, savedUser]);

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      showMessage("Please enter 6 digit OTP", true);
      return;
    }

    setLoading(true);

    setTimeout(() => {
      localStorage.setItem('token', 'demo-token');
      localStorage.setItem('user', JSON.stringify({
        name: name || 'Demo User',
        phone_number: phone,
        role: role
      }));
      setTimeout(() => {
        if (role === 'owner') {
          navigate('/owner/dashboard');
        } else {
          navigate('/driver/dashboard');
        }
      }, 800);

      setLoading(false);
    }, 1000);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#FAF7F2', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '16px', 
        padding: '40px', 
        width: '100%', 
        maxWidth: '380px', 
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)' 
      }}>
        
        <div style={{ fontSize: '28px', fontWeight: '800', color: '#8B5E3C', letterSpacing: '2px', marginBottom: '4px' }}>
          Mobility Grid
        </div>
        <p style={{ fontSize: '13px', color: '#6B6B6B', marginBottom: '28px' }}>Smart EV Fleet Management</p>

        {/* Role Selector */}
        <div style={{ display: 'flex', backgroundColor: '#F3EDE5', borderRadius: '8px', padding: '4px', marginBottom: '24px' }}>
          <button
            style={{
              flex: 1, padding: '10px', borderRadius: '6px', fontWeight: '500',
              border: 'none', cursor: 'pointer',
              backgroundColor: role === 'driver' ? '#8B5E3C' : 'transparent',
              color: role === 'driver' ? 'white' : '#6B6B6B'
            }}
            onClick={() => setRole('driver')}
          >
            Driver
          </button>
          <button
            style={{
              flex: 1, padding: '10px', borderRadius: '6px', fontWeight: '500',
              border: 'none', cursor: 'pointer',
              backgroundColor: role === 'owner' ? '#8B5E3C' : 'transparent',
              color: role === 'owner' ? 'white' : '#6B6B6B'
            }}
            onClick={() => setRole('owner')}
          >
            Owner
          </button>
        </div>

        {/* Message Box */}
        {message && (
          <div style={{
            padding: '12px',
            marginBottom: '20px',
            borderRadius: '8px',
            backgroundColor: message.isError ? '#f8d7da' : '#d4edda',
            color: message.isError ? '#721c24' : '#155724',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            {message.text}
          </div>
        )}

        {step === 1 ? (
          // Phone Number Step
          <form onSubmit={handleSendOTP}>
            <input
              type="tel"
              placeholder="Enter 10 Digit Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
              style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '16px', fontSize: '16px' }}
              required
            />
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', backgroundColor: '#8B5E3C', color: 'white', borderRadius: '8px', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        ) : (
          // OTP Step
          <form onSubmit={handleVerifyOTP}>
            <input
              type="text"
              placeholder="Enter Your Full Name"
              value={name}
              onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
              style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '12px', fontSize: '16px' }}
              required
            />

            <input
              type="text"
              placeholder="Enter 6 Digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px', fontSize: '16px' }}
              required
            />

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', backgroundColor: '#8B5E3C', color: 'white', borderRadius: '8px', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
            >
              {loading ? "Verifying OTP..." : "Verify OTP & Login"}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              style={{ marginTop: '12px', color: '#8B5E3C', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
            >
              ← Change Phone Number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}