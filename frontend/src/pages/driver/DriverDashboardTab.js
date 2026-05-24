import React, { useState } from 'react';
import api from '../../api'; 

export default function DriverDashboardTab({ lang }) {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{"name": "Driver", "phone": "9876543210"}');

  const [driverDetails] = useState({
    wallet_balance: 1250,
    dues: 1450,
    daily_rent: 1200,
    battery_level: 92,
    kms_driven: 45,
    vehicle_number: 'MH-12-QX-4019'
  });

  // --- PAYYANTRA PAYMENT LOGIC (SECURE REDIRECT) ---
  const handlePayment = async () => {
    if (driverDetails.dues <= 0) return alert('No outstanding balance!');
    setPaymentLoading(true);
    
    try {
      const res = await api.post('/api/payment/create-order', {
        amount: driverDetails.dues,
        customerName: user.name,
        customerPhone: user.phone_number || user.phone,
      });
      
      const checkoutUrl = res.data?.data?.data?.checkoutUrl || res.data?.data?.checkoutUrl || res.data?.paymentUrl;
      
      if (checkoutUrl) {
        // Iframe hataya, Direct Payyantra ke secure page par bhej rahe hain
        window.location.href = checkoutUrl; 
      } else {
        alert('Payment initiation failed. No checkout URL received.');
      }
    } catch (err) {
      console.error('Payment Error:', err);
      alert('Gateway connect karne mein dikkat aayi.');
    }
    setPaymentLoading(false);
  };

  // --- TAB VIEWS ---
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-5 animate-fade-in">
            {/* Asset Health Card */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <p className="text-xs font-bold text-slate-500 tracking-wider">ACTIVE VEHICLE</p>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md">ONLINE</span>
              </div>
              <h3 className="font-bold text-lg mb-4">{driverDetails.vehicle_number}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                  <p className="text-[10px] text-blue-600 font-bold mb-1">BATTERY</p>
                  <p className="font-black text-xl text-blue-900">{driverDetails.battery_level}% ⚡</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                  <p className="text-[10px] text-orange-600 font-bold mb-1">DRIVEN TODAY</p>
                  <p className="font-black text-xl text-orange-900">{driverDetails.kms_driven} KM</p>
                </div>
              </div>
            </div>

            {/* Quick Rent Card */}
            <div className="bg-white border border-amber-300 rounded-3xl p-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-amber-100 px-4 py-1 rounded-bl-xl text-[10px] font-bold text-amber-800">
                DUE TODAY
              </div>
              <p className="text-amber-600 text-xs font-bold tracking-widest mt-2 flex items-center gap-1">
                <span>⚠️</span> OUTSTANDING RENT
              </p>
              <h2 className="text-4xl font-bold text-slate-900 mt-1">₹{driverDetails.dues}</h2>
              <button
                onClick={handlePayment}
                disabled={paymentLoading}
                className="mt-5 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl text-sm tracking-wider shadow-lg transition-all"
              >
                {paymentLoading ? 'CONNECTING GATEWAY...' : 'PAY VIA PAYYANTRA'}
              </button>
            </div>

            {/* System Alerts */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <p className="font-bold text-slate-700 text-sm mb-4">System Alerts</p>
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
                <p className="font-semibold text-red-800 text-sm">Docking Required</p>
                <p className="text-xs text-slate-600 mt-1">Please dock vehicle at local hub by 06:00 PM today.</p>
              </div>
            </div>
          </div>
        );
      case 'wallet':
        return (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center animate-fade-in">
            <p className="text-slate-500 font-medium mb-2">Total Wallet Balance</p>
            <h2 className="text-5xl font-black text-emerald-600 mb-6">₹{driverDetails.wallet_balance}</h2>
            <button className="w-full bg-emerald-100 text-emerald-800 font-bold py-3 rounded-xl mb-4">Withdraw to Bank</button>
            <div className="text-left mt-6">
              <p className="font-bold text-slate-700 mb-4">Recent Transactions</p>
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex justify-between py-3 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="font-semibold text-sm">Rent Deduction</p>
                    <p className="text-xs text-slate-400">Today, 10:00 AM</p>
                  </div>
                  <p className="font-bold text-red-500 text-sm">-₹1200</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'profile':
        return <div className="p-5 text-center text-slate-500 font-bold">Profile Settings Here</div>;
      case 'kyc':
        return <div className="p-5 text-center text-slate-500 font-bold">Driver KYC Verification Here</div>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans relative">
      
      {/* 1. TOP HEADER */}
      <div className="bg-white px-5 py-4 flex justify-between items-center shadow-sm sticky top-0 z-40">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Hello, {user.name} 👋</h1>
          <p className="text-xs text-slate-500 font-medium tracking-wide">MOBILITY GRID TERMINAL</p>
        </div>
        <button className="relative p-2 bg-slate-100 rounded-full hover:bg-slate-200">
          <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
          </svg>
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
          </span>
        </button>
      </div>

      {/* 2. SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 pb-28">
        {renderTabContent()}
      </div>

      {/* 3. FLOATING CHATBOT BUTTON */}
      <button className="fixed bottom-24 right-5 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 transition-colors z-50 flex items-center justify-center">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
        </svg>
      </button>

      {/* 4. BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 w-full bg-white border-t border-slate-200 pb-safe z-50">
        <div className="flex justify-around items-center h-16">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}>
            <svg className="w-6 h-6 mb-1" fill={activeTab === 'dashboard' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            <span className="text-[10px] font-bold tracking-wide">Home</span>
          </button>
          <button onClick={() => setActiveTab('wallet')} className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'wallet' ? 'text-blue-600' : 'text-slate-400'}`}>
            <svg className="w-6 h-6 mb-1" fill={activeTab === 'wallet' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
            <span className="text-[10px] font-bold tracking-wide">Wallet</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'profile' ? 'text-blue-600' : 'text-slate-400'}`}>
            <svg className="w-6 h-6 mb-1" fill={activeTab === 'profile' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            <span className="text-[10px] font-bold tracking-wide">Profile</span>
          </button>
          <button onClick={() => setActiveTab('kyc')} className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'kyc' ? 'text-blue-600' : 'text-slate-400'}`}>
            <svg className="w-6 h-6 mb-1" fill={activeTab === 'kyc' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <span className="text-[10px] font-bold tracking-wide">KYC</span>
          </button>
        </div>
      </div>
    </div>
  );
}