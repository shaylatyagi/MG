export default function DashView({ data }) {
  return (
    <div className="p-4 space-y-4">
      {/* Earnings Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
          <p className="text-[10px] font-bold text-emerald-600 uppercase">Total Earnings</p>
          <p className="text-lg font-mono font-bold">₹{data.stats.total_earnings || 0}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
          <p className="text-[10px] font-bold text-blue-600 uppercase">Active Fleet</p>
          <p className="text-lg font-mono font-bold">{data.stats.total_vehicles || 0}</p>
        </div>
      </div>

      {/* Vehicle List */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase">Live Assets</h3>
        {data.vehicles.map(v => (
          <div key={v.vehicle_number} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
            <div>
              <p className="font-bold text-xs">{v.vehicle_number}</p>
              <p className="text-[10px] text-slate-400">{v.driver_name} • {v.area}</p>
            </div>
            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-bold">Bound</span>
          </div>
        ))}
      </div>
    </div>
  );
}