import React, { useState } from 'react';
import DriverDashboardTab from './DriverDashboardTab';
import DriverWalletTab from './DriverWalletTab';
import DriverProfileTab from './DriverProfileTab';
import DriverKYCTab from './DriverKYCTab';

export default function DriverPWA() {
  const [activeTab, setActiveTab] = useState('home');
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="h-screen w-full flex justify-center bg-slate-100">
      <div className="w-full max-w-[412px] h-full bg-white shadow-2xl flex flex-col relative overflow-hidden">
        <header className="p-4 border-b font-bold text-xl bg-white sticky top-0 z-50">MobilityGrid</header>
        <main className="flex-1 overflow-y-auto pb-20">
          {activeTab === 'home' && <DriverDashboardTab />}
          {activeTab === 'wallet' && <DriverWalletTab />}
          {activeTab === 'profile' && <DriverProfileTab />}
          {activeTab === 'kyc' && <DriverKYCTab />}
        </main>
        <button onClick={() => setShowChat(!showChat)} className="absolute bottom-24 right-5 bg-blue-600 p-4 rounded-full text-white shadow-lg">💬</button>
        <nav className="h-16 border-t flex justify-around items-center bg-white absolute bottom-0 w-full">
          <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-blue-600 font-bold text-xs' : 'text-slate-500 text-xs'}>Home</button>
          <button onClick={() => setActiveTab('wallet')} className={activeTab === 'wallet' ? 'text-blue-600 font-bold text-xs' : 'text-slate-500 text-xs'}>Wallet</button>
          <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'text-blue-600 font-bold text-xs' : 'text-slate-500 text-xs'}>Profile</button>
          <button onClick={() => setActiveTab('kyc')} className={activeTab === 'kyc' ? 'text-blue-600 font-bold text-xs' : 'text-slate-500 text-xs'}>KYC</button>
        </nav>
      </div>
    </div>
  );
}