// src/components/BottomNav.jsx
// Router mode (driver): uses NavLink based on URL
// State mode (manager): active + onChange props
import { NavLink, useLocation } from 'react-router-dom';

const LABELS = {
  wallet: 'Wallet', pay: 'Pay', kyc: 'KYC', chat: 'Chat',
  dashboard: 'Home', drivers: 'Drivers', collections: 'Ledger',
};

// Inline SVG icons — no dependency needed
const ICONS = {
  wallet: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#4f46e5' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  ),
  pay: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#4f46e5' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
  ),
  kyc: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#4f46e5' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  chat: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#4f46e5' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  dashboard: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#4f46e5' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  drivers: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#4f46e5' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  collections: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#4f46e5' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
};

const useBasePath = () => {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  return parts.length >= 1 ? `/${parts[0]}` : '';
};

const getNavClass = (active) => active
  ? 'bottom-nav__item bottom-nav__item--active'
  : 'bottom-nav__item';

const getButtonClass = (active) => active
  ? 'bottom-nav__button bottom-nav__button--active'
  : 'bottom-nav__button';

export default function BottomNav({ tabs, active, onChange }) {
  const routerMode = !onChange;
  const base = useBasePath();
  const { pathname } = useLocation();

  const isActive = (tab) => routerMode
    ? pathname.includes(`/${tab}`)
    : active === tab;

  if (routerMode) {
    return (
      <nav className="bottom-nav">
        {tabs.map((tab) => {
          const on = isActive(tab);
          return (
            <NavLink
              key={tab}
              to={`${base}/${tab}`}
              className={getNavClass(on)}
              aria-current={on ? 'page' : undefined}
            >
              {on && <span className="bottom-nav__indicator" />}
              {(ICONS[tab] || ICONS.wallet)(on)}
              <span className="bottom-nav__label">{LABELS[tab] || tab}</span>
            </NavLink>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const on = isActive(tab);
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={getButtonClass(on)}
          >
            {on && <span className="bottom-nav__indicator" />}
            {(ICONS[tab] || ICONS.wallet)(on)}
            <span className="bottom-nav__label">{LABELS[tab] || tab}</span>
          </button>
        );
      })}
    </nav>
  );
}
