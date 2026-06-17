import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]           = useState(() => localStorage.getItem('token'));
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('mg_admin_token'));
  const [user, setUser]             = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });

  const login = (newToken, newUser, isAdmin = false) => {
    if (isAdmin) {
      localStorage.setItem('mg_admin_token', newToken);
      setAdminToken(newToken);
    } else {
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('mg_admin_token');
    setToken(null);
    setAdminToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, adminToken, user, login, logout, isAuthenticated: !!token || !!adminToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
