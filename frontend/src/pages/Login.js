import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Lock, ArrowRight, User, Building2, Truck, Shield } from 'lucide-react';
import api from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [tempToken, setTempToken] = useState('');
  const [usercode, setUsercode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { identifier, password });
      
      if (response.data.requireRoleSelection) {
        setAvailableRoles(response.data.data.availableRoles);
        setTempToken(response.data.token);
        setUsercode(response.data.data.usercode);
        setShowRoleSelector(true);
      } else {
        const { token, data } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(data));
        
        // Role-based redirect
        const roleRoutes = {
          'PLATFORM_ADMIN': '/admin/dashboard',
          'VEHICLE_OWNER_USER': '/owner/dashboard',
          'VEHICLE_DRIVER': '/driver/dashboard'
        };
        navigate(roleRoutes[data.userType] || '/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = async (role) => {
    try {
      const response = await api.post('/auth/select-role', 
        { usercode, selectedRole: role },
        { headers: { Authorization: `Bearer ${tempToken}` } }
      );
      
      localStorage.setItem('token', response.data.token);
      
      const roleRoutes = {
        'PLATFORM_ADMIN': '/admin/dashboard',
        'VEHICLE_OWNER_USER': '/owner/dashboard',
        'VEHICLE_DRIVER': '/driver/dashboard'
      };
      navigate(roleRoutes[role]);
      
    } catch (err) {
      setError('Role selection failed');
    }
  };

  // Role Selection Screen
  if (showRoleSelector) {
    const roleIcons = {
      'PLATFORM_ADMIN': <Shield className="w-6 h-6" />,
      'VEHICLE_OWNER_USER': <Building2 className="w-6 h-6" />,
      'VEHICLE_DRIVER': <Truck className="w-6 h-6" />
    };
    
    const roleNames = {
      'PLATFORM_ADMIN': 'Platform Admin',
      'VEHICLE_OWNER_USER': 'Vehicle Owner',
      'VEHICLE_DRIVER': 'Driver'
    };
    
    const roleDescs = {
      'PLATFORM_ADMIN': 'Manage tenants, users, and platform operations',
      'VEHICLE_OWNER_USER': 'Manage fleet, vehicles, drivers, and earnings',
      'VEHICLE_DRIVER': 'Access wallet, payments, and trip management'
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-[500px] bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Select Your Role</h2>
            <p className="text-blue-100 text-sm mt-1">
              Multiple roles found for {identifier.includes('_') ? usercode : identifier}
            </p>
          </div>
          
          <div className="p-6 space-y-3">
            {availableRoles.map((role) => (
              <button
                key={role}
                onClick={() => handleRoleSelect(role)}
                className="w-full bg-slate-50 hover:bg-blue-50 text-slate-800 font-semibold py-4 rounded-xl transition-all text-left px-4 border border-slate-200 hover:border-blue-300 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {roleIcons[role]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{roleNames[role]}</span>
                      <span className="text-blue-600 group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{roleDescs[role]}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Login Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">MobilityGrid</h1>
          <p className="text-blue-100 text-sm mt-1">
            Login with Usercode or Mobile Number
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Usercode or Mobile Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g., OWN_ABC123_5678 or 9876543210"
                className="w-full pl-9 pr-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              💡 Tip: Use usercode to login directly to a specific role
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-9 pr-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-xs text-slate-500 mt-4">
            New user? Contact your fleet manager for credentials
          </p>
        </form>
      </div>
    </div>
  );
}