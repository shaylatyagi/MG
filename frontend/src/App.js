import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import OwnerDashboard from './pages/OwnerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import ComingSoon from './pages/ComingSoon';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/owner/dashboard" element={<OwnerDashboard />} />
        <Route path="/driver/dashboard" element={<DriverDashboard />} />
        <Route path="/owner/vehicles" element={<ComingSoon page="My Vehicles" />} />
        <Route path="/owner/earnings" element={<ComingSoon page="Earnings & Payouts" />} />
        <Route path="/owner/compliance" element={<ComingSoon page="Compliance Vault" />} />
        <Route path="/owner/settings" element={<ComingSoon page="Fleet Settings" />} />
        <Route path="/driver/wallet" element={<ComingSoon page="My Wallet" />} />
        <Route path="/driver/vehicle" element={<ComingSoon page="Vehicle Status" />} />
        <Route path="/driver/rewards" element={<ComingSoon page="Trust Rewards" />} />
        <Route path="/driver/help" element={<ComingSoon page="Help & SOS" />} />
      </Routes>
    </Router>
  );
}

export default App;