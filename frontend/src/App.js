import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';

// Owner Routes
import OwnerDashboard from './pages/OwnerDashboard';
import MyVehicles from './pages/MyVehicles';
import EarningsPayouts from './pages/EarningsPayouts';
import ComplianceVault from './pages/ComplianceVault';
import FleetSettings from './pages/FleetSettings';

// Driver Routes
import DriverPWA from './pages/DriverPWA';        // ← Naya wala
import Profile from './pages/Profile';
import PaymentResult from './pages/PaymentResult';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />  

        {/* Owner Routes */}
        <Route path="/owner/dashboard" element={<OwnerDashboard />} />
        <Route path="/owner/vehicles" element={<MyVehicles />} />
        <Route path="/owner/earnings" element={<EarningsPayouts />} />
        <Route path="/owner/compliance" element={<ComplianceVault />} />
        <Route path="/owner/settings" element={<FleetSettings />} />        

        {/* === Driver Routes (New PWA Style) === */}
        <Route path="/driver" element={<DriverPWA />} />
        <Route path="/driver/*" element={<DriverPWA />} />   {/* Catch all driver routes */}

        {/* Shared Routes */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/payment-result" element={<PaymentResult />} />

        {/* Old routes ko temporarily comment kar do (baad mein remove kar denge) */}
        {/* 
        <Route path="/driver/dashboard" element={<DriverDashboard />} />
        <Route path="/driver/wallet" element={<MyWallet />} />
        ... 
        */}
      </Routes>
    </Router>
  );
}

export default App;