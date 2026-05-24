import { useState, useEffect } from 'react';
import api from '../../api';

export default function DriversView() {
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    api.get('/api/owner/driver-payouts') // Payouts mein driver details aati hain
      .then(res => setDrivers(res.data))
      .catch(err => console.error("Drivers load fail:", err));
  }, []);

  const handleKyc = async (phone, action) => {
    try {
      await api.put(`/api/owner/vehicles/${phone}`, { status: action });
      alert(`Driver ${action} successful`);
      // Reload logic
    } catch (err) { alert("Action failed"); }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-bold text-xs uppercase text-slate-500">Driver Matrix</h3>
      {drivers.map(d => (
        <div key={d.driver_phone} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="font-bold text-xs">{d.driver_name}</p>
          <p className="text-[10px] text-slate-400 font-mono">Phone: {d.driver_phone}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => handleKyc(d.driver_phone, 'Verified')} className="bg-emerald-600 text-white text-[10px] px-3 py-1 rounded-lg font-bold">Verify</button>
            <button onClick={() => handleKyc(d.driver_phone, 'Rejected')} className="bg-red-50 text-red-700 text-[10px] px-3 py-1 rounded-lg font-bold">Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}