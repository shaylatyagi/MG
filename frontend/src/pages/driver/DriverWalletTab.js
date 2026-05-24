import { useState } from 'react';

export default function DriverWalletTab({ lang, user }) {
  const [walletBalance] = useState(1500);
  const [unclaimedBonus] = useState(350);
  const [showClaimSuccess, setShowClaimSuccess] = useState(false);

  const claimBonus = () => {
    if (unclaimedBonus <= 0) return;
    
    setShowClaimSuccess(true);
    setTimeout(() => setShowClaimSuccess(false), 2500);
    
    alert(lang === 'en' 
      ? `₹${unclaimedBonus} Bonus Credited to Wallet!` 
      : `₹${unclaimedBonus} बोनस वॉलेट में जमा हो गया!`
    );
  };

  return (
    <div className="p-4 space-y-4">

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-br from-emerald-700 to-teal-800 text-white rounded-3xl p-6 shadow-lg">
        <p className="text-sm opacity-80">
          {lang === 'en' ? 'Wallet Advance Float Balance' : 'वॉलेट बैलेंस'}
        </p>
        <p className="text-5xl font-bold mt-2 mb-6">₹{walletBalance}</p>
        
        <div className="flex gap-3">
          <button className="flex-1 bg-white/20 hover:bg-white/30 py-4 rounded-2xl font-bold text-sm transition-all">
            {lang === 'en' ? '+ Add Float' : '+ राशि जोड़ें'}
          </button>
          <button className="flex-1 bg-white text-emerald-700 py-4 rounded-2xl font-bold text-sm transition-all">
            {lang === 'en' ? 'Request Payout' : 'पैसे निकालें'}
          </button>
        </div>
      </div>

      {/* Rewards Section */}
      <div className="bg-white rounded-2xl p-5 shadow">
        <p className="font-bold text-lg mb-4">
          {lang === 'en' ? 'Milestone Incentives & Rewards' : 'इनाम और पुरस्कार'}
        </p>
        
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-5 flex justify-between items-center">
          <div>
            <p className="text-sm text-slate-600">{lang === 'en' ? 'Unclaimed Bonus' : 'बोनस'}</p>
            <p className="text-3xl font-bold text-purple-700">₹{unclaimedBonus}</p>
          </div>
          <button 
            onClick={claimBonus}
            className="bg-purple-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-purple-700 transition-all"
          >
            {lang === 'en' ? 'Claim Now' : 'क्लेम करें'}
          </button>
        </div>

        {showClaimSuccess && (
          <div className="mt-4 text-center text-emerald-600 font-medium">
            ✅ Bonus Claimed Successfully!
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl p-5 shadow">
        <p className="font-bold text-lg mb-4">
          {lang === 'en' ? 'Recent Transactions' : 'हाल के लेनदेन'}
        </p>
        <div className="space-y-4 text-sm">
          <div className="flex justify-between items-center py-2 border-b">
            <div>
              <p className="font-medium">Security Advance Received</p>
              <p className="text-xs text-slate-500">22 May 2026 • 09:15 AM</p>
            </div>
            <p className="font-bold text-emerald-600">+₹1,500</p>
          </div>
          <div className="flex justify-between items-center py-2">
            <div>
              <p className="font-medium">Daily Rent Deducted</p>
              <p className="text-xs text-slate-500">Today • 08:00 AM</p>
            </div>
            <p className="font-bold text-red-600">-₹1,200</p>
          </div>
        </div>
      </div>

    </div>
  );
}