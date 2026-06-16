// frontend/src/components/EmptyState.js
import React from 'react';

const ILLUSTRATIONS = {
  transactions: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="36" fill="#eef2ff"/>
      <rect x="22" y="28" width="36" height="26" rx="6" fill="#c7d2fe"/>
      <rect x="22" y="34" width="36" height="6" fill="#6366f1"/>
      <rect x="28" y="44" width="10" height="4" rx="2" fill="#a5b4fc"/>
      <rect x="42" y="44" width="10" height="4" rx="2" fill="#a5b4fc"/>
    </svg>
  ),
  drivers: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="36" fill="#f0fdf4"/>
      <circle cx="40" cy="32" r="10" fill="#86efac"/>
      <path d="M20 58c0-11 9-18 20-18s20 7 20 18" fill="#4ade80"/>
    </svg>
  ),
  vehicles: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="36" fill="#fef9c3"/>
      <rect x="18" y="36" width="44" height="16" rx="6" fill="#fde047"/>
      <rect x="24" y="28" width="32" height="14" rx="4" fill="#facc15"/>
      <circle cx="28" cy="54" r="5" fill="#78716c"/>
      <circle cx="52" cy="54" r="5" fill="#78716c"/>
    </svg>
  ),
  notifications: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="36" fill="#f0f9ff"/>
      <path d="M40 20c-8.8 0-16 7.2-16 16v8l-4 6h40l-4-6v-8c0-8.8-7.2-16-16-16z" fill="#bae6fd"/>
      <rect x="34" y="54" width="12" height="4" rx="2" fill="#7dd3fc"/>
    </svg>
  ),
  chat: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="36" fill="#fdf4ff"/>
      <rect x="18" y="24" width="34" height="22" rx="8" fill="#e9d5ff"/>
      <path d="M18 44l6 8v-8h-6z" fill="#e9d5ff"/>
      <rect x="28" y="46" width="34" height="18" rx="8" fill="#d8b4fe"/>
      <path d="M62 62l-6 6v-6h6z" fill="#d8b4fe"/>
    </svg>
  ),
  default: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="36" fill="#f8fafc"/>
      <circle cx="40" cy="34" r="12" fill="#e2e8f0"/>
      <path d="M22 58c0-9.9 8.1-16 18-16s18 6.1 18 16" fill="#e2e8f0"/>
    </svg>
  ),
};

export default function EmptyState({ type = 'default', title, subtitle, action, actionLabel }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 24px', textAlign: 'center',
    }}>
      <div style={{ marginBottom: 16, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.06))' }}>
        {ILLUSTRATIONS[type] || ILLUSTRATIONS.default}
      </div>
      <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
        {title || 'Nothing here yet'}
      </p>
      {subtitle && (
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 20px', lineHeight: 1.5, maxWidth: 240 }}>
          {subtitle}
        </p>
      )}
      {action && actionLabel && (
        <button onClick={action} style={{
          background: '#4f46e5', color: '#fff', border: 'none',
          borderRadius: 12, padding: '10px 24px',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
