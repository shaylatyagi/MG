// src/pages/driver/DriverApp.jsx — per DevSpec §9.5
import { useState } from 'react';
import BottomNav        from '../../components/BottomNav';
import DriverWalletTab  from './DriverWalletTab';
import DriverPayTab     from './DriverPayTab';
import DriverKYCTab     from './DriverKYCTab';
import DriverChatTab    from './DriverChatTab';

const TABS = {
  wallet: DriverWalletTab,
  pay:    DriverPayTab,
  kyc:    DriverKYCTab,
  chat:   DriverChatTab,
};

export default function DriverApp() {
  const [tab, setTab] = useState('wallet');
  const Tab = TABS[tab];
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Tab />
      <BottomNav tabs={['wallet', 'pay', 'kyc', 'chat']} active={tab} onChange={setTab} />
    </div>
  );
}
