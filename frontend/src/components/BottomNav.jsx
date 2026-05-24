import { LayoutGrid, Cable, Users, UserCircle } from 'lucide-react';

export default function BottomNav({ activeScreen, setActiveScreen }) {
  const navItems = [
    { id: 'dash', icon: LayoutGrid, label: 'Dashboard' },
    { id: 'dispatch', icon: Cable, label: 'Handover' },
    { id: 'drivers', icon: Users, label: 'Drivers' },
    { id: 'profile', icon: UserCircle, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around z-50 md:hidden shadow-lg">
      {navItems.map((item) => (
        <button key={item.id} onClick={() => setActiveScreen(item.id)}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeScreen === item.id ? 'text-blue-600' : 'text-slate-400'}`}>
          <item.icon className="w-5 h-5" />
          {item.label}
        </button>
      ))}
    </nav>
  );
}