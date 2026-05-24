import { useState, useEffect } from 'react';
import DriverDashboardTab from './driver/DriverDashboardTab';
import DriverWalletTab from './driver/DriverWalletTab';
import DriverProfileTab from './driver/DriverProfileTab';
import DriverKYCTab from './driver/DriverKYCTab';

export default function DriverPWA({ user }) {
  const [activeTab, setActiveTab] = useState('home');
  const [lang, setLang] = useState('en');

  const toggleLang = () => {
    setLang(prev => prev === 'en' ? 'hi' : 'en');
  };

  // Live Clock - without optional chaining
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      
      const timeStr = `${hours}:${minutes} ${ampm}`;
      
      const timeElement = document.getElementById('status-time');
      if (timeElement) {
        timeElement.textContent = timeStr;
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-[412px] mx-auto h-screen bg-slate-50 flex flex-col border-x border-slate-300 shadow-2xl overflow-hidden relative">

      {/* Status Bar */}
      <div className="bg-slate-950 text-white text-xs px-6 py-2 flex justify-between items-center z-50">
        <span id="status-time">09:42 PM</span>
        <div className="flex items-center gap-2">
          <span>4G</span>
          <span>92%</span>
        </div>
      </div>

      {/* Top Header */}
      <div className="bg-white px-4 py-3 border-b flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md">M</div>
          <div>
            <p className="font-bold text-xl tracking-tight">MobilityGrid</p>
            <p className="text-xs text-slate-500 -mt-1" id="app-subtitle">Driver Terminal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => alert(lang === 'en' ? "SOS Broadcast Sent to Owner!" : "SOS भेज दिया गया!")}
            className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl transition-all"
          >
            📞
          </button>

          <div className="bg-slate-100 rounded-2xl p-1 flex text-xs font-bold">
            <button 
              onClick={toggleLang}
              className={`px-4 py-2 rounded-xl transition-all ${lang === 'en' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
            >
              EN
            </button>
            <button 
              onClick={toggleLang}
              className={`px-4 py-2 rounded-xl transition-all ${lang === 'hi' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
            >
              हिं
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20 bg-slate-50">
        {activeTab === 'home' && <DriverDashboardTab lang={lang} user={user} />}
        {activeTab === 'wallet' && <DriverWalletTab lang={lang} user={user} />}
        {activeTab === 'profile' && <DriverProfileTab lang={lang} user={user} />}
        {activeTab === 'kyc' && <DriverKYCTab lang={lang} />}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[412px] w-full bg-white border-t py-3 flex justify-around text-xs z-50 shadow-2xl">
        <button onClick={() => setActiveTab('home')} className={`flex-1 flex flex-col items-center ${activeTab === 'home' ? 'text-blue-600' : 'text-slate-500'}`}>
          🏠 <span className="text-[10px] mt-0.5">Dashboard</span>
        </button>
        <button onClick={() => setActiveTab('wallet')} className={`flex-1 flex flex-col items-center ${activeTab === 'wallet' ? 'text-blue-600' : 'text-slate-500'}`}>
          💰 <span className="text-[10px] mt-0.5">Wallet</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex-1 flex flex-col items-center ${activeTab === 'profile' ? 'text-blue-600' : 'text-slate-500'}`}>
          👤 <span className="text-[10px] mt-0.5">Profile</span>
        </button>
        <button onClick={() => setActiveTab('kyc')} className={`flex-1 flex flex-col items-center ${activeTab === 'kyc' ? 'text-blue-600' : 'text-slate-500'}`}>
          🔐 <span className="text-[10px] mt-0.5">KYC</span>
        </button>
      </nav>
    </div>
  );
}