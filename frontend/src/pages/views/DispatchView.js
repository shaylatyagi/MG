import { useState } from 'react';
import api from '../../api';

export default function DispatchView({ vehicles }) {
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [cashAdvance, setCashAdvance] = useState(1500);

  const handleHandover = async () => {
    if (!selectedVehicle) return alert("Select vehicle first");
    try {
      await api.put(`/api/owner/vehicles/${selectedVehicle}`, { status: 'Bound & Active', cash_advance: cashAdvance });
      alert('Handover Executed & Cash Disbursed!');
    } catch (err) { alert('Handover Failed'); }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-bold text-xs uppercase text-slate-500">Dispatch Handover</h3>
      <select onChange={(e) => setSelectedVehicle(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-sm">
        <option value="">Select Vehicle Node</option>
        {vehicles.map(v => <option key={v.vehicle_number} value={v.vehicle_number}>{v.vehicle_number}</option>)}
      </select>
      
      <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
        <label className="text-[10px] font-bold text-amber-800 uppercase">Cash Advance (₹)</label>
        <input type="number" value={cashAdvance} onChange={(e) => setCashAdvance(e.target.value)} className="w-full p-2 mt-1 rounded-lg border border-amber-200 font-mono font-bold" />
      </div>

      <button onClick={handleHandover} className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold shadow-md">
        Execute Handover
      </button>
    </div>
  );
}