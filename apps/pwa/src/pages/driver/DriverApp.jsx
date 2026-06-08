// src/pages/driver/DriverApp.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import BottomNav        from '../../components/BottomNav';
import DriverWalletTab  from './DriverWalletTab';
import DriverPayTab     from './DriverPayTab';
import DriverKYCTab     from './DriverKYCTab';
import DriverChatTab    from './DriverChatTab';

export default function DriverApp() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: 58, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Top bar */}
      <div style={{ background: '#4f46e5', color: '#fff', height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: '-0.3px' }}>MG</span>
          <span style={{ fontSize: 9, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Driver</span>
        </div>
        <span style={{ fontSize: 10, opacity: 0.6 }}>v1.0</span>
      </div>
      <Routes>
        <Route index element={<Navigate to="wallet" replace />} />
        <Route path="wallet" element={<DriverWalletTab />} />
        <Route path="pay"    element={<DriverPayTab />} />
        <Route path="kyc"    element={<DriverKYCTab />} />
        <Route path="chat"   element={<DriverChatTab />} />
        <Route path="*"      element={<Navigate to="wallet" replace />} />
      </Routes>
      <BottomNav tabs={['wallet', 'pay', 'kyc', 'chat']} />
    </div>
  );
}
