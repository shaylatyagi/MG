// frontend/src/components/Toast.js
// Lightweight toast notification system — no dependencies
// Usage:
//   import { toast } from './Toast';
//   toast.success('Payment done!');
//   toast.error('Something went wrong');
//   toast.info('OTP sent to your email');
//   toast.warn('Please fill all fields');

import React, { useState, useEffect, useCallback } from 'react';

// ── Global event bus ──────────────────────────────────────────────────────────
const listeners = new Set();
let idCounter = 0;

export const toast = {
  _emit(type, message, duration = 3500) {
    const id = ++idCounter;
    listeners.forEach(fn => fn({ id, type, message, duration }));
    return id;
  },
  success: (msg, dur) => toast._emit('success', msg, dur),
  error:   (msg, dur) => toast._emit('error',   msg, dur || 4500),
  info:    (msg, dur) => toast._emit('info',    msg, dur),
  warn:    (msg, dur) => toast._emit('warn',    msg, dur),
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const ICONS = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  warn:    '⚠',
};

const COLORS = {
  success: { bg: '#059669', light: '#ecfdf5', text: '#065f46' },
  error:   { bg: '#dc2626', light: '#fef2f2', text: '#7f1d1d' },
  info:    { bg: '#4f46e5', light: '#eef2ff', text: '#1e1b4b' },
  warn:    { bg: '#d97706', light: '#fffbeb', text: '#78350f' },
};

// ── Single Toast Item ─────────────────────────────────────────────────────────
function ToastItem({ id, type, message, onRemove }) {
  const [visible, setVisible] = useState(false);
  const col = COLORS[type] || COLORS.info;

  useEffect(() => {
    // Animate in
    const t1 = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t1);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => onRemove(id), 320);
  }, [id, onRemove]);

  return (
    <div
      onClick={dismiss}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#fff',
        borderRadius: 14,
        padding: '12px 16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)',
        borderLeft: `4px solid ${col.bg}`,
        cursor: 'pointer',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.96)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.28s ease',
        maxWidth: 340,
        width: '90vw',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: col.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: 14, color: '#fff', fontWeight: 800,
      }}>
        {ICONS[type]}
      </div>
      <p style={{
        margin: 0, fontSize: 13, fontWeight: 600,
        color: '#0f172a', lineHeight: 1.4, flex: 1,
      }}>
        {message}
      </p>
    </div>
  );
}

// ── Toast Container ───────────────────────────────────────────────────────────
export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (t) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== t.id));
      }, t.duration);
    };
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(x => x.id !== id));
  }, []);

  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,   // above bottom nav
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem {...t} onRemove={remove} />
        </div>
      ))}
    </div>
  );
}
