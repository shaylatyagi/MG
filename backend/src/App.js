import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from '../../frontend/frontend/src/pages/Login';
import OwnerDashboard from '../../frontend/frontend/src/pages/OwnerDashboard';
import DriverDashboard from '../../frontend/frontend/src/pages/DriverDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/owner/dashboard" element={<OwnerDashboard />} />
        <Route path="/driver/dashboard" element={<DriverDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;