import React, { useState } from 'react';
import DriverDashboardTab from './driver/DriverDashboardTab';
import DriverWalletTab from './driver/DriverWalletTab';
import DriverProfileTab from './driver/DriverProfileTab';
import DriverKYCTab from './driver/DriverKYCTab';

export default function DriverPWA() {
  const [activeTab, setActiveTab] = useState('home');
  const [showNotif, setShowNotif] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  const user = JSON.parse(localStorage.getItem('user') || '{"name": "Driver"}');

  return (
    <div className="max-w-[412px] mx-auto h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      {/* GLOBAL HEADER */}
      <header className="bg-white p-4 flex justify-between items-center border-b sticky top-0 z-50">
        <h1 className="font-bold text-xl">MobilityGrid</h1>
        <button onClick={() => setShowNotif(!showNotif)}>🔔</button>
      </header>

      {/* CONTENT SWITCHER */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'home' && <DriverDashboardTab user={user} driverDetails={{dues: 1450}} />}
        {activeTab === 'wallet' && <DriverWalletTab user={user} />}
        {activeTab === 'profile' && <DriverProfileTab user={user} />}
        {activeTab === 'kyc' && <DriverKYCTab />}
      </main>

      {/* GLOBAL CHATBOT */}
      <button onClick={() => setShowChat(!showChat)} className="fixed bottom-24 right-5 bg-blue-600 p-4 rounded-full text-white z-50">💬</button>

      {/* SINGLE BOTTOM NAV */}
      <nav className="fixed bottom-0 w-full max-w-[412px] bg-white border-t flex justify-around py-4 z-50">
        <button onClick={() => setActiveTab('home')}>Home</button>
        <button onClick={() => setActiveTab('wallet')}>Wallet</button>
        <button onClick={() => setActiveTab('profile')}>Profile</button>
        <button onClick={() => setActiveTab('kyc')}>KYC</button>
      </nav>
    </div>
  );
}