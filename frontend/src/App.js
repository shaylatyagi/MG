import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import OwnerDashboard from './pages/OwnerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import MyVehicles from './pages/MyVehicles';
import EarningsPayouts from './pages/EarningsPayouts';
import TrustRewards from './pages/TrustRewards';
import MyWallet from './pages/MyWallet';
import ComplianceVault from './pages/ComplianceVault';
import HelpSOS from './pages/HelpSOS';
import VehicleStatus from './pages/VehicleStatus';
import FleetSettings from './pages/FleetSettings';
import PaymentResult from './pages/PaymentResult';
import Profile from './pages/Profile';
import ComingSoon from './pages/ComingSoon';
import ChargingStations from './pages/ChargingStations';

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
        
        {/* Driver Routes */}
        <Route path="/driver/dashboard" element={<DriverDashboard />} />
        <Route path="/driver/wallet" element={<MyWallet />} />
        <Route path="/driver/vehicle" element={<VehicleStatus />} />
        <Route path="/driver/rewards" element={<TrustRewards />} />
        <Route path="/driver/help" element={<HelpSOS />} />
        <Route path="/driver/charging" element={<ChargingStations />} />
        
        {/* Shared / Utility Routes */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/payment-result" element={<PaymentResult />} />
      </Routes>
    </Router>
  );
}

export default App;