// src/pages/manager/ManagerApp.jsx — per DevSpec §9.6
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import ManagerDashboard from './ManagerDashboard';

const PERM_TABS = {};  // Extend as owner tabs are built

export default function ManagerApp() {
  const { user } = useAuth();
  const [tab, setTab] = useState('dashboard');

  const tabs = [
    { key: 'dashboard', Component: ManagerDashboard },
    ...(user?.permissions || [])
      .filter(p => PERM_TABS[p])
      .map(p => PERM_TABS[p]),
  ];

  const ActiveTab = tabs.find(t => t.key === tab)?.Component || ManagerDashboard;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <ActiveTab />
      <BottomNav tabs={tabs.map(t => t.key)} active={tab} onChange={setTab} />
    </div>
  );
}
