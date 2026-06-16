import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import OwnerApp from './pages/OwnerApp.jsx';
import DriverPWA from './pages/DriverPWA';
import Profile from './pages/Profile';
import PaymentResult from './pages/PaymentResult';
import PartnerHub from './pages/PartnerHub';
import PartnersPage from './pages/PartnersPage';
import AdminPanel from './pages/admin/CompanyDashboard';
import PaymentLinkPage from './pages/PaymentLinkPage';
import ManagerApp from './pages/ManagerApp';

// PrivateRoute — redirects to /login if no token present
function PrivateRoute({ children, adminOnly }) {
  const token = localStorage.getItem('token') || localStorage.getItem('mg_admin_token');
  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && !localStorage.getItem('mg_admin_token')) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/partner" element={<PartnerHub />} />
        <Route path="/partners" element={<PartnersPage />} />
        <Route path="/partners/:slug" element={<PartnersPage />} />
        <Route path="/payment-result" element={<PaymentResult />} />
        {/* Payment Links — public, no auth required */}
        <Route path="/pay/:token" element={<PaymentLinkPage />} />

        {/* Protected routes */}
        <Route path="/owner/*" element={<PrivateRoute><OwnerApp /></PrivateRoute>} />
        <Route path="/driver/dashboard" element={<PrivateRoute><DriverPWA /></PrivateRoute>} />
        <Route path="/driver/*" element={<PrivateRoute><DriverPWA /></PrivateRoute>} />
        <Route path="/manager/*" element={<PrivateRoute><ManagerApp /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/admin/*" element={<PrivateRoute adminOnly><AdminPanel /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
