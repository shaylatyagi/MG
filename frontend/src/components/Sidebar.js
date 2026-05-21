import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LanguageSelector from './LanguageSelect';

const ownerLinks = [
  { label: 'Earnings', path: '/owner/dashboard', icon: '💰' },
  { label: 'My Vehicles', path: '/owner/vehicles', icon: '🚗' },
  { label: 'Fleet Overview', path: '/owner/earnings', icon: '🏠' },
  { label: 'Compliance Vault', path: '/owner/compliance', icon: '📋' },
  { label: 'Fleet Settings', path: '/owner/settings', icon: '⚙️' },
];

const driverLinks = [
  { label: 'Dashboard', path: '/driver/dashboard', icon: '⚡' },
  { label: 'My Wallet', path: '/driver/wallet', icon: '💳' },
  { label: 'Vehicle Status', path: '/driver/vehicle', icon: '🚗' },
  { label: 'Trust Rewards', path: '/driver/rewards', icon: '🏆' },
  { label: 'Help & SOS', path: '/driver/help', icon: '🆘' },
  { label: 'My Profile', path: '/profile', icon: '👤' },
  { label: 'Charging Stations', path: '/driver/charging', icon: '⚡' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isOwner = location.pathname.startsWith('/owner');
  const links = isOwner ? ownerLinks : driverLinks;

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  };

  return (
    <div style={styles.sidebar}>
      <div style={styles.logo}>Mobility Grid</div>

      <div style={styles.toggle}>
        <button
          style={{ ...styles.toggleBtn, ...(isOwner ? styles.toggleActive : {}) }}
          onClick={() => navigate('/owner/dashboard')}
        >
          OWNER
        </button>
        <button
          style={{ ...styles.toggleBtn, ...(!isOwner ? styles.toggleActive : {}) }}
          onClick={() => navigate('/driver/dashboard')}
        >
          DRIVER
        </button>
      </div>

      <nav style={styles.nav}>
        {links.map((link) => (
          <div
            key={link.path}
            style={{
              ...styles.navItem,
              ...(location.pathname === link.path ? styles.navActive : {}),
            }}
            onClick={() => navigate(link.path)}
          >
            <span style={styles.icon}>{link.icon}</span>
            <span>{link.label}</span>
          </div>
        ))}
      </nav>
      
      <div style={{ marginBottom: '8px' }}>
        <LanguageSelector />
      </div>

      <div style={styles.profile}>
        <div style={styles.avatar}>
          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div>
          <p style={styles.profileName}>{user.name || 'User'}</p>
          <p style={styles.profileRole}>{isOwner ? 'Verified Owner' : 'Premium Driver'}</p>
        </div>
      </div>

      <button style={styles.logoutBtn} onClick={handleLogout}>
        Log Out
      </button>
    </div>
  );
}

const styles = {
  sidebar: {
    width: '220px',
    minHeight: '100vh',
    backgroundColor: 'var(--white)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    paddingBottom: '120px',
    position: 'fixed',
    top: 0,
    left: 0,
    overflowY: 'auto',
  },
  logo: {
    fontSize: '20px',
    fontWeight: '800',
    color: 'var(--bronze)',
    letterSpacing: '2px',
    marginBottom: '20px',
    paddingLeft: '8px',
  },
  toggle: {
    display: 'flex',
    backgroundColor: '#F3EDE5',
    borderRadius: '8px',
    padding: '3px',
    marginBottom: '24px',
  },
  toggleBtn: {
    flex: 1,
    padding: '6px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    letterSpacing: '0.5px',
    border: 'none',
    cursor: 'pointer'
  },
  toggleActive: {
    backgroundColor: 'var(--white)',
    color: 'var(--text-primary)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  navActive: {
    backgroundColor: '#F3EDE5',
    color: 'var(--bronze)',
    fontWeight: '600',
  },
  icon: {
    fontSize: '16px',
  },
  profile: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 8px',
    borderTop: '1px solid var(--border)',
    marginTop: '0px',
    marginBottom: '12px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--bronze)',
    color: 'var(--white)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    flexShrink: 0,
  },
  profileName: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  profileRole: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  logoutBtn: {
    marginTop: 'auto',
    padding: '10px',
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    border: '1px solid #FECACA',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
    transition: '0.2s',
    position: 'sticky',
    bottom: '20px',
  }
};