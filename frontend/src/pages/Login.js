import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Building2, Shield, Phone, Send, ArrowRight, ChevronLeft } from 'lucide-react';

const API = 'https://mg-qw5s.onrender.com';
const ADMIN_SECRET = process.env.REACT_APP_ADMIN_SECRET || '';

// Shell defined OUTSIDE Login so it's not recreated on every keystroke (fixes input focus loss)
const Shell = ({ children, showBack, onBack, title, subtitle }) => (
  <div style={{
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px 16px', fontFamily: "'Inter', -apple-system, sans-serif"
  }}>
    <div style={{ position: 'fixed', inset: 0, opacity: 0.03,
      backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
      backgroundSize: '40px 40px', pointerEvents: 'none' }} />
    <div style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ width: '52px', height: '52px', background: '#4f46e5', borderRadius: '14px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '14px', boxShadow: '0 8px 24px rgba(79,70,229,0.4)' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '22px', letterSpacing: '-1px' }}>M</span>
        </div>
        <div>
          <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>MobilityGrid</h1>
          <p style={{ color: 'rgba(148,163,184,0.8)', fontSize: '12px', marginTop: '4px', letterSpacing: '0.08em' }}>FLEET OPERATING SYSTEM</p>
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '28px 24px', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
        {showBack && (
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '4px',
            color: '#94a3b8', fontSize: '13px', background: 'none', border: 'none',
            cursor: 'pointer', padding: '0 0 16px', fontWeight: 600 }}>
            <span style={{ fontSize: '15px' }}>‹</span> Back
          </button>
        )}
        {title && (
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h2>
            {subtitle && <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  </div>
);

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState('select-role');
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [adminPhone, setAdminPhone] = useState('');

  useEffect(() => { fetchDrivers(); }, []);

  const fetchDrivers = async () => {
    try {
      const res = await fetch(`${API}/api/drivers/list`);
      const data = await res.json();
      setDrivers(data.drivers || []);
    } catch (err) {
      console.error('Error fetching drivers:', err);
    }
  };

  const roles = [
    { type: 'driver',  name: 'Driver',        icon: <Truck className="w-6 h-6" />,    redirect: '/driver/dashboard' },
    { type: 'owner',   name: 'Fleet Owner',   icon: <Building2 className="w-6 h-6" />, phone: '9876542345', redirect: '/owner/dashboard' },
    { type: 'admin',   name: 'Platform Admin', icon: <Shield className="w-6 h-6" />,   phone: '9999999999', redirect: '/admin' }
  ];

  const startResendTimer = () => {
    setResendTimer(30);
    const t = setInterval(() => {
      setResendTimer(prev => { if (prev <= 1) { clearInterval(t); return 0; } return prev - 1; });
    }, 1000);
  };

  const sendOwnerOTP = async () => {
    const phone = selectedRole.phone;
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone })
      });
      const data = await res.json();
      if (data.success) {
        setOtpValue(data.otp || '');
        setSuccess(`OTP: ${data.otp}`);
        setStep('verify-otp');
        startResendTimer();
      } else { setError(data.message || 'Failed'); }
    } catch { setError('Network error.'); }
    setLoading(false);
  };

  const verifyOwnerOTP = async () => {
    const phone = selectedRole.phone;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, otp: otpValue })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        const role = data.user?.role;
        if (role === 'MANAGER') navigate('/manager/dashboard');
        else if (selectedRole.type === 'admin') {
          localStorage.setItem('mg_admin_token', data.token);
          window.location.href = '/admin/dashboard';
        } else navigate(selectedRole.redirect);
      } else { setError(data.message || 'OTP galat hai'); }
    } catch { setError('Network error.'); }
    setLoading(false);
  };

  const sendDriverOTP = async () => {
    const phone = selectedDriver.mobile_number;
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone })
      });
      const data = await res.json();
      if (data.success) {
        setOtpValue(data.otp || '');
        setSuccess(`OTP: ${data.otp}`);
        setStep('driver-verify-otp');
        startResendTimer();
      } else { setError(data.message || 'Failed'); }
    } catch { setError('Network error.'); }
    setLoading(false);
  };

  const verifyDriverOTP = async () => {
    const phone = selectedDriver.mobile_number;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, otp: otpValue })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/driver/dashboard');
      } else { setError(data.message || 'OTP galat hai'); }
    } catch { setError('Network error.'); }
    setLoading(false);
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError(''); setSuccess(''); setOtpValue('');
    setStep(role.type === 'driver' ? 'select-driver' : 'send-otp');
  };

  const handleDriverSelect = (driver) => {
    setSelectedDriver(driver);
    setError(''); setSuccess(''); setOtpValue('');
    setStep('driver-otp');
  };

  const sendAdminOTP = async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/api/auth/admin-send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: adminPhone, admin_secret: ADMIN_SECRET })
      });
      const data = await res.json();
      if (data.success) {
        setOtpValue(data.otp || '');
        setSuccess(data.otp ? `OTP: ${data.otp}` : 'OTP sent');
        setStep('verify-otp');
        startResendTimer();
      } else { setError(data.message || 'Failed to send OTP'); }
    } catch { setError('Network error.'); }
    setLoading(false);
  };

  const verifyAdminOTP = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/admin-verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: adminPhone, otp: otpValue, admin_secret: ADMIN_SECRET })
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('mg_admin_token', data.token);
        window.location.href = '/admin/dashboard';
      } else { setError(data.message || 'Verification failed'); }
    } catch { setError('Network error.'); }
    setLoading(false);
  };

  const handleBack = () => {
    setStep('select-role'); setSelectedRole(null);
    setSelectedDriver(null); setError(''); setSuccess(''); setOtpValue('');
    setAdminPhone('');
  };

  // ── Shared layout shell ──────────────────────────────────────────────
  // ── Alert ─────────────────────────────────────────────────────────
  const Alert = () => (
    <div style={{ marginBottom: error || success ? '14px' : 0 }}>
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
          padding: '10px 14px', fontSize: '13px', color: '#dc2626', fontWeight: 600
        }}>{error}</div>
      )}
      {success && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px',
          padding: '10px 14px', fontSize: '13px', color: '#16a34a', fontWeight: 600
        }}>{success}</div>
      )}
    </div>
  );

  // ── Input ─────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '12px 14px 12px 42px',
    border: '1.5px solid #e2e8f0', borderRadius: '10px',
    fontSize: '14px', color: '#0f172a', background: '#f8fafc',
    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit'
  };

  const btnPrimary = {
    width: '100%', padding: '13px',
    background: '#4f46e5', color: '#fff',
    border: 'none', borderRadius: '10px',
    fontSize: '14px', fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '8px', fontFamily: 'inherit',
    transition: 'background 0.15s',
    boxSizing: 'border-box'
  };

  const btnDisabled = { ...btnPrimary, background: '#c7d2fe', cursor: 'not-allowed' };

  // ── Role Selection ──────────────────────────────────────────────────
  if (step === 'select-role') {
    return (
      <Shell>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Sign in</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Select your role to continue</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {roles.map((role) => (
            <button key={role.type} onClick={() => handleRoleSelect(role)} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 16px',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              background: '#fff',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'all 0.15s',
              fontFamily: 'inherit'
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.background = '#f5f3ff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: '#f5f3ff', color: '#4f46e5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                {role.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{role.name}</p>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0', fontWeight: 400 }}>
                  {role.type === 'driver' ? 'Access your wallet & payments' :
                   role.type === 'owner'  ? 'Manage your fleet & drivers' :
                                            'Platform administration'}
                </p>
              </div>
              <ArrowRight size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  // ── Driver List ──────────────────────────────────────────────────────
  if (step === 'select-driver') {
    return (
      <Shell showBack onBack={handleBack} title="Select Driver" subtitle="Choose your profile to continue">
        <div style={{ maxHeight: '340px', overflowY: 'auto', margin: '0 -4px', padding: '0 4px' }}>
          {drivers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '14px' }}>
              Loading drivers...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {drivers.map((driver) => (
                <button key={driver.id} onClick={() => handleDriverSelect(driver)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px',
                  border: '1.5px solid #e2e8f0', borderRadius: '10px',
                  background: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%',
                  fontFamily: 'inherit'
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.background = '#f5f3ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
                >
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{driver.full_name}</p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0', fontFamily: 'monospace' }}>{driver.mobile_number}</p>
                  </div>
                  <ArrowRight size={15} style={{ color: '#94a3b8' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </Shell>
    );
  }

  // ── Driver Send OTP ──────────────────────────────────────────────────
  if (step === 'driver-otp') {
    return (
      <Shell showBack onBack={() => setStep('select-driver')} title="Login as Driver" subtitle={selectedDriver?.full_name}>
        <Alert />
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
            Mobile Number
          </label>
          <div style={{ position: 'relative' }}>
            <Phone size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input type="text" value={selectedDriver?.mobile_number || ''} readOnly style={inputStyle} />
          </div>
        </div>
        <button onClick={sendDriverOTP} disabled={loading} style={loading ? btnDisabled : btnPrimary}>
          {loading ? 'Sending…' : 'Send OTP'} <Send size={14} />
        </button>
      </Shell>
    );
  }

  // ── Driver Verify OTP ───────────────────────────────────────────────
  if (step === 'driver-verify-otp') {
    return (
      <Shell showBack onBack={() => setStep('driver-otp')} title="Enter OTP" subtitle={`Sent to ${selectedDriver?.mobile_number}`}>
        <Alert />
        <input
          type="text"
          value={otpValue}
          onChange={e => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="• • • • • •"
          maxLength={6}
          style={{
            width: '100%', padding: '16px',
            border: '1.5px solid #e2e8f0', borderRadius: '12px',
            fontSize: '28px', textAlign: 'center', letterSpacing: '0.4em',
            fontFamily: 'monospace', color: '#0f172a',
            background: '#f8fafc', outline: 'none',
            marginBottom: '14px', boxSizing: 'border-box'
          }}
        />
        <button onClick={verifyDriverOTP} disabled={loading || otpValue.length < 6}
          style={loading || otpValue.length < 6 ? btnDisabled : btnPrimary}>
          {loading ? 'Verifying…' : 'Verify & Login'} <ArrowRight size={14} />
        </button>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
          <button onClick={sendDriverOTP} disabled={resendTimer > 0} style={{
            fontSize: '13px', color: resendTimer > 0 ? '#94a3b8' : '#4f46e5',
            background: 'none', border: 'none', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontFamily: 'inherit'
          }}>
            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
          </button>
        </div>
      </Shell>
    );
  }

  // ── Admin Send OTP ───────────────────────────────────────────────────
  if (step === 'send-otp' && selectedRole?.type === 'admin') {
    return (
      <Shell showBack onBack={handleBack} title="Platform Admin Login">
        <Alert />
        <div style={{ marginBottom: '18px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
            Admin Phone Number
          </label>
          <div style={{ position: 'relative' }}>
            <Phone size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="tel"
              value={adminPhone}
              onChange={e => setAdminPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              autoFocus
              style={inputStyle}
            />
          </div>
        </div>
        <button
          onClick={sendAdminOTP}
          disabled={loading || adminPhone.length < 10}
          style={loading || adminPhone.length < 10 ? btnDisabled : btnPrimary}
        >
          {loading ? 'Sending…' : 'Send OTP'} <Send size={14} />
        </button>
      </Shell>
    );
  }

  // ── Owner Send OTP ────────────────────────────────────────────────────
  if (step === 'send-otp') {
    return (
      <Shell showBack onBack={handleBack} title={`Login as ${selectedRole.name}`}>
        <Alert />
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
            Mobile Number
          </label>
          <div style={{ position: 'relative' }}>
            <Phone size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input type="text" value={selectedRole.phone} readOnly style={inputStyle} />
          </div>
        </div>
        <button onClick={sendOwnerOTP} disabled={loading} style={loading ? btnDisabled : btnPrimary}>
          {loading ? 'Sending…' : 'Send OTP'} <Send size={14} />
        </button>
      </Shell>
    );
  }

  // ── Admin Verify OTP ─────────────────────────────────────────────────
  if (step === 'verify-otp' && selectedRole?.type === 'admin') {
    return (
      <Shell showBack onBack={() => setStep('send-otp')} title="Enter OTP" subtitle={`Sent to ${adminPhone}`}>
        <Alert />
        <input
          type="text"
          value={otpValue}
          onChange={e => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="• • • • • •"
          maxLength={6}
          autoFocus
          style={{
            width: '100%', padding: '16px',
            border: '1.5px solid #e2e8f0', borderRadius: '12px',
            fontSize: '28px', textAlign: 'center', letterSpacing: '0.4em',
            fontFamily: 'monospace', color: '#0f172a',
            background: '#f8fafc', outline: 'none',
            marginBottom: '14px', boxSizing: 'border-box'
          }}
        />
        <button onClick={verifyAdminOTP} disabled={loading || otpValue.length < 6}
          style={loading || otpValue.length < 6 ? btnDisabled : btnPrimary}>
          {loading ? 'Verifying…' : 'Verify & Login'} <ArrowRight size={14} />
        </button>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
          <button onClick={sendAdminOTP} disabled={resendTimer > 0} style={{
            fontSize: '13px', color: resendTimer > 0 ? '#94a3b8' : '#4f46e5',
            background: 'none', border: 'none', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontFamily: 'inherit'
          }}>
            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
          </button>
        </div>
      </Shell>
    );
  }

  // ── Owner/Manager Verify OTP ─────────────────────────────────────────
  return (
    <Shell showBack onBack={() => setStep('send-otp')} title="Enter OTP" subtitle={`Sent to ${selectedRole?.phone}`}>
      <Alert />
      <input
        type="text"
        value={otpValue}
        onChange={e => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="• • • • • •"
        maxLength={6}
        style={{
          width: '100%', padding: '16px',
          border: '1.5px solid #e2e8f0', borderRadius: '12px',
          fontSize: '28px', textAlign: 'center', letterSpacing: '0.4em',
          fontFamily: 'monospace', color: '#0f172a',
          background: '#f8fafc', outline: 'none',
          marginBottom: '14px', boxSizing: 'border-box'
        }}
      />
      <button onClick={verifyOwnerOTP} disabled={loading || otpValue.length < 6}
        style={loading || otpValue.length < 6 ? btnDisabled : btnPrimary}>
        {loading ? 'Verifying…' : 'Verify & Login'} <ArrowRight size={14} />
      </button>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
        <button onClick={sendOwnerOTP} disabled={resendTimer > 0} style={{
          fontSize: '13px', color: resendTimer > 0 ? '#94a3b8' : '#4f46e5',
          background: 'none', border: 'none', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
          fontWeight: 600, fontFamily: 'inherit'
        }}>
          {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
        </button>
      </div>
    </Shell>
  );
}
