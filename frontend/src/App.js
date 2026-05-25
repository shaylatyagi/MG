import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import OwnerApp from './pages/OwnerApp';
import DriverPWA from './pages/DriverPWA';
import Profile from './pages/Profile';
import PaymentResult from './pages/PaymentResult';
import CompanyDashboard from './pages/admin/CompanyDashboard';
import PartnerHub from './pages/PartnerHub';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/driver/dashboard" element={<DriverPWA />} />
        <Route path="/login" element={<Login />} />
        <Route path="/owner/*" element={<OwnerApp />} />
        <Route path="/driver/*" element={<DriverPWA />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/payment-result" element={<PaymentResult />} />
        <Route path="/admin" element={<CompanyDashboard />} />
        <Route path="/partner" element={<PartnerHub />} />
      </Routes>
    </Router>
  );
}

export default App;