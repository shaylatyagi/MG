// src/components/BottomNav.jsx
// Supports two modes:
//   Router mode (driver): no active/onChange — uses NavLink based on current URL
//   State mode  (manager): active + onChange props — classic button switching
import { NavLink, useLocation } from 'react-router-dom';

const ICONS = {
  wallet: '💰', pay: '💳', kyc: '🪪', chat: '💬',
  dashboard: '📊', drivers: '🚗', collections: '📋',
};

const useBasePath = () => {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  return parts.length >= 1 ? `/${parts[0]}` : '';
};

export default function BottomNav({ tabs, active, onChange }) {
  const routerMode = !onChange; // no onChange → router mode
  const base = useBasePath();

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t flex z-50">
      {tabs.map((tab) => {
        if (routerMode) {
          return (
            <NavLink
              key={tab}
              to={`${base}/${tab}`}
              style={{ textDecoration: 'none' }}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-xs transition-colors
                 ${isActive ? 'text-amber-700 font-semibold' : 'text-gray-400'}`
              }>
              <span className="text-lg">{ICONS[tab] || '•'}</span>
              <span className="capitalize">{tab}</span>
            </NavLink>
          );
        }
        // State mode (manager app)
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors
              ${active === tab ? 'text-amber-700 font-semibold' : 'text-gray-400'}`}>
            <span className="text-lg">{ICONS[tab] || '•'}</span>
            <span className="capitalize">{tab}</span>
          </button>
        );
      })}
    </nav>
  );
}
