import { useState, useEffect } from 'react';
import api from '../api';
import BottomNav from '../../components/BottomNav';
import DashView from './views/DashView';
import DispatchView from './views/DispatchView';
import DriversView from './views/DriversView';

export default function OwnerDashboard() {
  const [activeScreen, setActiveScreen] = useState('dash');
  const [data, setData] = useState({ vehicles: [], stats: { total_earnings: 0, total_vehicles: 0 } });

  useEffect(() => {
    const fetchData = async () => {
      const vRes = await api.get('/api/owner/vehicles');
      const sRes = await api.get('/api/owner/stats');
      setData({ vehicles: vRes.data, stats: sRes.data });
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="p-4 bg-white border-b border-slate-200 text-center font-bold text-sm shadow-sm">
        Mobility Grid
      </header>
      
      <main className="flex-1 overflow-y-auto pb-20">
        {activeScreen === 'dash' && <DashView data={data} />}
        {activeScreen === 'dispatch' && <DispatchView vehicles={data.vehicles} />}
        {activeScreen === 'drivers' && <DriversView />}
      </main>

      <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
    </div>
  );
}