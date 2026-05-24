import { useState, useEffect } from 'react';
import api from '../api';

export default function DispatchContent() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');

  useEffect(() => {
    // Vehicles fetch karo
    api.get('/api/owner/vehicles').then(res => setVehicles(res.data));
    // Drivers fetch karne ke liye tere pass shayad koi aur endpoint hoga
    // Agar nahi hai toh specific driver list endpoint bana lena
  }, []);

  const handleHandover = async () => {
    try {
      await api.put(`/api/owner/vehicles/${selectedVehicle}`, { 
        driver_name: selectedDriver 
      });
      alert('Handover Successful!');
    } catch (err) { alert('Failed'); }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-bold text-xs uppercase text-slate-500">Dispatch & Allocation</h3>
      
      <select onChange={(e) => setSelectedVehicle(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200">
        <option>Select Vehicle</option>
        {vehicles.map(v => <option key={v.vehicle_number} value={v.vehicle_number}>{v.vehicle_number}</option>)}
      </select>

      <input onChange={(e) => setSelectedDriver(e.target.value)} placeholder="Driver Name" className="w-full p-3 rounded-xl border border-slate-200" />
      
      <button onClick={handleHandover} className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold">
        Execute Handover
      </button>
    </div>
  );
}