// src/pages/driver/DriverApp.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import BottomNav        from '../../components/BottomNav';
import DriverWalletTab  from './DriverWalletTab';
import DriverPayTab     from './DriverPayTab';
import DriverKYCTab     from './DriverKYCTab';
import DriverChatTab    from './DriverChatTab';

export default function DriverApp() {
  return (
    <div className="driver-app-shell">
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
