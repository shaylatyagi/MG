import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Truck, Building2, Shield, Phone, ArrowRight, Lock, Eye, EyeOff } from 'lucide-react';
import styles from './Login.module.css';
import { BrandLogo } from '../hooks/useBranding';

// Types
interface Role { type: string; name: string; icon: React.ReactNode; redirect: string; }

const API: string = process.env.REACT_APP_API_URL || 'https://mg-qw5s.onrender.com';

// ── Shell ─────────────────────────────────────────────────────────────────────
interface ShellProps {
  children: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
}

const Shell: React.FC<ShellProps> = ({ children, showBack, onBack, title, subtitle }) => (
  <div className={styles.shell}>
    <div className={styles.gridBg} />
    <div className={styles.shellContent}>
      <div className={styles.logoWrap}>
        <a href="https://mobilitygrid.in" style={{ display: 'block', cursor: 'pointer' }}>
          <BrandLogo variant="cyan" height={56} style={{ maxWidth: 320, display: 'block', margin: '0 auto' }} alt="MobilityGrid" />
        </a>
        <p className={styles.logoTagline}>FLEET OPERATING SYSTEM</p>
      </div>
      <div className={styles.card}>
        {showBack && (
          <button onClick={onBack} className={styles.backBtn}>
            <span>‹</span> Back
          </button>
        )}
        {title && (
          <div>
            <h2 className={styles.cardTitle}>{title}</h2>
            {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  </div>
);

export default function Login() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [step, setStep]                   = useState('select-role');
  const [selectedRole, setSelectedRole]   = useState(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');
  // PIN login
  const [phone, setPhone]                 = useState('');
  const [pin, setPin]                     = useState('');
  const [showPin, setShowPin]             = useState(false);
  // Forgot PIN / OTP reset
  const [otpValue, setOtpValue]           = useState('');
  const [newPin, setNewPin]               = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [resendTimer, setResendTimer]     = useState(0);
  // Change PIN on first login
  const [mustChangePIN, setMustChangePIN] = useState(false);
  const [changePin, setChangePin]         = useState('');
  const [changePinConfirm, setChangePinConfirm] = useState('');
  const [pendingToken, setPendingToken]   = useState('');
  const [pendingUser, setPendingUser]     = useState(null);
  const [pendingPath, setPendingPath]     = useState('');
  // Admin login
  const [adminPhone, setAdminPhone]       = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  // Passkey
  const [hasPasskey, setHasPasskey]       = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showEnrollSheet, setShowEnrollSheet]   = useState(false);
  const [enrolling, setEnrolling]               = useState(false);
  const pendingNav = useRef(null);
  // Owner self-signup
  const [signupName, setSignupName]           = useState('');
  const [signupPhone, setSignupPhone]         = useState('');
  const [signupEmail, setSignupEmail]         = useState('');
  const [signupCompany, setSignupCompany]     = useState('');
  const [signupOtp, setSignupOtp]             = useState('');
  const isAdminSubdomain = window.location.hostname === 'admin.mobilitygrid.in';
  const allRoles = [
    { type: 'driver', name: 'Driver',         icon: <Truck size={20} />,    redirect: '/driver/dashboard' },
    { type: 'owner',  name: 'Fleet Owner',    icon: <Building2 size={20} />, redirect: '/owner/dashboard' },
    { type: 'admin',  name: 'Platform Admin', icon: <Shield size={20} />,   redirect: '/admin' },
  ];

  // 3. For the main domain: show Driver & Owner only (hide Admin)
  const roles = isAdminSubdomain ? allRoles : allRoles.filter(r => r.type !== 'admin');

  // ── Auto-select role from URL param (?role=driver or ?role=owner) ──────────
  useEffect(function() {
    var params = new URLSearchParams(window.location.search);
    var roleParam = params.get('role');
    if (roleParam === 'driver') {
      var driverRole = roles.find(function(r) { return r.type === 'driver'; });
      if (driverRole) { setSelectedRole(driverRole); setStep('pin-login'); }
    } else if (roleParam === 'owner') {
      var ownerRole = roles.find(function(r) { return r.type === 'owner'; });
      if (ownerRole) {
        setSelectedRole(ownerRole);
        if (params.get('signup') === 'true') {
          setStep('owner-signup');
        } else {
          setStep('pin-login');
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
useEffect(() => {
  if (isAdminSubdomain) {
    setStep('admin-login');
    const adminRole = allRoles.find(r => r.type === 'admin');
    if (adminRole) setSelectedRole(adminRole);
  }
}, [isAdminSubdomain]);
  // ── Passkey check (silent, on phone change) ───────────────────────────────
  useEffect(function() {
    if (!selectedRole || selectedRole.type === 'admin') return;
    if (phone.length !== 10) { setHasPasskey(false); return; }
    var role = selectedRole.type === 'driver' ? 'DRIVER' : 'OWNER';
    fetch(API + '/api/auth/passkey/auth-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phone, role: role }),
    }).then(function(r) { return r.json(); })
      .then(function(d) { setHasPasskey(!!(d.success && d.hasPasskey)); })
      .catch(function() { setHasPasskey(false); });
  }, [phone, selectedRole]);

  // ── OTP resend timer ──────────────────────────────────────────────────────
  const startResendTimer = function() {
    setResendTimer(30);
    var t = setInterval(function() {
      setResendTimer(function(prev) {
        if (prev <= 1) { clearInterval(t); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── After successful login: offer passkey enrollment ─────────────────────
  const afterLogin = async function(token, user, path) {
    try {
      var r = await fetch(API + '/api/auth/passkey/auth-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: user.mobile_number, role: user.role }),
      });
      var d = await r.json();
      if (!d.hasPasskey) {
        pendingNav.current = { token, user, path };
        setShowEnrollSheet(true);
        return;
      }
    } catch {}
    authLogin(token, user);
    navigate(path);
  };

  // ── Passkey login ─────────────────────────────────────────────────────────
  const loginWithPasskey = async function() {
    setBiometricLoading(true); setError('');
    var role = selectedRole.type === 'driver' ? 'DRIVER' : 'OWNER';
    var path = selectedRole.redirect;
    try {
      var optRes  = await fetch(API + '/api/auth/passkey/auth-options', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, role: role }),
      });
      var optData = await optRes.json();
      if (!optData.success) { setError(optData.message || 'Passkey error'); setBiometricLoading(false); return; }
      var mod = await import('@simplewebauthn/browser');
      var assertion = await mod.startAuthentication(optData.options);
      var verRes  = await fetch(API + '/api/auth/passkey/auth-verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, role: role, assertion: assertion }),
      });
      var verData = await verRes.json();
      if (verData.success) {
        authLogin(verData.token, verData.user);
        navigate(path);
      } else { setError(verData.message || 'Biometric login failed'); }
    } catch (e) {
      if (e && e.name === 'NotAllowedError') setError('Biometric cancelled. Enter PIN instead.');
      else setError('Biometric error: ' + (e.message || 'unknown'));
    }
    setBiometricLoading(false);
  };

  // ── Passkey enroll ────────────────────────────────────────────────────────
  const enrollPasskey = async function() {
    if (!pendingNav.current) return;
    setEnrolling(true);
    var ref = pendingNav.current;
    try {
      authLogin(ref.token, ref.user);
      var optRes = await fetch(API + '/api/auth/passkey/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ref.token },
      });
      var optData = await optRes.json();
      if (!optData.success) throw new Error(optData.message);
      var mod = await import('@simplewebauthn/browser');
      var regResponse = await mod.startRegistration(optData.options);
      await fetch(API + '/api/auth/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ref.token },
        body: JSON.stringify(regResponse),
      });
    } catch (e) { console.warn('Enroll passkey:', e.message); }
    setEnrolling(false);
    setShowEnrollSheet(false);
    navigate(ref.path);
  };

  const skipEnroll = function() {
    if (!pendingNav.current) return;
    var ref = pendingNav.current;
    authLogin(ref.token, ref.user);
    setShowEnrollSheet(false);
    navigate(ref.path);
  };
/*
  // ── PIN Login ─────────────────────────────────────────────────────────────
  const loginWithPin = async function() {
    setLoading(true); setError('');
    var role = selectedRole.type === 'driver' ? 'DRIVER' : 'OWNER';
    try {
      var res  = await fetch(API + '/api/auth/login-pin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, pin: pin, role: role }),
      });
      var data = await res.json();
      if (data.success) {
        if (data.pin_must_change) {
          // Force PIN change before entering app
          setPendingToken(data.token);
          setPendingUser(data.user);
          setPendingPath(selectedRole.redirect);
          setStep('change-pin');
        } else {
          await afterLogin(data.token, data.user, selectedRole.redirect);
        }
      } else { setError(data.message || 'Login failed'); }
    } catch { setError('Network error. Try again.'); }
    setLoading(false);
  };
*/
const loginWithPin = async function() {
    setLoading(true); setError('');
    var role = selectedRole.type === 'driver' ? 'DRIVER' : 'OWNER';
    let gpsCoords = { latitude: null, longitude: null };
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) { reject(); return; }
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
      });
      gpsCoords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch {}
    try {
      
      var res = await fetch(API + '/api/auth/login-pin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, pin: pin, role: role }),
      });
      var data = await res.json();
      
      if (data.success) {
        // Yahan hum bypass force kar rahe hain:
        // Chahe backend kuch bhi bole, hum 'pin_must_change' ko false kar rahe hain
        data.pin_must_change = false; 

        if (data.pin_must_change) {
          setPendingToken(data.token);
          setPendingUser(data.user);
          setPendingPath(selectedRole.redirect);
          setStep('change-pin');
        } else {
          await afterLogin(data.token, data.user, selectedRole.redirect);
        }
      } else { 
        setError(data.message || 'Login failed'); 
      }
    } catch { 
      setError('Network error. Try again.'); 
    }
    setLoading(false);
  };
  // ── Force PIN change (first login) ────────────────────────────────────────
  const submitChangePin = async function() {
    if (changePin !== changePinConfirm) { setError('PINs do not match'); return; }
    if (changePin.length < 4 || changePin.length > 6 || !/^\d+$/.test(changePin)) {
      setError('PIN must be 4–6 digits'); return;
    }
    setLoading(true); setError('');
    try {
      var res  = await fetch(API + '/api/auth/set-pin', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + pendingToken },
        body: JSON.stringify({ new_pin: changePin }),
      });
      var data = await res.json();
      if (data.success) {
        await afterLogin(pendingToken, pendingUser, pendingPath);
      } else { setError(data.message || 'Failed to set PIN'); }
    } catch { setError('Network error'); }
    setLoading(false);
  };

  // ── Forgot PIN: send OTP ──────────────────────────────────────────────────
  const sendForgotOtp = async function() {
    setLoading(true); setError(''); setSuccess('');
    var role = selectedRole.type === 'driver' ? 'DRIVER' : 'OWNER';
    try {
      var res  = await fetch(API + '/api/auth/forgot-pin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, role: role }),
      });
      var data = await res.json();
      if (data.success) {
        var via = data.via === 'dev' ? 'DEV OTP: ' + data.otp
                : data.masked_email ? 'OTP sent to ' + data.masked_email
                : 'OTP sent';
        setSuccess(via);
        setStep('reset-pin');
        startResendTimer();
      } else if (data.contact_admin) {
        setStep('contact-admin');
        setError(data.message || 'Please contact admin.');
      } else { setError(data.message || 'Failed'); }
    } catch { setError('Network error'); }
    setLoading(false);
  };

  // ── Reset PIN with OTP ────────────────────────────────────────────────────
  const submitResetPin = async function() {
    if (newPin !== newPinConfirm) { setError('PINs do not match'); return; }
    if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      setError('PIN must be 4–6 digits'); return;
    }
    setLoading(true); setError('');
    var role = selectedRole.type === 'driver' ? 'DRIVER' : 'OWNER';
    try {
      var res  = await fetch(API + '/api/auth/reset-pin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, role: role, otp: otpValue, new_pin: newPin }),
      });
      var data = await res.json();
      if (data.success) {
        setSuccess('PIN reset! Logging you in…');
        setPin(newPin);
        setTimeout(async function() {
          setStep('pin-login');
          await loginWithPin();
        }, 800);
      } else { setError(data.message || 'Reset failed'); }
    } catch { setError('Network error'); }
    setLoading(false);
  };

  // ── Admin login ───────────────────────────────────────────────────────────
  const loginAdmin = async function() {
    setLoading(true); setError('');
    try {
      var res  = await fetch(API + '/api/auth/admin-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: adminPhone, password: adminPassword }),
      });
      var data = await res.json();
      if (data.success) {
        authLogin(data.token, null, true);
        navigate('/');
      } else { setError(data.message || 'Invalid credentials'); }
    } catch { setError('Network error'); }
    setLoading(false);
  };

  // ── Owner Signup ──────────────────────────────────────────────────────────
  const sendSignupOtp = async function() {
    setLoading(true); setError('');
    try {
      var res  = await fetch(API + '/api/auth/owner-signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: signupName, mobile_number: signupPhone, email: signupEmail, company_name: signupCompany }),
      });
      var data = await res.json();
      if (data.success) {
        setStep('owner-signup-otp');
        setSuccess('OTP sent to ' + signupEmail);
      } else { setError(data.message || 'Signup failed'); }
    } catch { setError('Network error'); }
    setLoading(false);
  };

  const verifySignupOtp = async function() {
    setLoading(true); setError('');
    try {
      var res  = await fetch(API + '/api/auth/owner-signup/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: signupName, mobile_number: signupPhone, email: signupEmail, company_name: signupCompany, otp: signupOtp }),
      });
      var data = await res.json();
      if (data.success) {
        authLogin(data.token, data.user);
        setPendingToken(data.token);
        setPendingUser(data.user);
        setPendingPath('/owner/dashboard');
        setChangePin(''); setChangePinConfirm('');
        setStep('change-pin');
        setSuccess('Account created! Please set your PIN.');
      } else { setError(data.message || 'Verification failed'); }
    } catch { setError('Network error'); }
    setLoading(false);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleRoleSelect = function(role) {
    setSelectedRole(role);
    setError(''); setSuccess(''); setPhone(''); setPin('');
    setHasPasskey(false);
    setStep(role.type === 'admin' ? 'admin-login' : 'pin-login');
  };

  const handleBack = function() {
    setStep('select-role'); setSelectedRole(null);
    setError(''); setSuccess(''); setPhone(''); setPin('');
    setAdminPhone(''); setAdminPassword('');
    setHasPasskey(false);
  };

  // ── Shared styles ─────────────────────────────────────────────────────────
  const Alert = function() {
    return (
      <div style={{ marginBottom: error || success ? '14px' : 0 }}>
        {error   && <div className={styles.alertError}>{error}</div>}
        {success && <div className={styles.alertSuccess}>{success}</div>}
      </div>
    );
  };

  // Styles are in Login.module.css — imported as `styles`

  // ── Passkey enroll sheet ──────────────────────────────────────────────────
  const EnrollSheet = function() {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 9999, padding: '0 16px' }}>
        <div style={{ background: 'var(--color-surface)', borderRadius: '20px 20px 0 0',
          padding: '28px 24px 40px', width: '100%', maxWidth: '440px',
          fontFamily: "'Inter', -apple-system, sans-serif" }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔐</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>Enable Biometric Login?</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Next time sign in instantly with fingerprint, Face ID, or device PIN — no need to type.
            </p>
          </div>
          <button onClick={enrollPasskey} disabled={enrolling}
            className={styles.btnPrimary}>
            {enrolling ? 'Setting up…' : 'Enable Biometrics'}
          </button>
          <button onClick={skipEnroll} disabled={enrolling}
            className={styles.btnPrimary}>
            Not now
          </button>
        </div>
      </div>
    );
  };

  // ── Role selection ────────────────────────────────────────────────────────
  if (step === 'select-role') {
    return (
      <Shell>
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <h2 className={styles.cardTitle}>Sign in</h2>
          <p className={styles.cardSubtitle} style={{ margin: 0 }}>Select your role to continue</p>
        </div>
        <div className={styles.roleGrid}>
          {roles.map(function(role) {
            return (
              <button key={role.type} onClick={function() { handleRoleSelect(role); }}
                className={styles.roleBtn}
              >
                <div className={styles.roleIcon}>{role.icon}</div>
                <div style={{ flex: 1 }}>
                  <p className={styles.roleName}>{role.name}</p>
                  <p className={styles.roleHint}>
                    {role.type === 'driver' ? 'Access your wallet & payments' :
                     role.type === 'owner'  ? 'Manage your fleet & drivers' : 'Platform administration'}
                  </p>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
        {showEnrollSheet && <EnrollSheet />}
      </Shell>
    );
  }

  // ── PIN login ─────────────────────────────────────────────────────────────
  if (step === 'pin-login') {
    var roleName = selectedRole ? selectedRole.name : '';
    var canLogin = phone.length === 10 && pin.length >= 4 && !loading;
    return (
      <Shell showBack onBack={handleBack} title={'Login as ' + roleName}>
        <Alert />
        {/* Phone */}
        <div style={{ marginBottom: '12px' }}>
          <label className={styles.label}>
            Mobile Number
          </label>
          <div className={styles.inputWrap}>
            <Phone size={15} className={styles.inputIcon} />
            <input type="tel" value={phone} autoFocus placeholder="10-Digit Mobile Number"
              className={styles.input}
              onChange={function(e) { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); }}
              onKeyDown={function(e) { if (e.key === 'Enter' && canLogin) loginWithPin(); }}
            />
          </div>
        </div>
        {/* PIN */}
        <div style={{ marginBottom: '6px' }}>
          <label className={styles.label}>
            PIN
          </label>
          <div className={styles.inputWrap}>
            <Lock size={15} className={styles.inputIcon} />
            <input type={showPin ? 'text' : 'password'} value={pin} placeholder="4–6 Digit PIN"
              maxLength={6} inputMode="numeric"
              className={styles.input}
              onChange={function(e) { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); }}
              onKeyDown={function(e) { if (e.key === 'Enter' && canLogin) loginWithPin(); }}
            />
            <button type="button" onClick={function() { setShowPin(function(p) { return !p; }); }}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}>
              {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        {/* Forgot PIN */}
        <div style={{ textAlign: 'right', marginBottom: '16px' }}>
          <button onClick={function() { setStep('forgot-pin'); setError(''); setSuccess(''); }}
            style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'none', border: 'none',
              cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
            Forgot PIN?
          </button>
        </div>
        {/* PIN button — always primary / top */}
        <button onClick={loginWithPin} disabled={!canLogin}
          className={styles.btnPrimary}>
          {loading ? 'Logging in…' : 'Login with PIN'}
          {!loading && <ArrowRight size={14} />}
        </button>
        {/* Biometric button — secondary, below PIN */}
        {hasPasskey && (
          <button onClick={loginWithPasskey} disabled={biometricLoading}
            className={styles.btnOutline}>
            <span style={{ fontSize: '18px' }}>{biometricLoading ? '⏳' : '🔐'}</span>
            {biometricLoading ? 'Checking…' : 'Use Face ID / Fingerprint'}
          </button>
        )}
        {showEnrollSheet && <EnrollSheet />}
        {/* New here? — Owner only */}
        {selectedRole && selectedRole.type === 'owner' && (
          <div className={styles.divider} style={{ textAlign: 'center', paddingTop: 'var(--space-4)' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>New here? </span>
            <button onClick={function() {
              setStep('owner-signup'); setError(''); setSuccess('');
              setSignupName(''); setSignupPhone(''); setSignupEmail(''); setSignupCompany(''); setSignupOtp('');
            }} style={{ fontSize: '13px', color: 'var(--color-primary)', background: 'none', border: 'none',
              cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
              Create account
            </button>
          </div>
        )}
      </Shell>
    );
  }

  // ── Change PIN (first login) ───────────────────────────────────────────────
  if (step === 'change-pin') {
    var canChange = changePin.length >= 4 && changePin === changePinConfirm && !loading;
    return (
      <Shell title="Set Your PIN" subtitle={step === 'change-pin' && signupName ? 'Almost done! Set a secure PIN to protect your account.' : 'Your admin set a temporary PIN. Please create your own.'}>
        <Alert />
        <div style={{ marginBottom: '12px' }}>
          <label className={styles.label}>
            New PIN (4–6 digits)
          </label>
          <div className={styles.inputWrap}>
            <Lock size={15} className={styles.inputIcon} />
            <input type="password" value={changePin} placeholder="Enter New PIN"
              maxLength={6} inputMode="numeric" autoFocus
              className={styles.inputOtp}
              onChange={function(e) { setChangePin(e.target.value.replace(/\D/g, '').slice(0, 6)); }}
            />
          </div>
        </div>
        <div style={{ marginBottom: '18px' }}>
          <label className={styles.label}>
            Confirm PIN
          </label>
          <div className={styles.inputWrap}>
            <Lock size={15} className={styles.inputIcon} />
            <input type="password" value={changePinConfirm} placeholder="Repeat New PIN"
              maxLength={6} inputMode="numeric"
              className={styles.inputOtp}
              onChange={function(e) { setChangePinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6)); }}
              onKeyDown={function(e) { if (e.key === 'Enter' && canChange) submitChangePin(); }}
            />
          </div>
        </div>
        <button onClick={submitChangePin} disabled={!canChange} className={styles.btnPrimary}>
          {loading ? 'Saving…' : 'Set PIN & Continue'} {!loading && <ArrowRight size={14} />}
        </button>
        {showEnrollSheet && <EnrollSheet />}
      </Shell>
    );
  }

  // ── Contact Admin screen ─────────────────────────────────────────────────
  if (step === 'contact-admin') {
    return (
      <Shell showBack onBack={function() { setStep('pin-login'); setError(''); setSuccess(''); }}
        title="Contact Admin" subtitle="PIN reset via OTP not available">
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <p style={{ color: 'var(--color-text)', fontWeight: 600, fontSize: '15px', marginBottom: '8px' }}>
            Self-service reset unavailable
          </p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', lineHeight: '1.6', marginBottom: '24px' }}>
            {error || 'Please contact the MobilityGrid admin to reset your PIN.'}
          </p>
          <div style={{ background: 'var(--color-primary-50)', border: '1px solid var(--color-sky-200)', borderRadius: '10px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '4px' }}>📞 Admin Contact</p>
            <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: 0 }}>Call or WhatsApp your fleet owner</p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>or email <strong>support@mobilitygrid.in</strong></p>
          </div>
          <button onClick={function() { setStep('pin-login'); setError(''); setSuccess(''); }}
            className={styles.btnPrimary}>
            Back to Login
          </button>
        </div>
      </Shell>
    );
  }

  // ── Forgot PIN: enter phone for OTP ───────────────────────────────────────
  if (step === 'forgot-pin') {
    var roleName2 = selectedRole ? selectedRole.name : '';
    return (
      <Shell showBack onBack={function() { setStep('pin-login'); setError(''); setSuccess(''); }}
        title="Forgot PIN" subtitle={'Enter your registered ' + roleName2 + ' mobile number'}>
        <Alert />
        <div style={{ marginBottom: '16px' }}>
          <label className={styles.label}>
            Mobile Number
          </label>
          <div className={styles.inputWrap}>
            <Phone size={15} className={styles.inputIcon} />
            <input type="tel" value={phone} autoFocus placeholder="10-Digit Mobile Number"
              className={styles.input}
              onChange={function(e) { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); }}
              onKeyDown={function(e) { if (e.key === 'Enter' && phone.length === 10 && !loading) sendForgotOtp(); }}
            />
          </div>
        </div>
        <button onClick={sendForgotOtp} disabled={loading || phone.length < 10}
          className={styles.btnPrimary}>
          {loading ? 'Sending…' : 'Send OTP'} <ArrowRight size={14} />
        </button>
      </Shell>
    );
  }

  // ── Reset PIN with OTP ────────────────────────────────────────────────────
  if (step === 'reset-pin') {
    var otpReady = otpValue.length === 6;
    var pinReady = newPin.length >= 4 && newPin === newPinConfirm;
    var canReset = otpReady && pinReady && !loading;
    return (
      <Shell showBack onBack={function() { setStep('forgot-pin'); setError(''); setSuccess(''); }}
        title="Reset PIN" subtitle={'OTP sent to ' + phone}>
        <Alert />
        <div style={{ marginBottom: '12px' }}>
          <label className={styles.label}>OTP</label>
          <input type="text" value={otpValue} autoFocus placeholder="6-digit OTP" maxLength={6}
            className={styles.inputOtp} style={{ paddingLeft: 14 }}
            onChange={function(e) { setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6)); }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label className={styles.label}>New PIN (4–6 digits)</label>
          <div className={styles.inputWrap}>
            <Lock size={15} className={styles.inputIcon} />
            <input type="password" value={newPin} placeholder="New PIN" maxLength={6} inputMode="numeric"
              className={styles.inputOtp}
              onChange={function(e) { setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6)); }}
            />
          </div>
        </div>
        <div style={{ marginBottom: '18px' }}>
          <label className={styles.label}>Confirm New PIN</label>
          <div className={styles.inputWrap}>
            <Lock size={15} className={styles.inputIcon} />
            <input type="password" value={newPinConfirm} placeholder="Repeat PIN" maxLength={6} inputMode="numeric"
              className={styles.inputOtp}
              onChange={function(e) { setNewPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6)); }}
              onKeyDown={function(e) { if (e.key === 'Enter' && canReset) submitResetPin(); }}
            />
          </div>
        </div>
        <button onClick={submitResetPin} disabled={!canReset} className={styles.btnPrimary}>
          {loading ? 'Resetting…' : 'Reset PIN & Login'} {!loading && <ArrowRight size={14} />}
        </button>
        <div style={{ textAlign: 'right', marginTop: 'var(--space-3)' }}>
          <button onClick={sendForgotOtp} disabled={resendTimer > 0}
            style={{ fontSize: '12px', color: resendTimer > 0 ? 'var(--color-text-muted)' : 'var(--color-primary)',
              background: 'none', border: 'none', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontFamily: 'inherit' }}>
            {resendTimer > 0 ? 'Resend in ' + resendTimer + 's' : 'Resend OTP'}
          </button>
        </div>
      </Shell>
    );
  }

  // ── Owner Self-Signup: Form ───────────────────────────────────────────────
  if (step === 'owner-signup') {
    var canSignup = signupName.trim().length > 1 && signupPhone.length === 10
      && signupEmail.includes('@') && !loading;
    return (
      <Shell showBack onBack={function() { setStep('pin-login'); setError(''); setSuccess(''); }}
        title="Create Owner Account" subtitle="Get started with MobilityGrid">
        <Alert />
        {/* Full Name */}
        <div style={{ marginBottom: '12px' }}>
          <label className={styles.label}>Full Name *</label>
          <input type="text" value={signupName} autoFocus placeholder="e.g. Rajesh Kumar" className={styles.input}
            onChange={function(e) { setSignupName(e.target.value); }} />
        </div>
        {/* Phone */}
        <div style={{ marginBottom: '12px' }}>
          <label className={styles.label}>Mobile Number *</label>
          <div className={styles.inputWrap}>
            <Phone size={15} className={styles.inputIcon} />
            <input type="tel" value={signupPhone} placeholder="10-Digit Mobile Number" className={styles.input} inputMode="numeric"
              onChange={function(e) { setSignupPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); }} />
          </div>
        </div>
        {/* Email */}
        <div style={{ marginBottom: '12px' }}>
          <label className={styles.label}>Email Address *</label>
          <input type="email" value={signupEmail} placeholder="you@example.com" className={styles.input}
            onChange={function(e) { setSignupEmail(e.target.value); }}
            onKeyDown={function(e) { if (e.key === 'Enter' && canSignup) sendSignupOtp(); }} />
        </div>
        {/* Company (optional) */}
        <div style={{ marginBottom: '20px' }}>
          <label className={styles.label}>
            Company / Fleet Name <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span>
          </label>
          <input type="text" value={signupCompany} placeholder="e.g. Kumar Logistics" className={styles.input}
            onChange={function(e) { setSignupCompany(e.target.value); }}
            onKeyDown={function(e) { if (e.key === 'Enter' && canSignup) sendSignupOtp(); }} />
        </div>
        <button onClick={sendSignupOtp} disabled={!canSignup} className={styles.btnPrimary}>
          {loading ? 'Sending OTP…' : 'Send Verification OTP'} {!loading && <ArrowRight size={14} />}
        </button>
        <div className={styles.divider} style={{ textAlign: 'center', paddingTop: 'var(--space-4)' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Already have an account? </span>
          <button onClick={function() { setStep('pin-login'); setError(''); setSuccess(''); }}
            className={styles.btnGhost}>
            Sign in
          </button>
        </div>
      </Shell>
    );
  }

  // ── Owner Self-Signup: OTP Verify ─────────────────────────────────────────
  if (step === 'owner-signup-otp') {
    var canVerify = signupOtp.length === 6 && !loading;
    return (
      <Shell showBack onBack={function() { setStep('owner-signup'); setError(''); setSuccess(''); }}
        title="Verify Your Email" subtitle={'OTP sent to ' + signupEmail}>
        <Alert />
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: '1.6' }}>
          Enter the 6-digit code we sent to <strong style={{ color: 'var(--color-text)' }}>{signupEmail}</strong>
        </p>
        <div style={{ marginBottom: '20px' }}>
          <label className={styles.label}>OTP Code</label>
          <input type="text" value={signupOtp} autoFocus placeholder="6-Digit Code" className={styles.inputOtp}
            maxLength={6} inputMode="numeric"
            onChange={function(e) { setSignupOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); }}
            onKeyDown={function(e) { if (e.key === 'Enter' && canVerify) verifySignupOtp(); }} />
        </div>
        <button onClick={verifySignupOtp} disabled={!canVerify} className={styles.btnPrimary}>
          {loading ? 'Verifying…' : 'Verify & Create Account'} {!loading && <ArrowRight size={14} />}
        </button>
        <div style={{ textAlign: 'center', marginTop: '14px' }}>
          <button onClick={sendSignupOtp} disabled={loading}
            className={styles.btnGhost}>
            Resend OTP
          </button>
        </div>
      </Shell>
    );
  }

  // ── Admin login ───────────────────────────────────────────────────────────
  if (step === 'admin-login') {
    var adminReady = adminPhone.length === 10 && adminPassword.length > 0;
    return (
      <Shell showBack={!isAdminSubdomain} onBack={handleBack} title="Platform Admin Login">
        <Alert />
        <div style={{ marginBottom: '12px' }}>
          <label className={styles.label}>Admin Phone</label>
          <div className={styles.inputWrap}>
            <Phone size={15} className={styles.inputIcon} />
            <input type="tel" value={adminPhone} autoFocus placeholder="10-Digit Mobile Number"
              className={styles.input}
              onChange={function(e) { setAdminPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); }}
              onKeyDown={function(e) { if (e.key === 'Enter' && adminReady && !loading) loginAdmin(); }}
            />
          </div>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label className={styles.label}>Password</label>
          <div className={styles.inputWrap}>
            <input type={showAdminPass ? 'text' : 'password'} value={adminPassword} placeholder="••••••••"
              className={styles.input} style={{ paddingRight: 52 }}
              onChange={function(e) { setAdminPassword(e.target.value); }}
              onKeyDown={function(e) { if (e.key === 'Enter' && adminReady && !loading) loginAdmin(); }}
            />
            <button type="button" onClick={function() { setShowAdminPass(function(p) { return !p; }); }}
              style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: 600 }}>
              {showAdminPass ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <button onClick={loginAdmin} disabled={loading || !adminReady} className={styles.btnPrimary}>
          {loading ? 'Signing in…' : 'Sign In'} <ArrowRight size={14} />
        </button>
      </Shell>
    );
  }

  // ── Select role (default) ────────────────────────────────────────────────
  return (
    <Shell>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <h2 className={styles.cardTitle}>Sign in</h2>
        <p className={styles.cardSubtitle} style={{ margin: 0 }}>Select your role to continue</p>
      </div>
      <div className={styles.roleGrid}>
        {roles.map(function(role) {
          return (
            <button key={role.type} onClick={function() { handleRoleSelect(role); }}
              className={styles.roleBtn}
            >
              <div className={styles.roleIcon}>{role.icon}</div>
              <div style={{ flex: 1 }}>
                <p className={styles.roleName}>{role.name}</p>
                <p className={styles.roleHint}>
                  {role.type === 'driver' ? 'Access your wallet & payments' :
                   role.type === 'owner'  ? 'Manage your fleet & drivers' : 'Platform administration'}
                </p>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            </button>
          );
        })}
      </div>
      {showEnrollSheet && <EnrollSheet />}
    </Shell>
  );
}
