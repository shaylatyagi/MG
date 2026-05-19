import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState('driver');

  const handleEnter = () => {
    localStorage.setItem('token', 'demo-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Demo User', role: role }));
    navigate(role === 'owner' ? '/owner/dashboard' : '/driver/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', width: '380px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '28px', fontWeight: '800', color: '#8B5E3C', letterSpacing: '2px', marginBottom: '4px' }}>Mobility Grid</div>
        <p style={{ fontSize: '13px', color: '#6B6B6B', marginBottom: '28px' }}>Smart EV Fleet Management</p>

        <div style={{ display: 'flex', backgroundColor: '#F3EDE5', borderRadius: '8px', padding: '4px', marginBottom: '24px' }}>
          <button
            style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer', backgroundColor: role === 'driver' ? '#8B5E3C' : 'transparent', color: role === 'driver' ? 'white' : '#6B6B6B' }}
            onClick={() => setRole('driver')}
          >Driver</button>
          <button
            style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer', backgroundColor: role === 'owner' ? '#8B5E3C' : 'transparent', color: role === 'owner' ? 'white' : '#6B6B6B' }}
            onClick={() => setRole('owner')}
          >Owner</button>
        </div>

        <button
          onClick={handleEnter}
          style={{ width: '100%', padding: '14px', backgroundColor: '#8B5E3C', color: 'white', borderRadius: '8px', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
        >
          Enter as {role === 'owner' ? 'Owner' : 'Driver'}
        </button>
      </div>
    </div>
  );
}