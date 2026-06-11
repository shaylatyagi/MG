// src/pages/driver/DriverChatTab.jsx — COM-01
// Driver ↔ Owner in-app chat (polling every 8s)
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../api';

// Chat uses the global api instance (VITE_API_URL env var)

export default function DriverChatTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const bottomRef               = useRef(null);
  const pollRef                 = useRef(null);

  const getDriverId = () => {
    try {
      const token = localStorage.getItem('mg_token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || payload.sub || null;
    } catch { return null; }
  };

  const fetchMessages = useCallback(async () => {
    const driverId = getDriverId();
    if (!driverId) return;
    try {
      const res = await api.get(`/api/chat/messages`, { params: { driver_id: driverId, limit: 60 } });
      const data = res.data?.data ?? res.data;
      if (Array.isArray(data)) setMessages(data);
      setError('');
    } catch (e) {
      if (e.response?.status !== 401) setError('Could not load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 8000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    const driverId = getDriverId();
    if (!driverId) return;

    setSending(true);
    const optimistic = { id: Date.now(), sender_type: 'DRIVER', message: text, created_at: new Date().toISOString(), _pending: true };
    setMessages(prev => [...prev, optimistic]);
    setInput('');

    try {
      await api.post(`/api/chat/send`, { driver_id: driverId, message: text });
      await fetchMessages();
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setError('Failed to send. Try again.');
    } finally {
      setSending(false);
    }
  };

  const fmt = (ts) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#F8F9FA' }}>
      <div style={{ backgroundColor: '#4F46E5', padding: '16px', color: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <p style={{ margin: 0, fontWeight: '700', fontSize: '16px' }}>💬 Chat with Owner</p>
        <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.8 }}>Messages are private</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '80px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', marginTop: '40px', color: '#9CA3AF', fontSize: '14px' }}>Loading…</p>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <p style={{ fontSize: '32px' }}>💬</p>
            <p style={{ fontSize: '14px', color: '#9CA3AF' }}>No messages yet. Start a conversation!</p>
          </div>
        ) : messages.map((msg) => {
          const isMe = msg.sender_type === 'DRIVER';
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
              <div style={{ maxWidth: '72%', backgroundColor: isMe ? '#4F46E5' : 'white', color: isMe ? 'white' : '#1A1A1A', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', opacity: msg._pending ? 0.7 : 1 }}>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4' }}>{msg.message}</p>
                <p style={{ margin: '4px 0 0', fontSize: '10px', opacity: 0.65, textAlign: 'right' }}>{fmt(msg.created_at)}{msg._pending ? ' · Sending…' : ''}</p>
              </div>
            </div>
          );
        })}
        {error && <p style={{ textAlign: 'center', color: '#EF4444', fontSize: '12px', marginTop: '8px' }}>{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} style={{ position: 'fixed', bottom: '64px', left: 0, right: 0, backgroundColor: 'white', borderTop: '1px solid #E5E7EB', padding: '10px 12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message…"
          style={{ flex: 1, padding: '10px 14px', borderRadius: '24px', border: '1px solid #D1D5DB', fontSize: '14px', outline: 'none', backgroundColor: '#F9FAFB' }} />
        <button type="submit" disabled={!input.trim() || sending}
          style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', backgroundColor: input.trim() && !sending ? '#4F46E5' : '#D1D5DB', cursor: input.trim() && !sending ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px', color: 'white' }}>
          ➤
        </button>
      </form>
    </div>
  );
}
