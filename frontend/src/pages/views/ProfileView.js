export default function ProfileView() {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-slate-900 text-white p-6 rounded-2xl">
        <h4 className="text-sm font-bold">EcoFleet Admin Profile</h4>
        <p className="text-[10px] text-slate-400 font-mono mt-1">ID: OWNER-MGE-0041</p>
      </div>
      
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <p className="text-[10px] font-bold text-slate-400 uppercase">KYC Document Vault</p>
        <div className="mt-3 space-y-2">
          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-xs">
            <span>Corporate GSTIN</span>
            <span className="text-emerald-600 font-bold">✓ Uploaded</span>
          </div>
        </div>
      </div>
    </div>
  );
}