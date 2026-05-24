import React, { useState } from 'react';
import DriverDashboardTab from './driver/DriverDashboardTab';

export default function DriverPWA() {
  const [activeTab, setActiveTab] = useState('home');
  const user = JSON.parse(localStorage.getItem('user') || '{"name": "Driver"}');
  
  // DriverDetails jo pehle Tab mein tha, ab PWA shell mein hoga
  const [driverDetails] = useState({ dues: 1450, battery_level: 92, kms_driven: 45, vehicle_number: 'MH-12-QX-4019' });

  return (
    <div className="max-w-[412px] mx-auto h-screen bg-slate-50 flex flex-col relative shadow-2xl">
      {/* GLOBAL HEADER */}
      <header className="bg-white p-4 flex justify-between items-center border-b sticky top-0 z-50">
        <h1 className="font-bold text-xl">MobilityGrid</h1>
        <button>🔔</button>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'home' && (
          <DriverDashboardTab 
            user={user} 
            driverDetails={driverDetails} 
            handlePayment={() => console.log("Pay now")} 
          />
        )}
        {/* Baaki tabs yahan aayenge */}
      </main>

      {/* FIXED BOTTOM NAV */}
      <nav className="fixed bottom-0 w-full max-w-[412px] bg-white border-t flex justify-around py-4 z-50">
        <button onClick={() => setActiveTab('home')}>Home</button>
        <button onClick={() => setActiveTab('wallet')}>Wallet</button>
      </nav>
      
      {/* GLOBAL CHATBOT */}
      <button className="fixed bottom-24 right-5 bg-blue-600 p-4 rounded-full text-white z-50">💬</button>
    </div>
  );
}