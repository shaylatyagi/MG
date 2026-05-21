import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // Step 1: Phone, Step 2: OTP
  const [phone, setPhone] = useState('9876542345'); // Default pre-filled
  const [otp, setOtp] = useState('123456'); // Default pre-filled
  const [role, setRole] = useState('driver'); // Toggle filter for demo
  const [loading, setLoading] = useState(false);

  // STEP 1: Jab user phone number daal kar Submit karega
  const handleSendOTP = (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Asli simulation lagane ke liye 1 second ka delay taaki dynamic lage
    setTimeout(() => {
      setLoading(false);
      setStep(2); // OTP wale step par bhej do
    }, 800);
  };

  // STEP 2: Jab user OTP verify karega
  const handleVerifyOTP = (e) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      
      // LocalStorage mein token sync taaki session barkarar rahe
      const mockUser = {
        phone_number: phone,
        name: "Shayla Tyagi",
        role: role // 'driver' ya 'owner' jo select kiya ho
      };
      
      localStorage.setItem('token', 'mock-uat-token-9876542345');
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      // Seamless dynamic navigation based on role selected
      if (role === 'owner') {
        navigate('/owner/dashboard');
      } else {
        navigate('/driver/dashboard');
      }
    }, 1000);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px' }}>
      <div style={{ background: '#ffffff', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', width: '100%', maxWIdth: '400px', border: '1px solid #E6DFD5' }}>
        
        {/* LOGO & TITLE */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontWeight: '800', color: '#111827', margin: '0 0 8px 0', fontSize: '28px', letterSpacing: '-0.5px' }}>
            ⚡ Mobility Grid
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
            {step === 1 ? 'Welcome back! Please enter your details.' : 'Enter the 6-digit code sent to your mobile.'}
          </p>
        </div>

        {/* ROLE SELECTION TOGGLE */}
        {step === 1 && (
          <div style={{ display: 'flex', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '8px', marginBottom: '24px' }}>
            <button 
              type="button"
              onClick={() => setRole('driver')}
              style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '6px', fontSize: '14px', backgroundColor: role === 'driver' ? '#111827' : 'transparent', color: role === 'driver' ? '#ffffff' : '#4B5563', transition: 'all 0.2s' }}
            >
              Driver Mode
            </button>
            <button 
              type="button"
              onClick={() => setRole('owner')}
              style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '6px', fontSize: '14px', backgroundColor: role === 'owner' ? '#111827' : 'transparent', color: role === 'owner' ? '#ffffff' : '#4B5563', transition: 'all 0.2s' }}
            >
              Fleet Owner Mode
            </button>
          </div>
        )}

        {/* STEP 1 FORM: PHONE NUMBER */}
        {step === 1 ? (
          <form onSubmit={handleSendOTP}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Phone Number</label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter 10-digit number"
                required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '16px', boxSizing: 'border-box' }}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              style={{ width: '100%', padding: '14px', backgroundColor: '#111827', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Sending OTP...' : 'Request OTP'}
            </button>
          </form>
        ) : (
          /* STEP 2 FORM: OTP VERIFICATION */
          <form onSubmit={handleVerifyOTP}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>One-Time Password (OTP)</label>
              <input 
                type="text" 
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '18px', letterSpacing: '4px', textAlign: 'center', boxSizing: 'border-box' }}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              style={{ width: '100%', padding: '14px', backgroundColor: '#10B981', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Verifying...' : 'Verify & Log In'}
            </button>
            <button 
              type="button" 
              onClick={() => setStep(1)}
              style={{ width: '100%', background: 'none', border: 'none', color: '#4B5563', fontSize: '14px', marginTop: '16px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Change Phone Number
            </button>
          </form>
        )}

      </div>
    </div>
  );
}