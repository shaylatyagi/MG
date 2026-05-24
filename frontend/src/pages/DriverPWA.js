// DriverPWA.js
import React, { useState } from 'react';
import DriverDashboardTab from './driver/DriverDashboardTab'; // Tumhari Tab files
import DriverWalletTab from './driver/DriverWalletTab';
import DriverProfileTab from './driver/DriverProfileTab';
import DriverKYCTab from './driver/DriverKYCTab';

export default function DriverPWA() {
  const [activeTab, setActiveTab] = useState('home');
  const user = JSON.parse(localStorage.getItem('user') || '{"name": "Driver"}');

  return (
    <div className="max-w-[412px] mx-auto h-screen bg-slate-50 flex flex-col border-x shadow-2xl relative">
      
      {/* 1. Header (Notification Bell & Chatbot Logic yahan add karo) */}
      <div className="bg-white px-4 py-3 border-b flex justify-between items-center sticky top-0 z-40">
        <h1 className="font-bold text-xl">MobilityGrid</h1>
        {/* Yahan tumhara Notification Bell aur Chatbot trigger button aayega */}
      </div>

      {/* 2. CONTENT AREA - Sirf tab switch hoga */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'home' && <DriverDashboardTab user={user} />}
        {activeTab === 'wallet' && <DriverWalletTab user={user} />}
        {activeTab === 'profile' && <DriverProfileTab user={user} />}
        {activeTab === 'kyc' && <DriverKYCTab />}
      </div>

      {/* 3. FIXED BOTTOM NAV - Ek hi bar */}
      <nav className="fixed bottom-0 w-full max-w-[412px] bg-white border-t py-3 flex justify-around text-xs z-50">
        <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-blue-600' : 'text-slate-500'}>Home</button>
        <button onClick={() => setActiveTab('wallet')} className={activeTab === 'wallet' ? 'text-blue-600' : 'text-slate-500'}>Wallet</button>
        <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'text-blue-600' : 'text-slate-500'}>Profile</button>
        <button onClick={() => setActiveTab('kyc')} className={activeTab === 'kyc' ? 'text-blue-600' : 'text-slate-500'}>KYC</button>
      </nav>
    </div>
  );
}