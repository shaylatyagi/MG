import React, { useState } from 'react';
import api from '../../api'; 

export default function DriverDashboardTab({ lang }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  // Nayi functional states
  const [showNotifications, setShowNotifications] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const user = JSON.parse(localStorage.getItem('user') || '{"name": "Driver", "phone": "9876543210"}');

  const [driverDetails] = useState({
    wallet_balance: 1250,
    dues: 1450,
    daily_rent: 1200,
    battery_level: 92,
    kms_driven: 45,
    vehicle_number: 'MH-12-QX-4019'
  });

  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      const res = await api.post('/api/payment/create-order', {
        amount: driverDetails.dues,
        customerName: user.name,
        customerPhone: user.phone_number || user.phone,
      });
      if (res.data?.data?.checkoutUrl || res.data?.paymentUrl) {
        window.location.href = res.data.data.checkoutUrl || res.data.paymentUrl;
      }
    } catch (err) { alert('Payment failed'); }
    setPaymentLoading(false);
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans relative">
      
      {/* 1. TOP HEADER WITH FUNCTIONAL BELL */}
      <div className="bg-white px-5 py-4 flex justify-between items-center shadow-sm sticky top-0 z-40">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Hello, {user.name} 👋</h1>
        </div>
        <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition">
          <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
          </svg>
        </button>
      </div>

      {/* Notification Popup Logic */}
      {showNotifications && (
        <div className="absolute top-16 right-5 w-64 bg-white p-4 rounded-2xl shadow-xl z-50 border border-slate-100 animate-in fade-in slide-in-from-top-4">
          <h4 className="font-bold text-sm mb-2">Notifications</h4>
          <p className="text-xs text-slate-500">No new updates right now.</p>
        </div>
      )}

      {/* 2. TAB CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 pb-28">
        {activeTab === 'dashboard' && (
          <div className="space-y-5">
            {/* Quick Rent Card */}
            <div className="bg-white border border-amber-300 rounded-3xl p-6 shadow-md">
              <h2 className="text-4xl font-bold text-slate-900">₹{driverDetails.dues}</h2>
              <button onClick={handlePayment} className="mt-5 w-full bg-slate-900 text-white font-bold py-4 rounded-2xl">
                {paymentLoading ? 'Processing...' : 'PAY VIA PAYYANTRA'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. FUNCTIONAL CHATBOT */}
      <button 
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-24 right-5 bg-blue-600 text-white p-4 rounded-full shadow-xl z-50"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
        </svg>
      </button>

      {/* Chat Window */}
      {isChatOpen && (
        <div className="fixed bottom-36 right-5 w-72 h-80 bg-white shadow-2xl rounded-2xl p-4 z-50 border animate-in slide-in-from-bottom-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm">Support Chat</h3>
            <button onClick={() => setIsChatOpen(false)} className="text-[10px] font-bold text-red-500">CLOSE</button>
          </div>
          <p className="text-xs text-slate-500">How can we assist you today?</p>
        </div>
      )}

      {/* 4. BOTTOM NAV */}
      <div className="fixed bottom-0 w-full bg-white border-t h-16 flex justify-around items-center z-50">
        <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}>Dashboard</button>
        <button onClick={() => setActiveTab('wallet')} className={activeTab === 'wallet' ? 'text-blue-600' : 'text-slate-400'}>Wallet</button>
        <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'text-blue-600' : 'text-slate-400'}>Profile</button>
        <button onClick={() => setActiveTab('kyc')} className={activeTab === 'kyc' ? 'text-blue-600' : 'text-slate-400'}>KYC</button>
      </div>
    </div>
  );
}