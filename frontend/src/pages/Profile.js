import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../api';

export default function Profile() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const [name, setName] = useState(user.name || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleUpdate = async () => {
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.put('/api/auth/update-profile', { name });
      localStorage.setItem('user', JSON.stringify({ ...user, name: res.data.name }));
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', marginBottom: '8px' }}>My Profile</h1>
        <p style={{ fontSize: '13px', color: '#6B6B6B', marginBottom: '32px' }}>Update your personal information.</p>

        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', maxWidth: '500px', border: '1px solid #E8E0D5' }}>
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '6px', fontWeight: '500' }}>Phone Number</p>
            <p style={{ fontSize: '16px', color: '#1A1A1A', fontWeight: '600' }}>+91 {user.phone_number}</p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '6px', fontWeight: '500' }}>Role</p>
            <p style={{ fontSize: '16px', color: '#1A1A1A', fontWeight: '600', textTransform: 'capitalize' }}>{user.role}</p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '6px', fontWeight: '500' }}>Full Name</p>
            <input
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E8E0D5', fontSize: '14px', backgroundColor: '#FAF7F2', color: '#1A1A1A', boxSizing: 'border-box' }}
              value={name}
              onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
              placeholder="Your full name"
            />
          </div>

          {error && <p style={{ fontSize: '13px', color: '#DC2626', marginBottom: '12px' }}>{error}</p>}
          {success && <p style={{ fontSize: '13px', color: '#16A34A', marginBottom: '12px' }}>{success}</p>}

          <button
            onClick={handleUpdate}
            disabled={loading}
            style={{ width: '100%', padding: '14px', backgroundColor: '#8B5E3C', color: 'white', borderRadius: '8px', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}