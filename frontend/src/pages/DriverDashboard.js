// DriverDashboard.js
export default function DriverDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'dashboard' && <DriverDashboardTab />}
        {activeTab === 'wallet' && <DriverWalletTab />}
        {activeTab === 'profile' && <DriverProfileTab />}
        {activeTab === 'kyc' && <DriverKYCTab />}
      </div>

      {/* FIXED BOTTOM NAV - Ek hi bar rakho! */}
      <div className="fixed bottom-0 w-full bg-white border-t border-slate-200 h-16 flex justify-around items-center z-50">
        <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}>Dashboard</button>
        <button onClick={() => setActiveTab('wallet')} className={activeTab === 'wallet' ? 'text-blue-600' : 'text-slate-400'}>Wallet</button>
        <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'text-blue-600' : 'text-slate-400'}>Profile</button>
        <button onClick={() => setActiveTab('kyc')} className={activeTab === 'kyc' ? 'text-blue-600' : 'text-slate-400'}>KYC</button>
      </div>
    </div>
  );
}