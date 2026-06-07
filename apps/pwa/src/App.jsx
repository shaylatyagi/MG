// src/App.jsx — per DevSpec §9.4
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login      from './pages/Login';
import DriverApp  from './pages/driver/DriverApp';
import ManagerApp from './pages/manager/ManagerApp';

function Guard({ roles, children }) {
  const { user } = useAuth();
  if (!user)              return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/driver/*" element={
            <Guard roles={['driver']}><DriverApp /></Guard>
          } />
          <Route path="/manager/*" element={
            <Guard roles={['manager']}><ManagerApp /></Guard>
          } />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
