// src/components/BottomNav.jsx
const ICONS = {
  wallet: '💰', pay: '💳', kyc: '🪪', chat: '💬',
  dashboard: '📊', drivers: '🚗', collections: '📋',
};

export default function BottomNav({ tabs, active, onChange }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t flex">
      {tabs.map(tab => (
        <button key={tab} onClick={() => onChange(tab)}
          className={`flex-1 flex flex-col items-center py-2 text-xs transition
            ${active === tab ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
          <span className="text-lg">{ICONS[tab] || '•'}</span>
          <span className="capitalize">{tab}</span>
        </button>
      ))}
    </nav>
  );
}
