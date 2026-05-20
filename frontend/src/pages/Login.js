import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const BACKEND = process.env.REACT_APP_BACKEND_URL || 'https://mg-qw5s.onrender.com';

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [role, setRole] = useState('driver');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // PAPA'S ADVANCED REQUIREMENT: 100% Automatic Zero-Click Login
  useEffect(() => {
    // Shuruat mein check karo agar pehle se login session hai
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (token && user) {
      navigate(user.role === 'owner' ? '/owner/dashboard' : '/driver/dashboard');
      return;
    }

    // AGAR LOGIN NAHI HAI, TOH AUTOMATICALLY LOCALSTORAGE MEIN ENTRY BANAO AUR REDIRECT KARO
    const mockUser = {
      phone_number: "9876542345",
      name: "Shayla Tyagi",
      role: "driver" // Default demo role
    };
    
    localStorage.setItem('token', 'mock-uat-token-9876542345');
    localStorage.setItem('user', JSON.stringify(mockUser));
    
    // Seedha driver wallet ya dashboard par jump kar jao instantly
    navigate('/driver/wallet'); 
  }, [navigate]);

  const showMessage = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
  };

  // Niche ka return content safe-side ke liye rakha hai, par user ko yeh dikhega hi nahi
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#8B5E3C' }}>
        <h2 style={{ fontWeight: '700' }}>Mobility Grid</h2>
        <p style={{ fontSize: '13px', color: '#6B6B6B' }}>Redirecting to dashboard securely...</p>
      </div>
    </div>
  );
}