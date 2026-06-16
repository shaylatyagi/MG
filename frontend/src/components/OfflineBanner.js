// frontend/src/components/OfflineBanner.js
// Shows a sticky banner when the device loses internet connection.
// Briefly shows "Back online ✓" for 2s when reconnecting.
import { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const [status, setStatus] = useState(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online'
  );

  useEffect(() => {
    let timer;

    const goOffline = () => {
      clearTimeout(timer);
      setStatus('offline');
    };

    const goOnline = () => {
      setStatus('reconnected');
      timer = setTimeout(() => setStatus('online'), 2200);
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      clearTimeout(timer);
    };
  }, []);

  if (status === 'online') return null;

  const isOffline = status === 'offline';

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 99999,
      background: isOffline ? '#1e293b' : '#059669',
      color: '#fff',
      fontSize: 12,
      fontWeight: 700,
      textAlign: 'center',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      animation: 'slideDown 0.2s ease',
      letterSpacing: '0.01em',
    }}>
      <style>{`@keyframes slideDown{from{transform:translateY(-100%)}to{transform:translateY(0)}}`}</style>
      {isOffline ? (
        <>
          <span style={{ fontSize: 14 }}>⚡</span>
          No internet · changes won't save
        </>
      ) : (
        <>
          <span style={{ fontSize: 14 }}>✓</span>
          Back online
        </>
      )}
    </div>
  );
}
