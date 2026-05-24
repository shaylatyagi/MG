export default function DriverWalletTab() {
  return (
    <div className="p-5 space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm border text-center">
        <p className="text-slate-500 font-medium">Total Balance</p>
        <h2 className="text-5xl font-black text-emerald-600 mb-6">₹1250</h2>
        <button onClick={() => alert('Withdrawal Initiated!')} className="w-full bg-emerald-100 text-emerald-800 font-bold py-3 rounded-xl">Withdraw to Bank</button>
      </div>
      <div>
        <p className="font-bold text-slate-700 mb-4">Recent Transactions</p>
        {[1, 2, 3].map(i => <div key={i} className="flex justify-between py-3 border-b"><p className="font-semibold text-sm">Rent Deduction</p><p className="font-bold text-red-500">-₹1200</p></div>)}
      </div>
    </div>
  );
}