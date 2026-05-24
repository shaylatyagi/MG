import React, { useState } from 'react';
import DriverDashboardTab from './driver/DriverDashboardTab';
import DriverWalletTab from './driver/DriverWalletTab';
import DriverProfileTab from './driver/DriverProfileTab';
import DriverKYCTab from './driver/DriverKYCTab';

export default function DriverDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Yeh saare tabs tumhare existing files se data le rahe hain
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DriverDashboardTab />;
      case 'wallet': return <DriverWalletTab />;
      case 'profile': return <DriverProfileTab />;
      case 'kyc': return <DriverKYCTab />;
      default: return <DriverDashboardTab />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Content Area - Yahan tumhare saare tabs load honge */}
      <div className="flex-1 overflow-y-auto pb-24">
        {renderContent()}
      </div>

      {/* FIXED BOTTOM NAVIGATION */}
      <div className="fixed bottom-0 w-full bg-white border-t border-slate-200 h-16 flex justify-around items-center z-50">
        <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}>
          Dashboard
        </button>
        <button onClick={() => setActiveTab('wallet')} className={activeTab === 'wallet' ? 'text-blue-600' : 'text-slate-400'}>
          Wallet
        </button>
        <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'text-blue-600' : 'text-slate-400'}>
          Profile
        </button>
        <button onClick={() => setActiveTab('kyc')} className={activeTab === 'kyc' ? 'text-blue-600' : 'text-slate-400'}>
          KYC
        </button>
      </div>
    </div>
  );
}