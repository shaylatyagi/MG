import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Building2, Shield, Phone, Send, ArrowRight } from 'lucide-react';

const API = 'https://mg-qw5s.onrender.com';

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState('select-role');
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpValue, setOtpValue] = useState('');  // editable otp input
  const [resendTimer, setResendTimer] = useState(0);

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
    { type: 'driver',  name: 'Driver',         icon: <Truck className="w-8 h-8" />,    bgColor: 'from-emerald-500 to-teal-600',   redirect: '/driver/dashboard' },
    { type: 'owner',   name: 'Vehicle Owner',   icon: <Building2 className="w-8 h-8" />, bgColor: 'from-blue-500 to-indigo-600',   phone: '9876542345', redirect: '/owner/dashboard' },
    { type: 'admin',   name: 'Platform Admin',  icon: <Shield className="w-8 h-8" />,   bgColor: 'from-purple-500 to-pink-600',   phone: '9999999999', redirect: '/admin' }
  ];

  // ── Timer ─────────────────────────────────────────────────────────
  const startResendTimer = () => {
    setResendTimer(30);
    const t = setInterval(() => {
      setResendTimer(prev => { if (prev <= 1) { clearInterval(t); return 0; } return prev - 1; });
    }, 1000);
  };

  // ── Send OTP (owner/admin) ─────────────────────────────────────────
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
        setOtpValue(data.otp || '');           // autofill
        setSuccess(`OTP: ${data.otp}`);        // screen pe dikhao
        setStep('verify-otp');
        startResendTimer();
      } else { setError(data.message || 'Failed'); }
    } catch { setError('Network error.'); }
    setLoading(false);
  };

  // ── Verify OTP (owner/admin) ───────────────────────────────────────
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
        navigate(selectedRole.redirect);
      } else { setError(data.message || 'OTP galat hai'); }
    } catch { setError('Network error.'); }
    setLoading(false);
  };

  // ── Send OTP (driver) ──────────────────────────────────────────────
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
        setOtpValue(data.otp || '');           // autofill
        setSuccess(`OTP: ${data.otp}`);        // screen pe dikhao
        setStep('driver-verify-otp');
        startResendTimer();
      } else { setError(data.message || 'Failed'); }
    } catch { setError('Network error.'); }
    setLoading(false);
  };

  // ── Verify OTP (driver) ────────────────────────────────────────────
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

  const handleBack = () => {
    setStep('select-role'); setSelectedRole(null);
    setSelectedDriver(null); setError(''); setSuccess(''); setOtpValue('');
  };

  // ── Error/Success helper ───────────────────────────────────────────
  const AlertBox = () => (
    <>
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-semibold">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700 font-bold">{success}</div>}
    </>
  );

  // ====================== ROLE SELECTION ======================
  if (step === 'select-role') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-3xl font-bold text-white">MG</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800">MobilityGrid</h1>
            <p className="text-slate-500 mt-2">Select your role to continue</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {roles.map((role) => (
              <button key={role.type} onClick={() => handleRoleSelect(role)}
                className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all text-center border-2 border-transparent hover:border-blue-200">
                <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${role.bgColor} flex items-center justify-center text-white mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  {role.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-800">{role.name}</h3>
                <p className="text-slate-400 text-sm mt-2">Click to continue →</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ====================== DRIVER LIST ======================
  if (step === 'select-driver') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className={`bg-gradient-to-r ${selectedRole.bgColor} p-6 text-center`}>
            <h2 className="text-xl font-bold text-white">Select Driver</h2>
            <p className="text-white/80 text-sm mt-1">Choose your profile to login</p>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {drivers.length === 0 ? (
              <div className="text-center py-8 text-gray-500"><p>Loading drivers...</p></div>
            ) : (
              <div className="space-y-2">
                {drivers.map((driver) => (
                  <button key={driver.id} onClick={() => handleDriverSelect(driver)}
                    className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-gray-800 text-lg">{driver.full_name}</div>
                        <div className="text-sm text-gray-500 font-mono">{driver.mobile_number}</div>
                        <div className="text-xs text-gray-400">Code: {driver.driver_code}</div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="p-4 border-t">
            <button onClick={handleBack} className="w-full text-center text-slate-500 text-sm py-2">← Back</button>
          </div>
        </div>
      </div>
    );
  }

  // ====================== DRIVER SEND OTP ======================
  if (step === 'driver-otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className={`bg-gradient-to-r ${selectedRole.bgColor} p-6 text-center`}>
            <h2 className="text-xl font-bold text-white">Login as Driver</h2>
            <p className="text-white/80 text-sm mt-1">{selectedDriver?.full_name}</p>
          </div>
          <div className="p-6 space-y-4">
            <AlertBox />
            <div>
              <label className="text-xs font-semibold text-slate-600">Mobile Number</label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={selectedDriver?.mobile_number || ''} readOnly
                  className="w-full pl-9 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-mono" />
              </div>
            </div>
            <button onClick={sendDriverOTP} disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? 'Sending...' : 'Send OTP'} <Send className="w-4 h-4" />
            </button>
            <button onClick={() => setStep('select-driver')} className="w-full text-center text-slate-500 text-sm">← Back to Drivers</button>
          </div>
        </div>
      </div>
    );
  }

  // ====================== DRIVER VERIFY OTP ======================
  if (step === 'driver-verify-otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className={`bg-gradient-to-r ${selectedRole.bgColor} p-6 text-center`}>
            <h2 className="text-xl font-bold text-white">Verify OTP</h2>
            <p className="text-white/80 text-sm mt-1">OTP sent to {selectedDriver?.mobile_number}</p>
          </div>
          <div className="p-6 space-y-4">
            <AlertBox />
            <input type="text" value={otpValue}
              onChange={e => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center text-2xl tracking-[0.5em] font-mono"
              placeholder="——————" maxLength={6} />
            <button onClick={verifyDriverOTP} disabled={loading || otpValue.length < 6}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify OTP'} <ArrowRight className="w-4 h-4" />
            </button>
            <div className="flex justify-between text-sm">
              <button onClick={() => setStep('driver-otp')} className="text-slate-500">← Back</button>
              <button onClick={sendDriverOTP} disabled={resendTimer > 0}
                className="text-blue-600 disabled:text-slate-400">
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====================== OWNER/ADMIN SEND OTP ======================
  if (step === 'send-otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className={`bg-gradient-to-r ${selectedRole.bgColor} p-6 text-center`}>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">{selectedRole.icon}</div>
            <h2 className="text-xl font-bold text-white">Login as {selectedRole.name}</h2>
          </div>
          <div className="p-6 space-y-4">
            <AlertBox />
            <div>
              <label className="text-xs font-semibold text-slate-600">Mobile Number</label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={selectedRole.phone} readOnly
                  className="w-full pl-9 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-mono" />
              </div>
            </div>
            <button onClick={sendOwnerOTP} disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? 'Sending...' : 'Send OTP'} <Send className="w-4 h-4" />
            </button>
            <button onClick={handleBack} className="w-full text-center text-slate-500 text-sm">← Back</button>
          </div>
        </div>
      </div>
    );
  }

  // ====================== OWNER/ADMIN VERIFY OTP ======================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className={`bg-gradient-to-r ${selectedRole.bgColor} p-6 text-center`}>
          <h2 className="text-xl font-bold text-white">Verify OTP</h2>
          <p className="text-white/80 text-sm mt-1">OTP sent to {selectedRole.phone}</p>
        </div>
        <div className="p-6 space-y-4">
          <AlertBox />
          <input type="text" value={otpValue}
            onChange={e => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center text-2xl tracking-[0.5em] font-mono"
            placeholder="——————" maxLength={6} />
          <button onClick={verifyOwnerOTP} disabled={loading || otpValue.length < 6}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? 'Verifying...' : 'Verify OTP'} <ArrowRight className="w-4 h-4" />
          </button>
          <div className="flex justify-between text-sm">
            <button onClick={() => setStep('send-otp')} className="text-slate-500">← Back</button>
            <button onClick={sendOwnerOTP} disabled={resendTimer > 0}
              className="text-blue-600 disabled:text-slate-400">
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}